## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        A["React 18 + Vite"] --> B["灵感气泡空间"]
        A --> C["认知上下文管理"]
        A --> D["PRD 输出中心"]
    end
    subgraph "状态管理层"
        F["Zustand 全局状态"] --> G["气泡数据 Store"]
        F --> I["快照数据 Store"]
        F --> J["PRD 文档 Store"]
        F --> K["AI 服务 Store"]
    end
    subgraph "可视化引擎层"
        N["Canvas API - 气泡画布"] --> O["拖拽与缩放"]
        N --> P["粒子与发光效果"]
        N --> Q["关联虚线渲染"]
    end
    subgraph "AI 服务层"
        R["ModelScope API - Kimi-K2.5"] --> S["气泡自动归类"]
        R --> T["标签智能推荐"]
        R --> U["关联性检测"]
        R --> V["PRD 流式生成"]
        W["OpenMemory MCP - 记忆服务"] --> X["用户偏好记忆"]
        W --> Y["上下文持久化"]
        W --> Z["对话历史管理"]
    end
    subgraph "数据持久化层"
        AA["localStorage"] --> AB["快照序列化"]
        AA --> AC["气泡数据"]
        AA --> AD["PRD 文档缓存"]
    end
    B --> F
    C --> F
    D --> F
    F --> N
    F --> R
    F --> W
    F --> AA
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript + Vite
- **初始化工具**：Vite (react-ts 模板)
- **样式方案**：Tailwind CSS@3 + CSS Modules（用于复杂动画）
- **状态管理**：Zustand（轻量、无 boilerplate）
- **画布渲染**：HTML5 Canvas API（气泡画布、粒子效果、关联虚线）
- **语音识别**：Web Speech API（浏览器原生语音转文字）
- **Markdown 渲染**：react-markdown + remark-gfm
- **PDF 导出**：html2canvas + jsPDF
- **动画库**：framer-motion（UI 过渡动画）
- **AI 大模型**：ModelScope API（moonshotai/Kimi-K2.5），OpenAI 兼容接口
- **AI 记忆服务**：ModelScope OpenMemory MCP（mem0ai），用于用户偏好与上下文记忆
- **后端**：Express@4（代理 AI 请求，避免前端暴露 API Key）
- **数据库**：无（使用 localStorage + 内存数据结构）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 首页/灵感气泡空间，默认入口 |
| `/context` | 认知上下文管理（快照与时间线） |
| `/prd` | PRD 输出中心（AI 生成、编辑与导出） |

## 4. API 定义

### 4.1 后端 API（Express 代理层）

后端作为 AI 服务的代理层，避免前端直接暴露 API Key。

#### 4.1.1 AI 对话接口

```typescript
POST /api/ai/chat

Request:
{
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stream?: boolean;
}

Response (stream=true):
Server-Sent Events, 每行格式:
data: { content: string; done: boolean }

Response (stream=false):
{
  content: string;
  usage: { prompt_tokens: number; completion_tokens: number };
}
```

#### 4.1.2 AI 归类接口

```typescript
POST /api/ai/categorize

Request:
{
  bubbles: Array<{ id: string; content: string; tag?: string }>;
  existingTags?: string[];
}

Response:
{
  categories: Array<{
    name: string;
    description: string;
    bubbleIds: string[];
    suggestedTag?: string;
    confidence: number;
  }>;
  suggestedTags: Array<{ name: string; color: string; reason: string }>;
  relations: Array<{
    sourceId: string;
    targetId: string;
    type: 'related' | 'contradictory' | 'duplicate';
    reason: string;
  }>;
}
```

#### 4.1.3 AI PRD 生成接口

```typescript
POST /api/ai/generate-prd

Request:
{
  bubbleIds: string[];
  template?: 'standard' | 'lean' | 'detailed';
  modules?: string[];
}

Response (stream):
Server-Sent Events, 每行格式:
data: { module: string; content: string; done: boolean }
```

#### 4.1.4 记忆服务接口（OpenMemory MCP 代理）

```typescript
POST /api/memory/add

Request:
{
  content: string;
  userId: string;
  metadata?: Record<string, string>;
}

Response:
{
  id: string;
  message: string;
}

GET /api/memory/search?query=xxx&userId=xxx&limit=10

Response:
{
  results: Array<{ id: string; content: string; score: number; metadata: Record<string, string> }>;
}

GET /api/memory/list?userId=xxx

Response:
{
  memories: Array<{ id: string; content: string; metadata: Record<string, string>; createdAt: string }>;
}
```

### 4.2 前端数据操作接口

- `bubbleStore`：气泡的增删改查、标签管理、位置更新、批量归类
- `snapshotStore`：快照的创建、恢复、删除、列表查询
- `prdStore`：PRD 文档的 AI 生成、编辑、模板管理、导出
- `aiStore`：AI 服务状态管理、流式响应处理、记忆查询

## 5. 服务端架构图

```mermaid
graph LR
    A["React 前端"] --> B["Express 代理服务器"]
    B --> C["/api/ai/chat"]
    B --> D["/api/ai/categorize"]
    B --> E["/api/ai/generate-prd"]
    B --> F["/api/memory/*"]
    C --> G["ModelScope API<br/>Kimi-K2.5"]
    D --> G
    E --> G
    F --> H["OpenMemory MCP<br/>记忆服务"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    BUBBLE {
        string id PK
        string content
        string tag
        string color
        string categoryId
        float x
        float y
        datetime createdAt
        datetime updatedAt
    }
    CATEGORY {
        string id PK
        string name
        string description
        string color
        float confidence
    }
    BUBBLE_RELATION {
        string id PK
        string sourceId FK
        string targetId FK
        string type
        string reason
    }
    PRD_MODULE {
        string id PK
        string type
        string title
        string content
        string[] bubbleIds
        int order
    }
    SNAPSHOT {
        string id PK
        string name
        string thumbnail
        datetime createdAt
        json canvasState
        json tagState
    }
    BUBBLE }o--o| CATEGORY : "归属于"
    BUBBLE ||--o{ BUBBLE_RELATION : "源气泡"
    BUBBLE ||--o{ BUBBLE_RELATION : "目标气泡"
    BUBBLE }o--o{ PRD_MODULE : "引用"
    SNAPSHOT }o--o{ BUBBLE : "包含"
```

### 6.2 数据定义语言

```typescript
interface Bubble {
  id: string;
  content: string;
  tag: string;
  color: string;
  categoryId: string;
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  confidence: number;
}

interface BubbleRelation {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'related' | 'contradictory' | 'duplicate';
  reason: string;
}

interface PrdModule {
  id: string;
  type: 'background' | 'user_story' | 'flowchart' | 'data_tracking' | 'requirement' | 'custom';
  title: string;
  content: string;
  bubbleIds: string[];
  order: number;
}

interface Snapshot {
  id: string;
  name: string;
  thumbnail: string;
  createdAt: string;
  canvasState: { bubbles: Bubble[]; viewport: { x: number; y: number; zoom: number } };
  tagState: { tags: string[]; categories: Category[] };
}
```
