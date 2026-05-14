# Development Logs

## 2026-05-14

- [x] 定位认知快照“第一次成功、第二次无法正常生成”的核心原因：快照走 `fast-json` 短输出预算时容易截断 JSON，且 AI response cache 可能复用上一次响应。
- [x] 快照生成统一切到 `snapshot-large` profile，将输出预算提升到 6000 tokens，并对快照 AI 请求禁用 response cache。
- [x] 后端对 snapshot 输出增加 schema 归一化和完整性校验，AI 返回 JSON 截断或字段缺失时触发 provider fallback。
- [x] 前端 `apiFetch` 遇到本地后端 500 / 502 / 503 / 504 不再重试其他 local origin，避免业务异常被 fallback 机制掩盖。
- [x] 快照生成后端异常时，前端展示“后端服务异常，请稍后再试”，清理本次快照名称、预选集合和创建状态，回到未开始状态。
- [x] 增加集成测试覆盖 fenced JSON、snapshot schema fallback、禁用快照响应缓存、后端 500 不走 local retry，以及前端稳定异常提示。
- [x] 通过 Chrome DevTools 验证连续创建第二个快照成功，网络请求返回 `POST /api/ai/snapshot 200` 与 `PATCH /api/workspace 200`。

## 2026-05-12

- [x] 明确不接受外部 PR #2。
- [x] 参考其性能方向，采用更保守的同 payload in-flight 去重和后端 AI response cache。
- [x] PRD section 多分组并行生成，保留 `categorize` 的整体关系判断。
- [x] 新增性能优化测试，验证 cache 不串 payload。
- [x] 拆分 TODO 文档到 `docs/todo/`。
- [x] 规划 AI `自动调用`：根据 task profile 自动选择 provider / model，用户手动选择仍可覆盖。
- [x] 规划 Moonshot / DeepSeek / ModelScope 性能对比 benchmark，避免继续凭体感优化。
- [x] 修正 AI provider 启动默认值与本地凭据错位：缺少 `AI_PROVIDER` 时按已配置 key 推断，优先 ModelScope。
- [x] 开发 AI 自动调用与 task profile：按 fast-json / section-draft / long-document / snapshot-large / workshop-transform 配置模型候选、token 上限、DeepSeek thinking 和 fallback。
- [x] 设置中心支持默认自动调用，并在活动记录展示最近 AI 调用的 provider、model、profile、latency、cache / pending reuse 和 fallback 原因。
- [x] 新增 `ai-routing` 集成测试，覆盖自动 fallback、手动覆盖、Moonshot token cap、DeepSeek non-thinking 和性能指标记录。

## 2026-05-11

- [x] PRD 上传支持 PDF / DOCX / Markdown / TXT / HTML / JSON / CSV。
- [x] 创意工坊支持拖拽上传、文件内容预览摘要和 `sourceFileName` 来源元信息。
- [x] 新增 P1 文件解析测试和 UI 测试。
- [x] 抽离 `categorize` / `followup` prompt。
- [x] 新增 `api/aiResponseSchemas.ts`，对 AI JSON 返回做运行时归一化。

## 2026-05-09

- [x] 完成 P0 工程稳定性：mock AI 集成测试、prompt 抽离、运行数据 Git 隔离、onboarding seed 规划。
- [x] 设置中心和右上角全局辅助菜单收敛。
- [x] 帮助 / 反馈 / 论坛改为全局辅助菜单外链。
- [x] `...` 菜单样式向顶部导航胶囊靠拢。

## 2026-05-08

- [x] 新增 AetheL 品牌 Logo、favicon 和 README 展示。
- [x] 创意工坊支持文本型 PRD 文件上传。
- [x] 新增全局 AI 运行状态反馈。
- [x] 降低常驻彩色渲染和大玻璃容器视觉噪音。

## 2026-05-06

- [x] 创意工坊 / PRD / 灵感气泡形成连续产品工作流。
- [x] 创意工坊 skill runner 接入真实 AI 能力。
- [x] PRD 输出支持按标签 / 分类分束和可编辑 section drafts。

## 2026-05-05

- [x] 气泡空间、快照库、PRD 页面统一 UI 语言。
- [x] 快照能力嵌入气泡工作区。
- [x] 选中集合提升到 Zustand store。
