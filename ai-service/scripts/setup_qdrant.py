#!/usr/bin/env python3
"""
Setup Qdrant collection for SolShare.
Run once to initialize the vector database.
"""
import asyncio
import os
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import VectorParams, Distance, PayloadSchemaType


async def setup():
    url = os.environ.get("QDRANT_URL")
    api_key = os.environ.get("QDRANT_API_KEY")
    collection_name = os.environ.get("QDRANT_COLLECTION", "solshare_posts")

    if not url or not api_key:
        print("Error: QDRANT_URL and QDRANT_API_KEY required")
        return

    client = AsyncQdrantClient(url=url, api_key=api_key)

    collections = await client.get_collections()
    exists = any(c.name == collection_name for c in collections.collections)

    if exists:
        print(f"Collection '{collection_name}' already exists")
        return

    await client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
    )

    await client.create_payload_index(collection_name, "creator_wallet", PayloadSchemaType.KEYWORD)
    await client.create_payload_index(collection_name, "scene_type", PayloadSchemaType.KEYWORD)
    await client.create_payload_index(collection_name, "timestamp", PayloadSchemaType.INTEGER)

    print(f"Collection '{collection_name}' created with indexes")


if __name__ == "__main__":
    asyncio.run(setup())
