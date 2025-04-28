from fastapi import APIRouter, HTTPException, status, Body, Query, Depends, Path
from typing import List, Optional, Dict, Any
from bson import ObjectId
from ..config.db import mongo_client
from ..schema.schemas import noteEntity, notesEntity
from ..services.semantic_search import add_to_search_index, remove_from_search_index, search_notes, debug_search
from app.models.qa import QAResponse, QASource
import os
import httpx
from openai import OpenAI
from pydantic import BaseModel

# 初始化路由器
router = APIRouter()

# 数据库与集合
db = mongo_client.notes
notes_collection = db.notes

# --- OpenAI 客户端配置 ---

# 1. 配置第三方 API 信息
third_party_base_url = "https://api.deepseek.com/v1"  # DeepSeek API 地址
# 直接硬编码 API Key (注意安全风险)
third_party_api_key = "sk-08e9ecfa11b24864a2bc86031dcfec8f" 
print("警告：API Key 已硬编码在代码中！这存在安全风险，仅建议用于本地测试或非共享项目。")

# 2. 配置代理 (如果需要)
proxy_url = os.environ.get("HTTPS_PROXY") 

# 3. 初始化 OpenAI 客户端 
http_client_instance = None 
if proxy_url:
    print(f"检测到代理，正在配置 httpx 客户端使用代理: {proxy_url}")
    proxies = {"http://": proxy_url, "https://": proxy_url}
    http_client_instance = httpx.Client(proxies=proxies)
    print("代理配置完成")
else:
    print("未检测到代理")

print(f"正在配置 OpenAI 客户端指向第三方 API: {third_party_base_url}")
openai_client = OpenAI( 
    base_url=third_party_base_url,
    api_key=third_party_api_key, # 使用硬编码的 key
    http_client=http_client_instance 
)
print("OpenAI 客户端配置完成 (使用第三方 API)")
# --- OpenAI 客户端配置结束 ---

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
    if not ObjectId.is_valid(note_id):
        raise HTTPException(status_code=400, detail="无效的ID格式")
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

# --- 新增 RAG 功能 ---

# 定义接收问题的请求体模型
class QAQuery(BaseModel):
    question: str

@router.post("/ask/", response_model=QAResponse)
async def ask_question(query: QAQuery):
    """
    接收用户问题，检索相关笔记，并使用 LLM 基于笔记内容生成答案。
    """
    user_question = query.question
    print(f"收到问题: {user_question}")

    # 1. 检索相关笔记
    search_limit = 3
    search_threshold = 0.2
    try:
        print(f"正在搜索相关笔记 (limit={search_limit}, threshold={search_threshold})...")
        source_results_raw = search_notes(
            query=user_question, 
            limit=search_limit, 
            threshold=search_threshold
        )
        sources = [QASource(**item) for item in source_results_raw]  # 转换为模型
        print(f"找到 {len(sources)} 条相关笔记")
    except Exception as e:
        print(f"搜索笔记时发生错误: {e}")
        raise HTTPException(status_code=500, detail="检索相关笔记时出错")

    # 2. 处理检索结果和构建上下文
    if not sources:
        return QAResponse(
            answer="抱歉，在您的笔记中找不到与您问题相关的信息。",
            sources=[]
        )

    context_string = "\n\n".join([
        f"笔记ID: {s.id}\n标题: {s.metadata.get('title', 'N/A')}\n描述: {s.metadata.get('description', 'N/A')}" 
        for s in sources
    ])
    max_context_length = 3000
    if len(context_string) > max_context_length:
        context_string = context_string[:max_context_length] + "..."
        print("上下文过长，已截断")

    # 3. 构建 Prompt
    prompt = f'''
请根据以下提供的上下文信息来回答用户的问题。请只使用上下文中的信息，不要添加任何外部知识或自己的观点。
**请尽量简洁、清晰地回答问题，最好不要超过三段话。**
如果上下文不足以回答，请说"根据我所掌握的笔记信息，无法回答这个问题。"

上下文：
---
{context_string}
---

用户问题：{user_question}

回答：
'''
    print("构建的 Prompt (为保护隐私，通常不打印完整上下文):")
    print(f"用户问题: {user_question}")

    # 4. 调用 LLM 生成答案
    try:
        print("正在调用 LLM API (无 max_tokens 限制)... 使用模型 deepseek-chat")
        completion = openai_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "你是一个基于用户笔记内容回答问题的助手。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7 
        )
        generated_answer = completion.choices[0].message.content.strip()
        print(f"LLM 返回答案: {generated_answer}")
    except Exception as e:
        print(f"调用 LLM API 时发生错误: {e}")
        generated_answer = f"抱歉，在调用 AI 模型生成答案时遇到错误: {str(e)}"

    # 5. 返回最终响应
    return QAResponse(
        answer=generated_answer,
        sources=sources 
    )

# --- RAG 功能结束 --- 