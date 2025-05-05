# LMNOTES 项目文档

## 1. 项目概述

LMNOTES 是一个基于语义搜索和生成式 AI 的智能笔记系统。它不仅提供传统的笔记管理功能（创建、读取、更新、删除），还集成了先进的语义搜索技术和检索增强生成（RAG）问答功能，使用户能够更有效地组织和利用自己的知识。

### 1.1 核心功能

- **笔记管理**：创建、查看、编辑和删除笔记
- **语义搜索**：基于语义相似度而非简单关键词匹配的搜索功能
- **智能问答（RAG）**：基于用户笔记内容回答用户问题的 AI 助手功能
- **简洁 Web 界面**：直观的前端界面，方便用户交互

### 1.2 技术特点

- 使用 **向量数据库** (ChromaDB) 存储笔记的语义表示
- 采用高质量的 **多语言嵌入模型** 进行文本向量化
- 实现 **向量索引与笔记内容的实时同步**
- 整合 **大型语言模型** 用于回答基于笔记内容的问题
- 完整的 **RESTful API** 接口设计

## 2. 系统架构

### 2.1 整体架构图

```
+------------------------------------------+
|                                          |
|             前端用户界面                  |
|    (HTML/CSS/JavaScript - 静态文件)      |
|                                          |
+--------------------+---------------------+
                    |
                    | HTTP 请求/响应
                    |
+--------------------v---------------------+
|                                          |
|               FastAPI 后端               |
|                                          |
|  +----------------+   +----------------+ |
|  |                |   |                | |
|  |  笔记管理模块   |   |  语义搜索模块   | |
|  |                |   |                | |
|  +----------------+   +----------------+ |
|                                          |
|  +----------------+                      |
|  |                |                      |
|  |  RAG 问答模块   |                      |
|  |                |                      |
|  +----------------+                      |
|                                          |
+--------------------+---------------------+
           |                  |
           |                  |
+----------v---------+  +-----v--------------+
|                    |  |                     |
|    MongoDB 数据库   |  |   ChromaDB 向量库   |
|    (笔记存储)       |  |   (语义索引)        |
|                    |  |                     |
+--------------------+  +---------------------+
           |                  |
           |                  |
           |                  |
+----------v------------------v--------------+
|                                            |
|        Sentence Transformers 模型          |
|        (文本嵌入向量化)                     |
|                                            |
+--------------------+---------------------+-+
                    |
                    |
                    |
+-------------------v----------------------+
|                                          |
|          第三方 LLM API 服务              |
|          (DeepSeek)                      |
|                                          |
+------------------------------------------+
```

### 2.2 模块说明

1. **前端用户界面**：基于 HTML/CSS/JavaScript 构建的静态页面，提供笔记管理、搜索和问答的用户交互功能。
2. **FastAPI 后端**：提供 RESTful API 接口，处理前端请求，包含三个核心模块：
   - 笔记管理模块：处理笔记的 CRUD 操作
   - 语义搜索模块：提供基于向量相似度的搜索功能
   - RAG 问答模块：集成检索和生成功能，回答用户问题
3. **数据存储**：
   - MongoDB：存储笔记的原始文本内容和元数据
   - ChromaDB：存储笔记的向量表示和元数据，支持相似度搜索
4. **核心技术组件**：
   - Sentence Transformers：将文本转换为向量表示
   - 第三方 LLM API：提供自然语言生成能力

## 3. 数据流程图

### 3.1 笔记创建流程

```
+-------------+       +-------------+       +-------------+       +-------------+
|             |       |             |       |             |       |             |
|   用户输入   +------>+  FastAPI    +------>+  MongoDB    |       |  ChromaDB   |
|   笔记内容   |       |  后端       |       |  存储笔记    |       |  向量库     |
|             |       |             |       |             |       |             |
+-------------+       +------+------+       +-------------+       +-------------+
                             |                                          ^
                             |                                          |
                             |                                          |
                      +------v------+                            +------+------+
                      |             |                            |             |
                      | 文本嵌入模型 +----------------------------> 存储向量表示 |
                      |             |                            |             |
                      +-------------+                            +-------------+
```

