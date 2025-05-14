from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class QASource(BaseModel):
    """用于生成答案的源笔记信息"""
    id: str
    metadata: Dict[str, Any] # 包含 title 和 description
    similarity: float

class Message(BaseModel):
    """对话消息模型"""
    role: str  # 'user' 或 'assistant'
    content: str
    timestamp: Optional[float] = None

class QAQuery(BaseModel):
    """问题查询模型"""
    question: str
    session_id: Optional[str] = None  # 会话ID，用于追问

class QAResponse(BaseModel):
    """QA 接口的响应模型"""
    answer: str
    sources: List[QASource]
    session_id: Optional[str] = None  # 返回会话ID
    message_history: Optional[List[Dict[str, str]]] = None  # 会话历史记录

class Session(BaseModel):
    """对话会话模型"""
    session_id: str
    messages: List[Message]
    created_at: float
    updated_at: float 