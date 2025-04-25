import sys
from fastapi import APIRouter, Depends, HTTPException, Query
from ..models.note_model import NoteModel
from ..config.db import mongo_client
from ..schema.schemas import notesEntity, noteEntity
from ..services.semantic_search import (
    update_embedding_for_note, 
    remove_embedding_for_note,
    semantic_search,
    refresh_all_embeddings,
    get_embedding,
    compute_similarity,
    reinitialize_model
)
# 直接导入embeddings_cache
from ..services.semantic_search import embeddings_cache
from bson import ObjectId
router = APIRouter()

db = mongo_client.notes
notes_collection = db.notes

@router.get('/')
async def get_all_notes():
    notes = notesEntity(notes_collection.find())
    return {"status": "success", "notes": notes}

@router.get('/{note_id}')
async def get_one_note(note_id):
    note = noteEntity(notes_collection.find_one({"_id": ObjectId(note_id)}))
    return {'status': 'success', 'note': note}

@router.post('/')
async def create_note(request: NoteModel):
    # 插入到MongoDB
    result = notes_collection.insert_one(request.model_dump())
    note_id = result.inserted_id
    
    # 更新嵌入向量
    update_embedding_for_note(note_id, request.title, request.description)
    
    return {'status': 'success', "note": 'Note created successfully', "id": str(note_id)}

@router.put('/{note_id}') 
async def update_note(note_id, request: NoteModel):
    # 更新MongoDB
    notes_collection.update_one({"_id": ObjectId(note_id)}, {"$set": request.model_dump()})
    
    # 更新嵌入向量
    update_embedding_for_note(note_id, request.title, request.description)
    
    return {'status': 'success', 'note': 'Note updated successfully'}

@router.delete('/{note_id}')
async def delete_note(note_id):
    # 从MongoDB删除
    notes_collection.find_one_and_delete({"_id": ObjectId(note_id)})
    
    # 删除嵌入向量
    remove_embedding_for_note(note_id)
    
    return {'status': 'success', 'note': 'Note deleted successfully'}

@router.get('/search/semantic')
async def search_notes_semantic(
    q: str = Query(..., description="搜索查询文本"), 
    limit: int = Query(5, description="返回结果数量"),
    threshold: float = Query(0.3, description="相似度阈值，范围0-1，越高匹配越精确"),
    show_scores: bool = Query(False, description="是否在结果中显示相似度分数"),
    keyword_boost: float = Query(0.2, description="关键词匹配的额外权重，范围0-0.5")
):
    """
    语义搜索笔记
    
    - q: 搜索查询文本
    - limit: 最多返回的结果数量
    - threshold: 相似度阈值(0-1)，只返回相似度高于此值的结果，值越高要求匹配越精确
    - show_scores: 是否在结果中显示相似度分数
    - keyword_boost: 当笔记中包含完全匹配的查询关键词时，给予的额外相似度提升(0-0.5)
    """
    results = semantic_search(q, n_results=limit, threshold=threshold, include_scores=show_scores, keyword_boost=keyword_boost)
    return {"status": "success", "notes": results, "count": len(results)}

@router.post('/refresh-embeddings')
async def refresh_embeddings():
    """
    刷新所有笔记的嵌入向量
    """
    count = refresh_all_embeddings()
    return {"status": "success", "message": f"已刷新 {count} 个笔记的嵌入向量"}

