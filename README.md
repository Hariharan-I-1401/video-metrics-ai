# VideoMetrics AI

This is a tool that compares two videos. You can use it with YouTube or Instagram Reels. It looks at the words spoken in the videos the information about the videos and how people interact with them. It then lets you ask questions about the videos and gives you answers.

## Why I Chose This Stack

I chose ChromaDB over options because it is fast and does not cost extra for a simple comparison tool. I also chose Gemini Flash Lite because it is cheaper than options and works well for analyzing videos.

I decided to break the videos into chunks of 1000 characters with an overlap of 200 characters. This way the tool can understand the context of the videos. Give good answers to questions.

For getting the words spoken in the videos I used the youtube-transcript-api for YouTube videos. For Instagram videos I used yt-dlp and AssemblyAI.

I also decided to keep the conversation history on the server. This way the tool can remember what was said earlier and give answers.

## Architecture

The tool has two parts: the frontend and the backend.

```text
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

To set up the tool you need to follow these steps:

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
                                                                                                                                                     
Open  http://localhost:3000 . Paste two video URLs and hit Analyze. 

## Requirements

### Backend (Python 3.9+)                                                                                                                              
                                                                                                                                                         
* fastapi>=0.104.0                                                                                                                                    
* uvicorn>=0.24.0                                                                                                                                     
* python-dotenv>=1.0.0                                                                                                                                
* yt-dlp>=2024.1.0                                                                                                                                    
* youtube-transcript-api>=0.6.1                                                                                                                       
* langchain-text-splitters>=0.2.0                                                                                                                     
* langchain-google-genai>=2.0.0                                                                                                                       
* langchain-chroma>=0.2.0                                                                                                                             
* langchain-core>=0.3.0                                                                                                                               
* chromadb>=0.5.0                                                                                                                                     
* pydantic>=2.0.0                                                                                                                                     
* requests>=2.31.0                                                                                                                                    
                                                                                                                                                         
### Frontend (Node.js 18+)                                                                                                                             
                                                                                                                                                         
* next  (16.2.6)                                                                                                                                      
* react  &  react-dom  (19.2.4)                                                                                                                       
* framer-motion  (^12.40.0)                                                                                                                           
* lucide-react  (^1.17.0)                                                                                                                             
* sonner  (^2.0.7)                                                                                                                                    
* tailwindcss  (^4)            

## What Breaks at Scale

The tool has some limitations:

* It can only handle one analysis at a time.
* It may not work well with Instagram videos because Instagram blocks scrapers.
* It may reach the rate limit for embeddings.
* It does not store the analysis results

## Tech Stack

The tool uses the technologies:

* Frontend: Next.js and React
* Backend: FastAPI
* Orchestration: LangChain
* Embeddings: Gemini Embedding 2
* Vector DB: ChromaDB
* LLM: Gemini 2.5 Flash Lite
* Transcripts: youtube-transcript-api and AssemblyAI
