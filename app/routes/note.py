from fastapi import APIRouter, HTTPException, status, Body, Query, Depends, Path
from typing import List, Optional, Dict, Any
from bson import ObjectId
from ..config.db import mongo_client
from ..schema.schemas import noteEntity, notesEntity
from ..services.semantic_search import add_to_search_index, remove_from_search_index, search_notes, debug_search

# 初始化路由器
router = APIRouter()

# 数据库与集合
db = mongo_client.notes
notes_collection = db.notes

# 路由定义
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_note(note: Dict[str, Any] = Body(...)):
    """创建新笔记"""
    # 处理并保存到MongoDB
    result = notes_collection.insert_one(note)
    note_id = str(result.inserted_id)
    
    # 添加到语义搜索索引
    try:
        add_to_search_index(
            id=note_id,
            title=note.get("title", ""),
            description=note.get("description", "")
        )
    except Exception as e:
        # 如果添加到索引失败，记录错误，但不阻止笔记创建
        print(f"Error adding to search index: {e}")
    
    # 获取并返回新创建的笔记
    created_note = notes_collection.find_one({"_id": result.inserted_id})
    return noteEntity(created_note)

@router.get("/", response_model=List[Dict[str, Any]])
async def get_notes():
    """获取所有笔记"""
    return notesEntity(notes_collection.find())

@router.get("/{id}")
async def get_note(id: str):
    """获取单个笔记"""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="无效的ID格式")
        
    note = notes_collection.find_one({"_id": ObjectId(id)})
    if note:
        return noteEntity(note)
    raise HTTPException(status_code=404, detail="笔记未找到")

@router.put("/{id}")
async def update_note(id: str, note: Dict[str, Any] = Body(...)):
    """更新笔记"""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="无效的ID格式")
    
    # 更新MongoDB中的笔记
    notes_collection.update_one({"_id": ObjectId(id)}, {"$set": note})
    
    # 更新语义搜索索引
    try:
        add_to_search_index(
            id=id,
            title=note.get("title", ""),
            description=note.get("description", "")
        )
    except Exception as e:
        print(f"Error updating search index: {e}")
    
    # 获取并返回更新后的笔记
    updated_note = notes_collection.find_one({"_id": ObjectId(id)})
    if updated_note:
        return noteEntity(updated_note)
    raise HTTPException(status_code=404, detail="笔记未找到")

@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: str):
    """删除笔记并同步删除向量索引"""
    # 先从主数据库删除
    delete_result = notes_collection.delete_one({"_id": ObjectId(note_id)})
    
    if delete_result.deleted_count == 1:
        # 如果主数据库删除成功，再尝试从搜索索引中删除
        try:
            remove_from_search_index(note_id)
        except Exception as e:
            # 记录从索引删除失败的错误，但仍然认为主删除成功
            print(f"主数据库删除成功，但从搜索索引删除笔记时出错: {str(e)}")
        # 即使索引删除失败，也返回成功 (状态码 204)
        return
    else:
        # 如果主数据库中没有找到笔记，则返回 404
        raise HTTPException(status_code=404, detail="Note not found")

@router.get("/search/", response_model=List[Dict[str, Any]])
async def search(
    q: str = Query(..., description="搜索查询"), 
    limit: int = Query(5, description="最大结果数量"),
    threshold: float = Query(0.3, description="相似度阈值"),
):
    """语义搜索笔记"""
    results = search_notes(
        query=q,
        limit=limit,
        threshold=threshold
    )
    return results

@router.get("/search/debug/", response_model=Dict[str, Any])
async def search_debug(
    q: str = Query(..., description="搜索查询"),
    limit: int = Query(20, description="最大结果数量"),
):
    """用于调试的语义搜索笔记"""
    results = debug_search(
        query=q,
        limit=limit
    )
    return results 