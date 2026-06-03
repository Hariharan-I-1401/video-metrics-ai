"""
VidioMetrics AI — RAG Chain Builder
Handles chunking, embedding, vector storage, and LangChain RAG chain construction.
"""
import uuid
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from operator import itemgetter


def build_vector_store(video_a_data: dict, video_b_data: dict) -> Chroma:
    """
    Chunk + embed transcripts and metadata for both videos.
    Store in ChromaDB vector store. Every chunk is tagged with video_id (A or B) and chunk_id.
    
    Args:
        video_a_data: Processed data dict for Video A (label, url, metadata, transcript)
        video_b_data: Processed data dict for Video B (label, url, metadata, transcript)
    
    Returns:
        Chroma vectorstore instance ready for retrieval
    """
    documents = []
    
    for video_data in [video_a_data, video_b_data]:
        video_label = video_data["label"]
        transcript_text = video_data["transcript"]
        video_metadata = video_data["metadata"]
        
        # Build a rich metadata summary so the LLM can answer metric questions from chunks
        hashtags_formatted = ", ".join(video_metadata.get('hashtags', [])) if video_metadata.get('hashtags') else "None found"
        duration_seconds = video_metadata.get('duration', 0)
        duration_formatted = f"{int(duration_seconds // 60)}m {int(duration_seconds % 60)}s" if duration_seconds else "Unknown"
        
        metadata_summary = (
            f"Video {video_label} Metadata:\n"
            f"Title: {video_metadata.get('title')}\n"
            f"Creator: {video_metadata.get('creator')} (Followers: {video_metadata.get('follower_count')})\n"
            f"Platform: {video_metadata.get('platform', 'unknown')}\n"
            f"Views: {video_metadata.get('views')}, Likes: {video_metadata.get('likes')}, Comments: {video_metadata.get('comments')}\n"
            f"Engagement Rate: {video_metadata.get('engagement_rate'):.2f}%\n"
            f"Upload Date: {video_metadata.get('upload_date')}\n"
            f"Duration: {duration_formatted}\n"
            f"Hashtags: {hashtags_formatted}\n\n"
        )
        
        full_content = metadata_summary + "Transcript:\n" + transcript_text
        
        # Chunk the combined metadata + transcript text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        text_chunks = text_splitter.split_text(full_content)
        
        for chunk_index, chunk_text in enumerate(text_chunks):
            document = Document(
                page_content=chunk_text,
                metadata={
                    "video_id": video_label,
                    "chunk_id": chunk_index,
                    "title": video_metadata.get("title", ""),
                    "url": video_data["url"]
                }
            )
            documents.append(document)
            
    # Embed using Google's Gemini embedding model
    embedding_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2")
    
    # Generate a unique collection name per session to guarantee no stale data
    session_collection_name = f"vidiometrics_{uuid.uuid4().hex[:12]}"
    
    # Store in ChromaDB (fresh in-memory collection per analysis)
    vectorstore = Chroma.from_documents(
        documents=documents,
        embedding=embedding_model,
        collection_name=session_collection_name
    )
    return vectorstore


def get_rag_chain(vectorstore: Chroma):
    """
    Build the LangChain RAG chain with conversation memory support.
    
    Uses:
        - Gemini 2.5 Flash Lite as the LLM (cost-efficient at scale)
        - ChromaDB retriever (k=15 chunks)
        - MessagesPlaceholder for multi-turn conversation history
    
    Args:
        vectorstore: Active Chroma vectorstore to retrieve from
    
    Returns:
        Runnable RAG chain that accepts {input, chat_history}
    """
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", temperature=0.7)
    
    system_prompt = (
        "You are an expert social media analyst. You are comparing two videos: Video A and Video B.\n"
        "Use the provided context to answer the user's question accurately.\n"
        "If the exact answer is not explicitly stated in the context, use your expert analytical skills to infer the reasons based on the transcripts, topics, and metadata provided. Deduce insights by comparing the two videos.\n"
        "If the user asks about metrics that are not publicly available (like viewer retention, audience demographics, or click-through rate), DO NOT just say you don't know. Explain briefly that these are private YouTube/Instagram Studio metrics, but then immediately provide a highly educated estimate or analysis based on the transcript's pacing, the opening hook, and the like-to-view ratio.\n"
        "CRITICAL INSTRUCTIONS:\n"
        "1. Always cite your sources by mentioning [Video A] or [Video B] at the end of the sentence.\n"
        "2. When citing, also include the chunk reference like [Video A, Chunk 3] so the user knows exactly which part of the transcript or metadata you are pulling from.\n"
        "3. DO NOT use any markdown formatting. No asterisks (**), no bolding, no bullet points. Output plain text paragraphs only.\n"
        "4. Remove any trademark or copyright symbols from the text.\n\n"
        "Context: {context}"
    )
    
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}")
    ])
    
    chunk_retriever = vectorstore.as_retriever(search_kwargs={"k": 15})
    
    def format_retrieved_chunks(retrieved_docs: list) -> str:
        """Format retrieved documents into labeled context string for the LLM."""
        formatted_chunks = []
        for doc in retrieved_docs:
            video_id = doc.metadata.get('video_id', 'Unknown')
            chunk_id = doc.metadata.get('chunk_id', 0)
            formatted_chunks.append(f"[Video {video_id}, Chunk {chunk_id + 1}]\n\"{doc.page_content.strip()}\"")
        return "\n\n".join(formatted_chunks)
        
    rag_chain = (
        {
            "context": itemgetter("input") | chunk_retriever | format_retrieved_chunks,
            "input": itemgetter("input"),
            "chat_history": itemgetter("chat_history")
        }
        | prompt_template
        | llm
        | StrOutputParser()
    )
    
    return rag_chain
