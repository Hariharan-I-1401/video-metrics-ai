# VidioMetrics AI

RAG-powered video comparison tool. Feed it two video URLs (YouTube or Instagram Reels), and it pulls transcripts, metadata, computes engagement metrics, chunks everything into a vector store, and lets you ask questions about both videos in a chat interface with streaming responses and source citations.

## Why This Stack

**ChromaDB over Pinecone/Weaviate** — For a single-session comparison tool, spinning up a managed vector DB adds latency and cost for zero benefit. Chroma runs in-memory, creates a fresh collection per analysis (UUID-namespaced), and gets garbage collected when the server restarts. At scale (1000 creators/day), I'd swap to Qdrant with persistent storage and session-based collection cleanup — still self-hosted, still cheap.

**Gemini Flash Lite over GPT-4o** — This is a cost decision. GPT-4o is ~$5/1M input tokens. Gemini 2.5 Flash Lite is significantly cheaper with comparable quality for analytical tasks. At 1000 creators/day × ~15 chunks per query × ~5 questions each, the token bill matters. Flash Lite handles the structured comparison prompts well enough that the quality tradeoff is worth it.

**Chunk size 1000 / overlap 200** — I tested with 500 and 2000. At 500, the retriever pulls too many fragments and the LLM loses context. At 2000, short videos only get 1-2 chunks and you lose granularity for timestamp-based questions ("compare the hooks in the first 5 seconds"). 1000/200 is the sweet spot for typical 30s-10min social videos.

**youtube-transcript-api over Whisper** — Free, instant, and handles 95%+ of YouTube videos. Whisper would cost compute and add 30-60s latency per video for transcription. The only case where Whisper wins is for videos without captions, which is rare on YouTube. For Instagram, I fall back to yt-dlp + AssemblyAI since IG doesn't expose transcripts.

**Server-side conversation memory over client-side** — The chat history lives in `conversation_history[]` on the backend, bounded to 20 messages. This means the RAG chain gets conversation context without the client needing to send the entire history on every request. Tradeoff: it's per-process, not per-user. For multi-user, I'd move this to Redis with session IDs.

## Architecture

```
frontend/ (Next.js + React)
├── src/app/page.tsx          # Single-page app: video cards, vector index, chat panel
├── src/app/globals.css       # Design system tokens
└── src/app/layout.tsx        # Root layout, fonts, metadata

backend/ (FastAPI + LangChain)
├── main.py                   # API endpoints: /api/process, /api/chat, /api/chunks
├── rag.py                    # Chunking, embedding, ChromaDB storage, RAG chain
├── services.py               # Video processing: yt-dlp metadata, transcript extraction
└── requirements.txt          # Python dependencies
```

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env with your keys
cp .env.example .env
# Edit .env → add GOOGLE_API_KEY (required) and ASSEMBLYAI_API_KEY (optional, for IG reels)

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Paste two video URLs and hit Analyze.

## What It Does

1. **Extracts metadata** — views, likes, comments, creator, followers, hashtags, upload date, duration via yt-dlp
2. **Pulls transcripts** — YouTube: `youtube-transcript-api` with timestamps. Instagram: yt-dlp audio → AssemblyAI, or caption fallback
3. **Computes engagement** — `(likes + comments) / views × 100`
4. **Chunks + embeds** — `RecursiveCharacterTextSplitter(1000, 200)` → `gemini-embedding-2` → ChromaDB. Every chunk tagged with `video_id` (A/B) and `chunk_id`
5. **RAG chat** — LangChain retriever (k=15) → Gemini Flash Lite → streamed via SSE. Citations like `[Video A, Chunk 3]` rendered inline. Conversation memory across turns (bounded to 20 messages)

## What Breaks at Scale

- **Concurrent users** — Global `active_vectorstore` means one analysis at a time. Fix: session-based stores keyed by user ID, backed by Redis for memory.
- **Instagram scraping** — yt-dlp + IG is flaky. IG actively blocks scrapers. For production, you'd need the Instagram Graph API with proper auth, or a proxy rotation service.
- **Embedding rate limits** — Google's embedding API has QPM limits. At 1000 creators/day, you'd want to batch embed with exponential backoff, or self-host an embedding model (BGE-base is good enough and free).
- **No persistence** — ChromaDB is in-memory. If the server crashes mid-analysis, everything is lost. For production: Qdrant with disk persistence, or pgvector if you already have Postgres.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 16 + React 19 | App router, server components, fast HMR |
| Backend | FastAPI | Async-native, auto-docs, Pydantic validation |
| Orchestration | LangChain | ChatPromptTemplate + MessagesPlaceholder + Retriever chain |
| Embeddings | Gemini Embedding 2 | Free tier, good quality, low latency |
| Vector DB | ChromaDB (in-memory) | Zero infra, fast for single-session use |
| LLM | Gemini 2.5 Flash Lite | Cost-efficient, streams well, handles structured prompts |
| Transcripts | youtube-transcript-api + AssemblyAI | Free for YT, AssemblyAI fallback for IG |
