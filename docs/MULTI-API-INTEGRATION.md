# 多 API 接口集成文档

## 概述

AetheL 支持多个 AI 服务提供商，通过统一的接口设计实现灵活切换。目前支持的 AI 服务商：

| 服务商 | 模型 | API 地址 |
|--------|------|----------|
| Moonshot (Kimi) | kimi-k2.6 | https://api.moonshot.cn/v1 |
| DeepSeek | deepseek-v4-pro / deepseek-v4-flash | https://api.deepseek.com |
| ModelScope | moonshotai/Kimi-K2.5 | https://api-inference.modelscope.cn/v1 |

## 架构设计

### 1. 前端状态管理 (`src/stores/settingsStore.ts`)

```typescript
export type AIProvider = 'modelscope' | 'deepseek' | 'moonshot'

interface SettingsState {
  aiProvider: AIProvider
  modelScopeApiKey: string
  deepSeekApiKey: string
  moonshotApiKey: string
  currentModel: string
  setAiProvider: (provider: AIProvider) => void
  // ...
}
```

特点：
- 使用 Zustand 进行状态管理
- 支持 `persist` 中间件，配置保存在浏览器本地存储
- 每个服务商独立存储 API Key
- 切换服务商时自动切换默认模型

### 2. 后端路由 (`api/routes/ai.ts`)

```typescript
type AIProvider = 'modelscope' | 'deepseek' | 'moonshot'

interface AIConfig {
  provider: AIProvider
  baseURL: string
  apiKey: string
  model: string
}

function getAIConfigFromEnv(): AIConfig {
  // 根据环境变量加载配置
}
```

### 3. 动态配置更新

前端可通过 API 动态更新后端配置，无需重启服务：

```typescript
// POST /api/ai/config
{
  provider: 'moonshot',
  apiKey: 'your_api_key',
  model: 'kimi-k2.6'
}
```

## 环境变量配置

在 `.env` 文件中配置：

```env
# ModelScope
MODELSCOPE_API_KEY=your_modelscope_key

# DeepSeek
DEEPSEEK_API_KEY=your_deepseek_key

# Moonshot (Kimi)
MOONSHOT_API_KEY=your_moonshot_key

# 当前使用的服务商
# 如果省略，后端会按已配置 Key 自动选择：modelscope -> deepseek -> moonshot
AI_PROVIDER=modelscope

# API 服务端口
PORT=3000
```

## 前端设置中心

访问 `/settings?section=ai`，或通过主导航右侧圆形 `...` 更多入口进入「设置」，再切换到「AI 引擎」分区：

1. **选择服务商** - 支持 Moonshot / DeepSeek / ModelScope
2. **输入 API Key** - 对应服务商的密钥
3. **选择模型** - 可手动输入或使用默认模型
4. **保存配置** - 将浏览器侧配置写入后端运行态
5. **测试连接** - 验证当前后端运行态是否可用

Logo 点击用于回到「灵感气泡」主工作区，不再作为隐藏设置入口。设置中心还预留了「数据与存储」「外观与性能」「活动记录」「帮助」「反馈」「关于」等分区，用于承载系统级辅助能力。

## 添加新的 AI 服务商

### 步骤 1: 更新前端状态管理

在 `src/stores/settingsStore.ts` 中：

```typescript
// 添加新的提供商类型
export type AIProvider = 'modelscope' | 'deepseek' | 'moonshot' | 'newprovider'

// 添加默认配置
const defaultModels: Record<AIProvider, string> = {
  // ...
  newprovider: 'new-model-name',
}

const defaultBaseUrls: Record<AIProvider, string> = {
  // ...
  newprovider: 'https://api.newprovider.com/v1',
}
```

### 步骤 2: 更新后端路由

在 `api/routes/ai.ts` 中：

```typescript
// 在 getAIConfigFromEnv 中添加
const configs: Record<AIProvider, AIConfig> = {
  // ...
  newprovider: {
    provider: 'newprovider',
    baseURL: 'https://api.newprovider.com/v1',
    apiKey: process.env.NEWPROVIDER_API_KEY || '',
    model: 'new-model-name',
  },
}

// 在 /config 路由的 providers 映射中添加
const providers: Record<string, { baseURL: string; defaultModel: string }> = {
  // ...
  newprovider: { baseURL: 'https://api.newprovider.com/v1', defaultModel: 'new-model-name' },
}
```

