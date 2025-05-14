# 基于大语言模型的智能在线笔记管理系统

这是一个使用 FastAPI 和 MongoDB 构建的智能在线笔记管理系统。它不仅提供基本的笔记创建、编辑、删除功能，还集成了先进的语义搜索和基于笔记内容的 RAG (Retrieval-Augmented Generation) 问答功能，帮助您更智能地管理和利用您的笔记信息。

## 主要功能 ✨

*   **📝 笔记管理 (CRUD):** 提供完整的笔记创建、读取、更新和删除功能。
*   **🧠 语义搜索:** 不仅仅是关键词匹配！您可以根据笔记内容的**意义**进行搜索，快速找到相关信息。
*   **💬 智能问答 (RAG):** 直接向您的笔记提问！系统会自动查找相关笔记，并利用大语言模型 (LLM) 基于这些笔记内容生成答案。
*   **📊 Markdown 支持:** 笔记内容支持完整的 Markdown 语法，包括标题、列表、代码块、表格等，并提供实时预览功能。
*   **🔄 参考来源导航:** 在问答界面查看 AI 回答的参考来源，可直接点击跳转到相关笔记并返回对话。
*   **🌓 明暗主题切换:** 支持明亮和暗黑两种主题模式，适应不同使用环境和个人偏好。
*   **📱 响应式设计:** 完美适配桌面和移动设备的界面布局，随时随地管理您的笔记。
*   **📤 文件导入:** 支持导入 Markdown 和 PDF 文件作为笔记。
*   **🌐 Web 界面:** 提供简洁直观的前端界面，方便用户操作。
*   **🐳 Docker 支持:** 提供 `docker-compose.yml` 文件，方便快速部署。

## 技术栈 🛠️

*   **后端:** FastAPI (Python)
*   **数据库:** MongoDB
*   **语义搜索:**
    *   向量数据库: Chroma DB
    *   嵌入模型: BGE 向量模型
*   **大语言模型 (LLM):** DeepSeek API (可配置)
*   **前端:** 
    *   框架: Vue.js 3
    *   样式: Bootstrap 5 + 自定义CSS
    *   Markdown: Marked.js
    *   代码高亮: Prism.js
*   **部署:** Docker

## 安装与部署 🚀

### 先决条件

*   Docker
*   Docker Compose

### 步骤

1.  **克隆仓库:**
    ```bash
    git clone <your-repository-url>
    cd notes-system
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
        third_party_api_key = os.getenv("DEEPSEEK_API_KEY") # 修改这里
        if not third_party_api_key:
            print("错误：请在 .env 文件中设置 DEEPSEEK_API_KEY")
            # 可以选择退出或抛出异常
        ```
        然后在 `.env` 文件中添加:
        ```
        DEEPSEEK_API_KEY=your_actual_deepseek_api_key
        ```
    *   根据需要配置其他环境变量，例如 MongoDB 连接信息。
    *   如果您需要使用代理访问 OpenAI 或 DeepSeek API，请确保在运行环境或 `.env` 文件中设置 `HTTPS_PROXY` 环境变量。

3.  **构建并运行 Docker 容器:**
    ```bash
    docker-compose up -d --build
    ```
    这将会在后台构建并启动 FastAPI 应用、MongoDB 服务以及 Chroma DB 服务。

4.  **访问应用:**
    打开浏览器，访问 `http://localhost:8000` (或 `docker-compose.yml` 中配置的其他端口)。

## 使用说明 📖

1.  **访问 Web 界面:** 通过浏览器访问部署后的地址。
2.  **创建笔记:** 
    * 点击侧边栏顶部的 + 按钮创建新笔记
    * 输入标题和内容（支持Markdown格式）
    * 点击"保存笔记"按钮保存
3.  **查看和编辑笔记:** 从侧边栏选择笔记进行查看和编辑。
4.  **使用Markdown:** 
    * 笔记内容支持完整的Markdown语法
    * 可以使用"实时预览"切换查看渲染效果
    * 支持的语法包括：标题(#)、加粗(**)、斜体(*)、链接、代码块(```)、列表等
5.  **搜索笔记:** 在顶部搜索框中输入内容，进行语义相关的搜索。
6.  **智能问答:** 
    * 在笔记编辑页面底部的"智能问答"区域输入问题
    * 系统会找到相关笔记并生成回答
    * 可以查看"参考来源"并点击跳转到相关笔记
    * 点击"返回问答"按钮回到之前的对话
7.  **文件导入:** 点击"导入文件"按钮，选择 Markdown 或 PDF 文件导入为笔记。
8.  **切换主题:** 点击右上角的太阳/月亮图标切换明暗主题。

## API 文档

应用启动后，可以在 `http://localhost:8000/docs` 访问自动生成的 FastAPI Swagger UI 文档，了解详细的 API 端点信息和请求/响应格式。

## 系统截图

### 笔记管理界面
![笔记管理界面](screenshots/notes_view.png)

### 智能问答界面
![智能问答界面](screenshots/qa_view.png)

### 移动设备视图
![移动设备视图](screenshots/mobile_view.png)

## 贡献指南

1. Fork 这个仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请查看 LICENSE 文件