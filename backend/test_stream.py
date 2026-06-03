import os
from dotenv import load_dotenv
import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

async def main():
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", temperature=0.7)
        print("Starting stream...")
        async for chunk in llm.astream("Hello, say 'Test 123'"):
            print(f"CHUNK: {chunk.content}")
        print("Done streaming.")
    except Exception as e:
        print(f"ERROR: {e}")

asyncio.run(main())
