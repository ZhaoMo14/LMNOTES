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
from ..services.session_manager import (
    create_session, 
    get_session, 
    add_message, 
    get_conversation_history
)

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
    session_id: Optional[str] = None  # 可选的会话ID，用于追问

@router.post("/ask/", response_model=QAResponse)
async def ask_question(query: QAQuery):
    """
    接收用户问题，检索相关笔记，并使用 LLM 基于笔记内容生成答案。
    支持会话管理和追问功能。
    """
    user_question = query.question
    session_id = query.session_id
    print(f"收到问题: {user_question}, 会话ID: {session_id}")
    
    # 1. 会话管理：获取或创建会话
    if session_id:
        session = get_session(session_id)
        if session is None:
            print(f"会话 {session_id} 不存在或已过期，创建新会话")
            session = create_session()
            session_id = session.session_id
    else:
        print("创建新会话")
        session = create_session()
        session_id = session.session_id
    
    # 记录用户问题
    add_message(session_id, "user", user_question)
    
    # 2. 检索相关笔记
    search_limit = 100  # 设置一个较大的值，实际上不限制检索结果数量
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

    # 3. 处理检索结果和构建上下文
    if not sources:
        answer = "抱歉，在您的笔记中找不到与您问题相关的信息。"
        add_message(session_id, "assistant", answer)
        
        # 获取更新后的历史记录
        message_history = get_conversation_history(session_id)
        
        return QAResponse(
            answer=answer,
            sources=[],
            session_id=session_id,
            message_history=message_history
        )

    # 更智能地构建上下文，确保所有笔记都被包含
    max_context_length = 10000  # 增加上下文长度限制
    
    # 为每个笔记分配合理的空间
    notes_count = len(sources)
    if notes_count > 0:
        # 计算每个笔记可以分配的平均长度
        avg_length_per_note = max_context_length // notes_count
        # 确保每个笔记至少有200字符
        avg_length_per_note = max(200, avg_length_per_note)
        
        context_parts = []
        for i, s in enumerate(sources):
            title = s.metadata.get('title', 'N/A')
            description = s.metadata.get('description', 'N/A')
            similarity = f"{s.similarity:.3f}" if hasattr(s, 'similarity') else "N/A"
            
            # 如果笔记内容太长，截断描述
            if len(description) > avg_length_per_note - 100:  # 预留标题和ID的空间
                description = description[:avg_length_per_note - 100] + "..."
            
            note_context = f"笔记ID: {s.id}\n标题: {title}\n相似度: {similarity}\n描述: {description}"
            context_parts.append(note_context)
        
        context_string = "\n\n".join(context_parts)
        
        # 最终安全检查
        if len(context_string) > max_context_length:
            context_string = context_string[:max_context_length] + "..."
            print(f"上下文仍然过长，已截断至{max_context_length}字符")
        
        print(f"上下文包含了所有{notes_count}个笔记，总字符数：{len(context_string)}")
    else:
        context_string = ""

    # 4. 获取对话历史
    conversation_history = get_conversation_history(session_id)
    has_history = len(conversation_history) > 1  # 不仅仅包含当前问题
    
    # 5. 构建 Prompt
    prompt = f'''
请根据以下提供的上下文信息来回答用户的问题。

当用户询问特定主题相关的笔记或内容时：
1. 不要按笔记逐一罗列内容，而是将所有相关信息融合为一篇连贯、自然的文章
2. 根据主题自然组织内容，而不是按"笔记1"、"笔记2"这样的方式分类
3. 对内容进行适当的引申和分析，展示见解，而不仅仅是重复笔记中的事实
4. 确保内容之间有自然的过渡和连接，就像这些内容本来就是一篇整体文章
5. 可以加入自己的分析和观点，对信息进行整合和提炼
6. 使用生动、流畅的语言，体现出对主题的理解和思考

{"这是一个追问，请结合之前的对话历史来理解用户的意图。" if has_history else ""}

上下文：
---
{context_string}
---

用户问题：{user_question}

回答：
'''
    print("构建的 Prompt (为保护隐私，通常不打印完整上下文):")
    print(f"用户问题: {user_question}")
    print(f"是否有对话历史: {has_history}")

    # 6. 调用 LLM 生成答案
    try:
        print("正在调用 LLM API (无 max_tokens 限制)... 使用模型 deepseek-chat")
        
        # 构建消息列表
        messages = [
            {"role": "system", "content": "你是一个知识渊博、文笔出色的笔记助手。当用户询问某主题相关内容时，你不会简单地按笔记分类罗列信息，而是将所有检索到的相关内容融合为一篇连贯、自然的文章，就像这些内容本来就是一个整体。你擅长从多个来源整合信息，添加自己的见解，进行适当的引申和分析，使内容更加丰富和有价值。你的回答不会有明显的'笔记1'、'笔记2'这样的分段方式，而是通过自然的主题过渡和逻辑关联将内容连接起来。你的行文流畅自然，既有知识性，也有思考性。"}
        ]
        
        # 如果有对话历史，则添加历史消息
        if has_history:
            # 对于追问，我们需要提供前面的对话历史
            # 但排除最后一条用户消息，因为它会通过prompt传入
            for msg in conversation_history[:-1]:  
                messages.append(msg)
        
        # 添加当前提问
        messages.append({"role": "user", "content": prompt})
        
        completion = openai_client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            temperature=0.7 
        )
        generated_answer = completion.choices[0].message.content.strip()
        print(f"LLM 返回答案: {generated_answer}")
        
        # 记录助手回答
        add_message(session_id, "assistant", generated_answer)
        
    except Exception as e:
        print(f"调用 LLM API 时发生错误: {e}")
        generated_answer = f"抱歉，在调用 AI 模型生成答案时遇到错误: {str(e)}"

    # 7. 返回最终响应
    # 获取完整的消息历史
    message_history = get_conversation_history(session_id)
    
    return QAResponse(
        answer=generated_answer,
        sources=sources,
        session_id=session_id,
        message_history=message_history
    )

# --- RAG 功能结束 --- 