### 3.2 语义搜索流程

```
+-------------+       +-------------+       +-------------+       +-------------+
|             |       |             |       |             |       |             |
|   用户输入   +------>+  FastAPI    +------>+ 文本嵌入模型 +------>+  ChromaDB   |
|   搜索查询   |       |  后端       |       | (向量化查询) |       |  相似度搜索  |
|             |       |             |       |             |       |             |
+-------------+       +------+------+       +-------------+       +------+------+
                             |                                           |
                             |                                           |
                             |                                           |
                             |                                           |
                             |                                    +------v------+
                             |                                    |             |
                             |                                    | 返回相似文档 |
                             |                                    | 和相似度分数 |
                             |                                    |             |
                             |                                    +------+------+
                             |                                           |
                      +------v------+                                    |
                      |             |                                    |
                      |   返回搜索   <------------------------------------+
                      |   结果给用户 |
                      |             |
                      +-------------+
```

### 3.3 RAG 问答流程

```
+-------------+       +-------------+       +-------------+       +-------------+
|             |       |             |       |             |       |             |
|   用户提问   +------>+  FastAPI    +------>+ 文本嵌入模型 +------>+  ChromaDB   |
|             |       |  后端       |       | (向量化问题) |       |  相似度搜索  |
|             |       |             |       |             |       |             |
+-------------+       +------+------+       +-------------+       +------+------+
                             |                                           |
                             |                                           |
                             |                                           |
                             |                                    +------v------+
                             |                                    |             |
                             |                                    | 返回相关文档 |
                             |                                    |             |
                             |                                    +------+------+
                             |                                           |
                      +------v------+       +-------------+              |
                      |             |       |             |              |
                      |   构建提示   <-------+  相关文档    <--------------+
                      |   (Prompt)  |       |  上下文      |
                      |             |       |             |
                      +------+------+       +-------------+
                             |
                             |
                             |
                      +------v------+       +-------------+
                      |             |       |             |
                      |   调用 LLM   +------>+  生成回答    +----> 返回给用户
                      |   API       |       |             |
                      |             |       |             |
                      +-------------+       +-------------+
```

## 4. 实现细节

### 4.1 目录结构

```
LMNOTES/
├── .env                    # 环境变量配置
├── main.py                 # 应用入口点
├── requirements.txt        # 项目依赖
├── static/                 # 静态文件
│   ├── index.html          # 前端页面
│   └── script.js           # 前端 JavaScript
├── temp/                   # ChromaDB 临时数据目录
└── app/
    ├── config/
    │   ├── db.py           # MongoDB 配置
    │   └── chroma_db.py    # ChromaDB 配置
    ├── models/
    │   └── note.py         # 数据模型定义
    ├── routes/
    │   └── note.py         # API 路由定义
    ├── schema/
    │   └── schemas.py      # 数据模式定义
    └── services/
        ├── semantic_search.py  # 语义搜索服务
        └── note_service.py     # 笔记服务
```

### 4.2 技术栈详情

- **后端**：
  - FastAPI：高性能 Python Web 框架
  - PyMongo：MongoDB 的 Python 驱动
  - ChromaDB：轻量级向量数据库
  - Sentence Transformers：文本嵌入模型库
  - OpenAI 兼容 API 客户端：连接第三方 LLM 服务
  
- **前端**：
  - 原生 HTML/CSS/JavaScript：简洁的 MVP 前端实现
  
- **数据存储**：
  - MongoDB：存储笔记内容和元数据
  - ChromaDB：存储文本向量和支持相似度搜索

- **部署**：
  - Uvicorn：ASGI 服务器

### 4.3 核心技术实现