@router.get('/debug/semantic')
async def debug_semantic_search(
    q: str = Query(..., description="搜索查询文本"),
    keyword_boost: float = Query(0.2, description="关键词匹配的额外权重，范围0-0.5")
):
    """
    调试语义搜索功能，显示所有笔记与查询的相似度
    """
    # 强制刷新嵌入向量缓存
    refresh_count = refresh_all_embeddings()
        
    # 获取查询文本的嵌入向量
    query_embedding = get_embedding(q)
    print(f"查询向量维度: {query_embedding.shape}")
    
    # 获取所有笔记
    all_notes = list(notes_collection.find())
    
    # 计算所有笔记与查询的相似度
    results = []
    for note in all_notes:
        note_id = str(note["_id"])
        title = note.get("title", "")
        description = note.get("description", "")
        full_text = f"{title} {description}"
        contains_keyword = q in full_text
        
        # 检查缓存中是否有此笔记
        if note_id in embeddings_cache:
            note_embedding = embeddings_cache[note_id]
            vector_shape = note_embedding.shape if hasattr(note_embedding, 'shape') else "未知"
            # 计算基础相似度
            base_similarity = float(compute_similarity(query_embedding, note_embedding))
            # 如果包含关键词，增加相似度
            final_similarity = base_similarity
            if contains_keyword:
                final_similarity = min(base_similarity + keyword_boost, 1.0)
            
            results.append({
                "id": note_id,
                "title": title,
                "description": description,
                "base_similarity": base_similarity,
                "contains_keyword": contains_keyword,
                "final_similarity": final_similarity,
                "in_cache": True,
                "vector_shape": str(vector_shape)
            })
        else:
            results.append({
                "id": note_id,
                "title": title,
                "description": description,
                "base_similarity": -1,
                "contains_keyword": contains_keyword,
                "final_similarity": -1,
                "in_cache": False,
                "vector_shape": "无向量"
            })
    
    # 按最终相似度降序排序
    results.sort(key=lambda x: x["final_similarity"], reverse=True)
    
    # 计算平均相似度
    valid_similarities = [r["final_similarity"] for r in results if r["final_similarity"] >= 0]
    avg_similarity = sum(valid_similarities) / len(valid_similarities) if valid_similarities else 0
    
    return {
        "status": "success", 
        "query": q,
        "query_vector_shape": str(query_embedding.shape),
        "notes": results,
        "count": len(results),
        "cache_size": len(embeddings_cache),
        "refresh_count": refresh_count,
        "keyword_boost_value": keyword_boost,
        "average_similarity": avg_similarity,
        "suggestion": "尝试使用阈值 " + str(round(avg_similarity, 2)) + " 来筛选结果"
    }

@router.post('/reset-model')
async def reset_model():
    """
    重置语义搜索模型，清空缓存并重新初始化模型
    """
    result = reinitialize_model()
    return {"status": "success", "message": result}

@router.post('/create-test-notes')
async def create_test_notes():
    """
    创建一些测试笔记数据
    """
    # 先删除所有现有笔记
    notes_collection.delete_many({})
    
    # 清空嵌入向量缓存
    global embeddings_cache
    embeddings_cache.clear()
    
    # 创建一批有明确语义的测试笔记
    test_notes = [
        {
            "title": "工作会议安排",
            "description": "下周一上午10点在会议室A举行项目进展讨论会，请各部门负责人准备好各自的进度报告和下阶段计划。会议预计持续2小时，请准时参加。"
        },
        {
            "title": "学习计划",
            "description": "这个月我计划学习Python高级编程技巧，包括异步编程、元类和装饰器等概念。同时还要完成FastAPI框架的深入学习，掌握依赖注入和中间件开发。"
        },
        {
            "title": "购物清单",
            "description": "需要购买的日用品：洗发水、沐浴露、牙膏、卫生纸。食材：鸡胸肉、西兰花、胡萝卜、洋葱、大蒜、橄榄油、意大利面。水果：苹果、香蕉、橙子。"
        },
        {
            "title": "旅行计划",
            "description": "暑假计划去云南旅行7天，主要景点包括大理、丽江和香格里拉。需要提前预订机票和酒店，准备好登山和摄影装备，查阅当地美食推荐。"
        },
        {
            "title": "健身记录",
            "description": "今天完成了30分钟的有氧运动和40分钟的力量训练。有氧部分包括跑步和跳绳，力量训练做了胸肌、背部和腿部的训练，共计8组动作。感觉良好，下周增加训练强度。"
        }
    ]
    
    # 添加到数据库
    result = notes_collection.insert_many([note for note in test_notes])
    inserted_ids = result.inserted_ids
    
    # 计算并保存嵌入向量
    for i, note_id in enumerate(inserted_ids):
        title = test_notes[i]["title"]
        description = test_notes[i]["description"]
        text_content = f"{title} {description}"
        
        try:
            # 直接计算并保存嵌入向量
            embedding = get_embedding(text_content)
            embeddings_cache[str(note_id)] = embedding
            print(f"已添加测试笔记到缓存: {title}")
        except Exception as e:
            print(f"处理笔记时出错: {e}")
    
    return {
        "status": "success", 
        "message": f"成功创建 {len(inserted_ids)} 条测试笔记",
        "ids": [str(id) for id in inserted_ids],
        "cache_size": len(embeddings_cache)
    }