### 步骤 3: 更新前端设置页面

在 `src/pages/Settings.tsx` 中：

```typescript
// 添加新的提供商选项
const providers = [
  // ...
  {
    id: 'newprovider',
    name: 'New Provider',
    description: 'new-model-name',
  },
]
```

### 步骤 4: 更新环境变量示例

在 `.env.example` 中添加：

```env
NEWPROVIDER_API_KEY=your_newprovider_key
```

## API 接口列表

| 路径 | 方法 | 描述 |
|------|------|------|
| `/api/ai/chat` | POST | 通用对话接口 |
| `/api/ai/config` | GET | 获取当前 AI 配置 |
| `/api/ai/config` | POST | 更新 AI 配置 |
| `/api/ai/categorize` | POST | AI 气泡归类 |
| `/api/ai/workshop-skill` | POST | 创意工坊 Skill |
| `/api/ai/generate-prd` | POST | 生成 PRD |
| `/api/ai/generate-prd-sections` | POST | 生成 PRD 章节 |
| `/api/ai/snapshot` | POST | 创建语义快照 |
| `/api/ai/followup` | POST | AI 追问 |

## AI Task Profile

后端会按任务选择不同 profile，而不是让所有接口共享同一套 completion 参数：

| Profile | 主要接口 | 策略 |
|---------|----------|------|
| `fast-json` | `/api/ai/categorize`、`/api/ai/followup` | 短输出、低延迟、JSON schema 归一化，适合小型结构化结果。 |
| `section-draft` | `/api/ai/generate-prd-sections` | 中等长度输出，支持 PRD section 分组并行。 |
| `long-document` | `/api/ai/generate-prd` | 长文档质量优先，不走短 JSON 输出预算。 |
| `snapshot-large` | `/api/ai/snapshot` | 认知快照统一使用该 profile，输出预算为 6000 tokens，关闭 AI response cache，并对 JSON 完整性做 schema 校验。 |
| `workshop-transform` | `/api/ai/workshop-skill` | 创意工坊输入变换，优先保持候选气泡结构稳定。 |

认知快照不要回退到 `fast-json`。即使气泡数量不大，快照也需要输出 summary、level、anchors、questions、nextActions 等完整字段；短 token 预算会导致 JSON 截断，表现为第一次生成正常、第二次或较长输入无法形成可用快照。

`/api/ai/snapshot` 的 provider 调用禁用响应缓存。快照代表一次新的认知压缩结果，缓存复用会带来陈旧内容，尤其在气泡内容、标签、追问、分类、关系和权重变化之后。

## 故障排除

### 1. API Key 无效
- 检查 `.env` 文件中的 API Key 是否正确
- 确认 API Key 已在对应服务商平台创建

### 2. 模型不支持
- 检查模型名称是否拼写正确
- 确认服务商支持该模型

### 3. 连接超时
- 检查网络连接
- 确认 API 地址可访问

### 4. 前端配置未生效
- 确保后端服务已重启
- 检查浏览器控制台是否有错误

### 5. 认知快照 JSON 截断或连续生成失败
- 确认 `/api/ai/snapshot` 使用 `snapshot-large` profile，而不是 `fast-json`
- 确认 `snapshot-large` 输出预算保持在 6000 tokens 或更高
- 确认快照请求禁用了 AI response cache
- 检查后端日志中的 schema parse fail / fallback 记录
- 前端收到本地后端 500 / 502 / 503 / 504 时不应继续尝试其他 local origin，应直接提示“后端服务异常，请稍后再试”并回到未开始状态

## 安全建议

1. **不要提交真实 API Key** - 使用环境变量或 `.env` 文件
2. **定期轮换 Key** - 定期更换 API Key 降低泄露风险
3. **限制 Key 权限** - 只授予必要的 API 访问权限
4. **本地存储加密** - 生产环境考虑加密浏览器存储