#### 4.3.1 语义搜索实现

语义搜索使用 Sentence Transformers 模型 `paraphrase-multilingual-mpnet-base-v2` 将文本转换为高维向量，并使用 ChromaDB 存储这些向量及其元数据。搜索时，通过计算查询向量与存储向量之间的余弦相似度，返回最相似的笔记。

```python
def search_notes(query: str, threshold: float = 0.2):
    # 1. 获取 ChromaDB 集合
    collection = get_or_create_collection()
    
    # 2. 使用嵌入模型将查询转换为向量
    query_embedding = get_embeddings([query])[0]
    
    # 3. 在向量库中搜索相似内容
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=10,
        include=["metadatas", "documents", "distances"]
    )
    
    # 4. 处理结果，根据相似度阈值过滤
    similar_notes = []
    for i in range(len(results["ids"][0])):
        distance = results["distances"][0][i]
        similarity = 1 - distance  # 转换为相似度分数
        
        if similarity >= threshold:
            metadata = results["metadatas"][0][i]
            similar_notes.append({
                "id": metadata["id"],
                "title": metadata["title"],
                "similarity": similarity
            })
    
    return similar_notes
```

#### 4.3.2 检索增强生成 (RAG) 实现

RAG 功能结合了检索和生成两个步骤：首先检索与用户问题相关的笔记内容作为上下文，然后将这些上下文与用户问题一起发送给 LLM，生成基于上下文的回答。

```python
async def ask_question(question: QAQuery):
    user_question = question.question
    
    # 1. 检索相关笔记作为上下文
    similar_notes = search_notes(user_question, threshold=0.15)
    if not similar_notes:
        return {"answer": "没有找到相关的笔记内容来回答您的问题。", "sources": []}
    
    # 2. 获取完整笔记内容并构建上下文
    context_notes = []
    for note in similar_notes:
        full_note = notes_collection.find_one({"_id": ObjectId(note["id"])})
        if full_note:
            context_notes.append({
                "title": full_note["title"],
                "content": full_note["description"],
                "similarity": note["similarity"]
            })
    
    context_string = "\n\n".join([
        f"标题: {note['title']}\n内容: {note['content']}"
        for note in context_notes
    ])
    
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
    
    # 4. 调用 LLM 生成答案
    try:
        completion = openai_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "你是一个基于用户笔记内容回答问题的助手。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        generated_answer = completion.choices[0].message.content.strip()
    except Exception as e:
        generated_answer = f"抱歉，在调用 AI 模型生成答案时遇到错误: {str(e)}"
    
    # 5. 返回答案和来源
    return {
        "answer": generated_answer,
        "sources": context_notes
    }
```

#### 4.3.3 向量同步机制

LMNOTES 实现了笔记更新与向量索引同步的机制，确保当笔记内容变更时，对应的向量表示也会更新。这是通过使用 ChromaDB 的 `upsert` 操作实现的，它可以根据 ID 更新或插入文档。

```python
def add_to_search_index(note_id, title, description):
    # 获取 ChromaDB 集合
    collection = get_or_create_collection()
    
    # 使用文本嵌入模型生成向量
    text_to_embed = f"{title}: {description}"
    embedding = get_embeddings([text_to_embed])[0]
    
    # 使用 upsert 方法添加或更新文档
    collection.upsert(
        ids=[str(note_id)],
        embeddings=[embedding],
        metadatas=[{"id": str(note_id), "title": title}],
        documents=[text_to_embed]
    )
```

### 4.4 API 接口说明

#### 4.4.1 笔记管理 API

| 端点 | 方法 | 描述 | 参数 |
|------|------|------|------|
| `/api/v1/notes/` | GET | 获取所有笔记 | 无 |
| `/api/v1/notes/{id}` | GET | 获取指定 ID 的笔记 | `id`：笔记 ID |
| `/api/v1/notes/` | POST | 创建新笔记 | `title`：标题，`description`：内容 |
| `/api/v1/notes/{id}` | PUT | 更新指定 ID 的笔记 | `id`：笔记 ID，`title`：新标题，`description`：新内容 |
| `/api/v1/notes/{id}` | DELETE | 删除指定 ID 的笔记 | `id`：笔记 ID |

