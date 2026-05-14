# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

# 安装生产环境依赖
COPY package*.json ./
RUN npm install --production

# 从编译阶段拷贝前端静态文件到 dist 目录
COPY --from=frontend-builder /app/dist ./dist
# 拷贝后端代码
COPY --from=frontend-builder /app/api ./api
# 拷贝其他必要配置文件（如 tsconfig.json 用于运行时编译或 nodemon 配置，如果后端需要）
COPY tsconfig.json ./

# 设置环境变量默认值
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动命令（这里假设直接运行后端 server）
# 注意：如果后端是 TS，生产环境通常建议预编译或使用 ts-node/tsx 运行
CMD ["npx", "tsx", "api/server.ts"]
