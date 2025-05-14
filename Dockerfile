# 使用官方 Python 镜像作为基础镜像
FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt requirements.txt

# 安装依赖
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目代码到工作目录
# 注意：只复制必要的代码，避免复制 .env, .git, .venv 等
COPY ./app /app/app
COPY ./main.py /app/main.py

# 暴露应用程序运行的端口 (与 CMD 中的端口一致)
EXPOSE 8080

# 定义容器启动时运行的命令
# 使用 uvicorn 启动 FastAPI 应用，监听所有接口
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"] 