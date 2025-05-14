import time
import uuid
import json
from typing import Dict, List, Optional
from ..models.qa import Session, Message

# 内存中的会话存储
# 实际应用中应该使用数据库持久化存储
sessions: Dict[str, Session] = {}

# 会话过期时间 (秒)
SESSION_TIMEOUT = 30 * 60  # 30分钟

def create_session() -> Session:
    """创建一个新的对话会话"""
    session_id = str(uuid.uuid4())
    current_time = time.time()
    
    session = Session(
        session_id=session_id,
        messages=[],
        created_at=current_time,
        updated_at=current_time
    )
    
    sessions[session_id] = session
    return session

def get_session(session_id: str) -> Optional[Session]:
    """获取指定的会话，如果会话不存在或已过期则返回None"""
    session = sessions.get(session_id)
    
    if session is None:
        return None
    
    # 检查会话是否过期
    if time.time() - session.updated_at > SESSION_TIMEOUT:
        # 会话已过期，删除
        del sessions[session_id]
        return None
    
    return session

def add_message(session_id: str, role: str, content: str) -> Optional[Session]:
    """向会话中添加消息"""
    session = get_session(session_id)
    
    if session is None:
        return None
    
    # 添加新消息
    message = Message(
        role=role,
        content=content,
        timestamp=time.time()
    )
    
    session.messages.append(message)
    session.updated_at = time.time()
    
    return session

def get_conversation_history(session_id: str, max_messages: int = 10) -> List[Dict[str, str]]:
    """获取会话历史记录，格式化为LLM API所需的格式"""
    session = get_session(session_id)
    
    if session is None or not session.messages:
        return []
    
    # 获取最近的消息
    recent_messages = session.messages[-max_messages:] if len(session.messages) > max_messages else session.messages
    
    # 转换为LLM API所需的格式
    formatted_messages = [
        {"role": msg.role, "content": msg.content}
        for msg in recent_messages
    ]
    
    return formatted_messages

def clear_expired_sessions():
    """清理过期的会话"""
    current_time = time.time()
    expired_sessions = [
        session_id for session_id, session in sessions.items()
        if current_time - session.updated_at > SESSION_TIMEOUT
    ]
    
    for session_id in expired_sessions:
        del sessions[session_id]
        
    return len(expired_sessions) 