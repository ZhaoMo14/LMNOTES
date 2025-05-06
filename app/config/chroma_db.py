from pathlib import Path
import os
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions

# 初始化ChromaDB客户端 - 连接到Docker中的服务
print("正在连接到ChromaDB...")
chroma_client = chromadb.HttpClient(
    host="localhost",
    port=8000
)
print("ChromaDB连接已建立")

# 使用更准确的跨语言模型作为默认的嵌入函数
print("正在初始化嵌入模型...")
default_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="paraphrase-multilingual-mpnet-base-v2"
)
print("嵌入模型初始化完成")

def get_or_create_collection(collection_name="notes", embedding_function=None):
    """
    获取或创建一个ChromaDB集合
    
    Args:
        collection_name: 集合名称
        embedding_function: 嵌入函数，如果为None则使用默认嵌入函数
        
    Returns:
        chromadb Collection 对象
    """
    print(f"正在获取或创建集合: {collection_name}")
    ef = embedding_function or default_ef
    
    # 尝试获取已存在的集合
    try:
        # 无法在获取时更改距离度量，只能在创建时指定
        collection = chroma_client.get_collection(
            name=collection_name,
            embedding_function=ef
        )
        print(f"成功获取已存在的集合: {collection_name}")
        # 可以在这里检查集合的元数据确认距离度量，但通常不直接修改
        # print(f"集合元数据: {collection.metadata}")
    except Exception as e:
        print(f"获取集合失败，尝试创建新集合: {str(e)}")
        # 如果集合不存在，创建一个新的，并指定使用cosine距离
        collection = chroma_client.create_collection(
            name=collection_name,
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"} # 指定距离度量为cosine
        )
        print(f"成功创建新集合: {collection_name} (使用cosine距离)")
    
    return collection