## SnapNotes 📝

SnapNotes is a backend application built using Python, FastAPI, and MongoDB. It provides a simple and efficient way to manage notes, allowing users to create, update, delete, and fetch notes.

### Features ✅

- **Create:** Easily create new notes with a title and description.
- **Update:** Update existing notes to keep your information up-to-date.
- **Delete:** Remove unwanted notes from your collection.
- **Fetch:** Retrieve a specific note or view all notes.
- **语义搜索:** 通过自然语言查询语义相关的笔记内容.

### Tech Stack 🚀

- **FastAPI:** A modern, fast web framework for building APIs with Python.
- **MongoDB:** A NoSQL database for storing and retrieving notes efficiently.
- **Python:** The primary programming language used for the backend.
- **Sentence Transformers:** 用于生成文本嵌入向量的深度学习模型，支持语义搜索.

### 设置与运行 🛠️

1. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```

2. 确保 MongoDB 服务正在运行

3. 创建 `.env` 文件并配置：
   ```
   MONGO_URI=mongodb://localhost:27017/
   ```

4. 启动服务：
   ```bash
   uvicorn main:app --reload
   ```

5. 初始化嵌入向量（首次使用语义搜索功能时）：
   ```
   POST http://localhost:8000/api/v1/notes/refresh-embeddings
   ```

### API 使用 📊

#### 基本操作
- 获取所有笔记: `GET /api/v1/notes/`
- 获取单个笔记: `GET /api/v1/notes/{note_id}`
- 创建笔记: `POST /api/v1/notes/`
- 更新笔记: `PUT /api/v1/notes/{note_id}`
- 删除笔记: `DELETE /api/v1/notes/{note_id}`

#### 语义搜索
- 根据内容相似度搜索笔记: `GET /api/v1/notes/search/semantic?q=搜索关键词`
- 可选参数 `limit` 控制返回结果数量: `GET /api/v1/notes/search/semantic?q=搜索关键词&limit=10`
- 刷新所有笔记的嵌入向量: `POST /api/v1/notes/refresh-embeddings`

### 语义搜索示例 🔍

例如，你可以通过以下方式搜索与"工作计划"相关的笔记：
```
GET http://localhost:8000/api/v1/notes/search/semantic?q=工作计划
```

即使笔记中没有精确包含"工作计划"这个词，也能找到语义相关的内容，如"项目进度"、"任务安排"等。

### 实现细节

语义搜索使用内存中的嵌入向量缓存实现，不需要额外的向量数据库。系统会自动在创建、更新和删除笔记时更新嵌入向量缓存。如果需要手动刷新所有嵌入向量，可以调用 `/api/v1/notes/refresh-embeddings` 接口。