#### 4.4.2 语义搜索 API

| 端点 | 方法 | 描述 | 参数 |
|------|------|------|------|
| `/api/v1/notes/search/` | GET | 语义搜索笔记 | `query`：搜索查询，`threshold`：相似度阈值（可选，默认 0.2） |

#### 4.4.3 RAG 问答 API

| 端点 | 方法 | 描述 | 参数 |
|------|------|------|------|
| `/api/v1/notes/ask/` | POST | 基于笔记内容回答问题 | `question`：用户问题 |

## 5. 部署和使用指南

### 5.1 环境要求

- Python 3.8 或更高版本
- MongoDB 实例
- 用于 LLM API 的访问令牌

### 5.2 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/yourusername/LMNOTES.git
cd LMNOTES
```

2. 安装依赖
```bash
pip install -r requirements.txt
```

3. 配置环境变量（可选：创建 `.env` 文件）
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=lmnotes
COLLECTION_NAME=notes
API_BASE_URL=https://api.deepseek.com
THIRD_PARTY_API_KEY=your_api_key_here
```

4. 运行应用
```bash
uvicorn main:app --reload --port 8080
```

5. 访问应用
   - 前端界面：打开浏览器访问 `http://localhost:8080`
   - API 文档：打开浏览器访问 `http://localhost:8080/docs`

### 5.3 使用方法

1. **管理笔记**
   - 使用前端界面的"创建/编辑笔记"区域添加新笔记
   - 点击笔记列表中的笔记标题加载并编辑
   - 修改完成后点击"保存笔记"按钮
   - 清除表单后可以创建新笔记

2. **搜索笔记**
   - 在"语义搜索"区域输入查询文本
   - 点击"搜索"按钮或按 Enter 键
   - 查看搜索结果列表，包含相似度分数

3. **智能问答**
   - 在"智能问答"区域输入问题
   - 点击"提问"按钮
   - 查看生成的回答和用于生成答案的笔记来源

## 6. 项目特点和创新点

### 6.1 技术亮点

1. **语义检索**：不依赖精确关键词匹配，可以找到语义相关的内容，即使用词不同
2. **多语言支持**：使用多语言嵌入模型，支持跨语言搜索和问答
3. **实时索引同步**：当笔记更新时，向量索引自动同步，确保搜索结果反映最新内容
4. **混合型架构**：结合传统数据库和向量数据库，兼顾性能和功能性
5. **检索增强生成**：通过先检索后生成的方式，确保 AI 回答基于用户自己的笔记内容

### 6.2 应用价值

1. **个人知识管理**：帮助用户更有效地组织和检索个人知识
2. **智能信息提取**：从大量笔记中快速找到相关信息并提炼答案
3. **学习辅助**：支持基于个人笔记内容的问答，促进知识内化
4. **可扩展平台**：基础架构支持未来扩展更多功能，如多模态内容、协作功能等

## 7. 未来展望

1. **多模态支持**：扩展到支持图片、音频等多模态内容
2. **笔记组织功能**：添加标签、分类、链接等组织功能
3. **用户认证**：添加多用户支持和权限管理
4. **协作功能**：支持多用户共享和协作编辑笔记
5. **本地 LLM 集成**：集成开源 LLM，减少对第三方 API 的依赖
6. **智能推荐**：基于用户行为自动推荐相关笔记
7. **离线支持**：添加 PWA 功能，支持离线使用
8. **移动端适配**：优化移动设备的使用体验

---

文档由 LMNOTES 团队创建和维护。
最后更新日期：2023 年 6 月 10 日 