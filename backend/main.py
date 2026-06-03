"""
VidioMetrics AI — Backend API Server
FastAPI application for processing social media videos and running RAG-based chat.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage
import asyncio
import json

from services import process_video
from rag import build_vector_store, get_rag_chain

load_dotenv()

app = FastAPI(
    title="VidioMetrics AI",
    description="RAG-powered social media video comparison API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Global State (session-backed in production)
# ──────────────────────────────────────────────
active_vectorstore = None
active_metadata = {}
conversation_history = []  # Server-side memory for multi-turn RAG chat


# ──────────────────────────────────────────────
# Request / Response Models
# ──────────────────────────────────────────────
class VideoProcessRequest(BaseModel):
    """Two video URLs to compare."""
    url_a: str
    url_b: str

class ChatMessageRequest(BaseModel):
    """A single chat message from the user."""
    message: str


# ──────────────────────────────────────────────
# Endpoint: Process Videos
# ──────────────────────────────────────────────
@app.post("/api/process")
async def process_videos(request: VideoProcessRequest):
    """
    Accept two video URLs, extract metadata + transcripts,
    chunk + embed them into ChromaDB, and return metadata.
    """
    global active_vectorstore, active_metadata, conversation_history
    
    try:
        conversation_history = []  # Reset for new analysis session
        
        # Explicitly destroy previous vector store to prevent stale data
        if active_vectorstore is not None:
            try:
                active_vectorstore.delete_collection()
            except Exception:
                pass
            active_vectorstore = None
        
        video_a_data = process_video(request.url_a, "A")
        video_b_data = process_video(request.url_b, "B")
        
        active_vectorstore = build_vector_store(video_a_data, video_b_data)
        
        active_metadata = {
            "A": video_a_data["metadata"],
            "B": video_b_data["metadata"]
        }
        
        return {"status": "success", "metadata": active_metadata}
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


# ──────────────────────────────────────────────
# Endpoint: Get All Vector Chunks
# ──────────────────────────────────────────────
@app.get("/api/chunks")
async def get_vector_chunks():
    """
    Return all embedded chunks from the active ChromaDB vector store.
    Used by the frontend Semantic Vector Index panel.
    """
    global active_vectorstore
    if not active_vectorstore:
        return {"chunks": []}
    
    try:
        collection = active_vectorstore.get()
        chunks = []
        for index in range(len(collection['ids'])):
            chunks.append({
                "id": collection['ids'][index],
                "text": collection['documents'][index],
                "metadata": collection['metadatas'][index]
            })
        return {"chunks": chunks}
    except Exception as error:
        print(f"Error fetching vector chunks: {error}")
        return {"chunks": []}


# ──────────────────────────────────────────────
# Endpoint: RAG Chat (Streaming + Memory)
# ──────────────────────────────────────────────
@app.post("/api/chat")
async def chat_with_assistant(request: ChatMessageRequest):
    """
    Stream a RAG-powered response via SSE.
    Cites sources (video + chunk), maintains conversation memory.
    """
    global active_vectorstore, conversation_history
    if not active_vectorstore:
        raise HTTPException(status_code=400, detail="Please process videos first")
        
    rag_chain = get_rag_chain(active_vectorstore)
    
    async def stream_response():
        global conversation_history
        try:
            # Retrieve relevant chunks to send as source citations
            retriever = active_vectorstore.as_retriever(search_kwargs={"k": 10})
            retrieved_docs = retriever.invoke(request.message)
            
            # Deduplicate retrieved chunks
            seen_content = set()
            source_citations = []
            for doc in retrieved_docs:
                video_id = doc.metadata.get('video_id', 'Unknown')
                chunk_id = doc.metadata.get('chunk_id', 0)
                content = doc.page_content.strip()
                content_key = content[:100]
                if content_key not in seen_content:
                    seen_content.add(content_key)
                    source_citations.append({
                        "video": video_id,
                        "chunk_id": chunk_id + 1,
                        "text": content
                    })
            
            # Ensure both Video A and B are represented in citations
            displayed_citations = source_citations[:4]
            represented_videos = set(citation['video'] for citation in displayed_citations)
            if len(represented_videos) == 1 and len(source_citations) > 4:
                missing_video = "B" if "A" in represented_videos else "A"
                for citation in source_citations[4:]:
                    if citation['video'] == missing_video:
                        displayed_citations.append(citation)
                        break
            
            while len(displayed_citations) < 5 and len(source_citations) > len(displayed_citations):
                displayed_citations.append(source_citations[len(displayed_citations)])
            
            # Send source citations to frontend first
            yield f"data: {json.dumps({'chunks': displayed_citations})}\n\n"

            # Build LangChain-compatible conversation history for multi-turn memory
            langchain_history = []
            for turn in conversation_history:
                if turn["role"] == "user":
                    langchain_history.append(HumanMessage(content=turn["content"]))
                else:
                    langchain_history.append(AIMessage(content=turn["content"]))

            # Stream the LLM response token-by-token
            full_response = ""
            async for token in rag_chain.astream({
                "input": request.message,
                "chat_history": langchain_history
            }):
                if token:
                    full_response += token
                    yield f"data: {json.dumps({'text': token})}\n\n"
            
            # Persist conversation turn for memory across turns
            conversation_history.append({"role": "user", "content": request.message})
            conversation_history.append({"role": "assistant", "content": full_response})
            
            # Keep memory bounded (last 20 messages = 10 exchanges)
            if len(conversation_history) > 20:
                conversation_history = conversation_history[-20:]

            yield "data: [DONE]\n\n"
        except Exception as error:
            yield f"data: {json.dumps({'error': str(error)})}\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
