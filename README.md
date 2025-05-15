# LMNOTES - 基于大语言模型的智能在线笔记管理系统

LMNOTES 是一个使用 FastAPI 和 MongoDB 构建的智能在线笔记管理系统。它不仅提供基本的笔记创建、编辑、删除功能，还集成了先进的语义搜索和基于笔记内容的 RAG (Retrieval-Augmented Generation) 问答功能，帮助您更智能地管理和利用您的笔记信息。

## 主要功能 ✨

*   **📝 笔记管理 (CRUD):** 提供完整的笔记创建、读取、更新和删除功能。
*   **🧠 语义搜索:** 不仅仅是关键词匹配！您可以根据笔记内容的**意义**进行搜索，快速找到相关信息。
*   **💬 智能问答 (RAG):** 直接向您的笔记提问！系统会自动查找相关笔记，并利用大语言模型 (LLM) 基于这些笔记内容生成答案。
*   **🌐 Web 界面:** 提供简洁直观的前端界面，方便用户操作。
*   **🐳 Docker 支持:** 提供 `docker-compose.yml` 文件，方便快速部署。

## 技术栈 🛠️

*   **后端:** FastAPI (Python)
*   **数据库:** MongoDB
*   **语义搜索:**
    *   向量数据库: Chroma DB (推测)
    *   嵌入模型: (需要根据 `app/services/semantic_search.py` 确认具体模型)
*   **大语言模型 (LLM):** DeepSeek API (可配置)
*   **前端:** HTML, CSS, JavaScript (位于 `static` 目录)
*   **部署:** Docker

## 安装与部署 🚀

### 先决条件

*   Docker
*   Docker Compose

### 步骤

1.  **克隆仓库:**
    ```bash
    git clone <your-repository-url>
    cd lmnotes
    ```

2.  **配置环境:**
    *   复制 `.env.example` (如果存在) 为 `.env` 文件。
    *   **重要:** 在 `app/routes/note.py` 文件中，`third_party_api_key` **直接硬编码了 DeepSeek API Key**。**强烈建议**将其修改为从环境变量 (`.env` 文件) 读取，以提高安全性。例如:
        ```python
        # 在 note.py 顶部附近
        from dotenv import load_dotenv
        import os
        load_dotenv()
        # ...
        # third_party_api_key = os.getenv("DEEPSEEK_API_KEY") # 修改这里
        # if not third_party_api_key:
        #     print("错误：请在 .env 文件中设置 DEEPSEEK_API_KEY")
        #     # 可以选择退出或抛出异常
        ```
        然后在 `.env` 文件中添加:
        ```
        DEEPSEEK_API_KEY=your_actual_deepseek_api_key
        ```
    *   根据需要配置其他环境变量，例如 MongoDB 连接信息 (如果 `docker-compose.yml` 中没有完全定义)。
    *   如果您需要使用代理访问 OpenAI 或 DeepSeek API，请确保在运行环境或 `.env` 文件中设置 `HTTPS_PROXY` 环境变量。

3.  **构建并运行 Docker 容器:**
    ```bash
    docker-compose up -d --build
    ```
    这将会在后台构建并启动 FastAPI 应用、MongoDB 服务以及可能的 Chroma DB 服务。

4.  **访问应用:**
    打开浏览器，访问 `http://localhost:8000` (或 `docker-compose.yml` 中配置的其他端口)。

## 使用说明 📖

1.  **访问 Web 界面:** 通过浏览器访问部署后的地址。
2.  **创建笔记:** 使用界面上的表单创建新的笔记，包含标题和描述。
3.  **查看和编辑笔记:** 浏览笔记列表，点击笔记进行查看和编辑。
4.  **搜索笔记:** 在搜索框中输入您想要查找的内容，系统将返回语义相关的笔记。
5.  **智能问答:** 在指定的问答区域输入您的问题，系统将基于您的笔记库进行回答。

## API 文档 接口

应用启动后，可以在 `http://localhost:8000/docs` 访问自动生成的 FastAPI Swagger UI 文档，了解详细的 API 端点信息和请求/响应格式。

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ZhaoMo14/LMNOTES)
