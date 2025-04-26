from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sentence_transformers import SentenceTransformer
from app.config.chroma_db import get_or_create_collection

# 加载更准确的预训练模型
print("正在加载SentenceTransformer模型...")
model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')
print("SentenceTransformer模型加载完成")

def embed_text(text: str) -> List[float]:
    """
    将文本转换为向量嵌入
    
    Args:
        text: 要转换的文本字符串
    
    Returns:
        包含嵌入向量的列表
    """
    print(f"正在生成文本嵌入，文本长度: {len(text)}")
    embedding = model.encode(text)
    print(f"嵌入生成完成，向量维度: {len(embedding)}")
    return embedding.tolist()

def add_to_search_index(id: str, title: str, description: str) -> None:
    """
    将笔记添加到搜索索引中
    
    Args:
        id: 笔记ID
        title: 笔记标题
        description: 笔记描述
    """
    print(f"正在将笔记添加到搜索索引，ID: {id}")
    # 合并标题和描述以创建搜索文本
    search_text = f"{title} {description}"
    
    try:
        # 获取嵌入向量
        embedding = embed_text(search_text)
        print("成功生成文本嵌入")
        
        # 获取ChromaDB集合
        collection = get_or_create_collection()
        print("成功获取ChromaDB集合")
        
        # 添加到ChromaDB
        collection.add(
            ids=[id],
            embeddings=[embedding],
            metadatas=[{
                "title": title,
                "description": description
            }]
        )
        print(f"成功将笔记添加到ChromaDB，ID: {id}")
    except Exception as e:
        print(f"添加笔记到搜索索引时出错: {str(e)}")
        raise

def search_notes(query: str, limit: int = 5, threshold: float = 0.0) -> List[Dict[str, Any]]:
    """
    搜索笔记
    
    Args:
        query: 搜索查询
        limit: 返回结果的最大数量
        threshold: 相似度阈值
    
    Returns:
        匹配的笔记列表
    """
    print(f"正在搜索笔记，查询: {query}, 限制: {limit}, 阈值: {threshold}")
    try:
        # 获取查询文本的嵌入
        query_embedding = embed_text(query)
        print("成功生成查询文本嵌入")
        
        # 获取ChromaDB集合
        collection = get_or_create_collection()
        print("成功获取ChromaDB集合")
        
        # 执行搜索 (移除不支持的参数)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=limit
        )
        print(f"搜索完成，原始结果: {results}") 
        
        # 处理结果 (调整以适应新的结果结构)
        processed_results = []
        if results and results.get('ids') and results['ids'][0]:
            ids = results['ids'][0]
            metadatas = results.get('metadatas', [None] * len(ids))[0] 
            distances = results.get('distances', [None] * len(ids))[0] 
            
            for i in range(len(ids)):
                similarity = None
                if distances and distances[i] is not None:
                     similarity = 1 - distances[i]  # 将距离转换为相似度
                
                # 只有在相似度计算成功并且 (阈值为0 或 相似度大于等于阈值) 时才添加
                if similarity is not None and (threshold <= 0.0 or similarity >= threshold):
                    processed_results.append({
                        'id': ids[i],
                        'metadata': metadatas[i] if metadatas else None,
                        'similarity': similarity
                    })
            
            # 按相似度排序（如果需要）
            processed_results.sort(key=lambda x: x['similarity'], reverse=True)
            
        print(f"处理完成，返回 {len(processed_results)} 条结果")
        return processed_results
    except Exception as e:
        print(f"搜索笔记时出错: {str(e)}")
        return []

def remove_from_search_index(id: str) -> None:
    """
    从搜索索引中删除笔记
    
    Args:
        id: 要删除的笔记的唯一标识符
    """
    print(f"正在从搜索索引中删除笔记，ID: {id}")
    try:
        # 获取ChromaDB集合
        collection = get_or_create_collection()
        print("成功获取ChromaDB集合以进行删除")
        
        # 从ChromaDB删除
        collection.delete(ids=[id])
        print(f"成功从ChromaDB删除笔记，ID: {id}")
    except Exception as e:
        # 如果删除失败，记录错误，但通常我们希望即使向量删除失败，主数据库的删除也能成功
        # 因此这里只打印错误，不向上抛出，除非有特定需求
        print(f"从搜索索引删除笔记时出错: {str(e)}")

def debug_search(query: str, limit: int = 20) -> Dict[str, Any]:
    """
    调试搜索功能
    
    Args:
        query: 搜索查询
        limit: 返回结果的最大数量
    
    Returns:
        包含调试信息的字典
    """
    print(f"正在执行调试搜索，查询: {query}")
    try:
        results = search_notes(query, limit=limit, threshold=0.0)
        print(f"调试搜索完成，找到 {len(results)} 条结果")
        
        # 计算平均相似度
        if results:
            average_similarity = sum(r['similarity'] for r in results) / len(results)
        else:
            average_similarity = 0
            
        return {
            "query": query,
            "results": results,
            "average_similarity": average_similarity
        }
    except Exception as e:
        print(f"调试搜索时出错: {str(e)}")
        return {
            "query": query,
            "results": [],
            "average_similarity": 0,
            "error": str(e)
        } 