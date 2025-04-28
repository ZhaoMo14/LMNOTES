from pydantic import BaseModel
from typing import List, Dict, Any

class QASource(BaseModel):
    """用于生成答案的源笔记信息"""
    id: str
    metadata: Dict[str, Any] # 包含 title 和 description
    similarity: float

class QAResponse(BaseModel):
    """QA 接口的响应模型"""
    answer: str
    sources: List[QASource] 