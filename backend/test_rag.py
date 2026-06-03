import sys, os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.getcwd())
from rag import build_vector_store, get_rag_chain
import asyncio

async def test():
    v1 = {'label': 'A', 'metadata': {'title': 'Test', 'views': 100}, 'transcript': 'Hello A', 'url': 'http://a'}
    v2 = {'label': 'B', 'metadata': {'title': 'Test B', 'views': 200}, 'transcript': 'Hello B', 'url': 'http://b'}
    print('Building...')
    vs = build_vector_store(v1, v2)
    print('Built')
    chain = get_rag_chain(vs)
    print('Streaming...')
    async for c in chain.astream({'input': 'hello'}):
        print(c)

asyncio.run(test())
