from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from app.routes.note import router as note_router
import os

load_dotenv()

app = FastAPI()

app.include_router(note_router, prefix='/api/v1/notes')

# 挂载 static 目录，用于提供 CSS, JS 等文件
# 确保 'static' 文件夹在项目根目录下
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)
    print(f"Created static directory at: {static_dir}")

app.mount("/static", StaticFiles(directory=static_dir), name="static")

# 提供主 HTML 页面
@app.get("/", include_in_schema=False)
async def read_index():
    index_path = os.path.join(static_dir, "index.html")
    if not os.path.exists(index_path):
        # 如果 index.html 不存在，可以返回一个简单的提示或创建它
        return {"message": "Frontend not found. Please create static/index.html"}
    return FileResponse(index_path)