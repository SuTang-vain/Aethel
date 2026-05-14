# Testing TODO

## 已有命令

```bash
npm run check
npm run test:integration
npm run test:ui
npm run build
```

## 已完成覆盖

- [x] P0 API 集成测试：文件持久层、AI skill、PRD 分束、snapshot、apiClient fallback。
- [x] P1 文件解析测试：Markdown、DOCX、PDF 和不支持文件类型。
- [x] P1 UI 测试：工坊上传、错误提示、工坊到 PRD、Markdown 导出、选区气泡条、快照预选集合。
- [x] `categorize` 运行时 schema 归一化和过长内容截断。
- [x] `followup` 运行时 schema 归一化和 fallback。
- [x] AI response cache：同 payload 命中缓存，不同 payload 不串用。
- [x] PRD section 多分组并行生成。
- [x] 前端 in-flight request key 稳定性与同 payload 去重。
- [x] AI provider 环境推断测试：只有 ModelScope key 时默认选择 ModelScope，显式 provider 仍可覆盖。
- [x] 自动调用策略测试：不同 task profile 映射到预期 provider / model 候选。
- [x] 手动选择 provider / model 时覆盖自动调用，不发生未经允许的跨 provider fallback。
- [x] AI task profile 参数测试：Moonshot 带明确 `max_completion_tokens`，DeepSeek fast-json 默认关闭 thinking。
- [x] AI provider fallback 测试：429 / schema parse fail 类错误时按配置 fallback，并记录原因。
- [x] AI 性能指标测试：每次调用记录 provider、model、profile、latency、cacheHit、pendingReuse。
- [x] Snapshot AI 返回 fenced JSON 时可解析，返回不完整 cognition 字段时会抛出稳定后端异常提示。
- [x] Snapshot 生成统一使用 `snapshot-large`、6000 tokens、禁用 AI response cache，连续生成不会复用第一次响应。
- [x] Snapshot schema parse fail 会触发 provider fallback。
- [x] `apiFetch` 遇到本地后端 500 / 502 / 503 / 504 不再重试其他 local origin，避免业务异常被前端 fallback 拉长。

## 待补测试

- [ ] AI provider fallback 测试补充 timeout 分支。
- [ ] Provider 性能对比 benchmark：Moonshot / DeepSeek / ModelScope 在同一 fixture 上输出延迟摘要。
- [ ] 创建 0 个气泡时，快照按钮禁用或提示。
- [ ] 创建 1 个气泡时，生成基础快照。
- [ ] 多个带标签气泡时，AI 能抽取 3-5 个锚点。
- [ ] 带追问补充的气泡进入快照上下文。
- [ ] 高频点击气泡后，权重增加。
- [ ] 高频气泡在快照摘要或 Level 3 中优先出现。
- [ ] 恢复快照后，画布气泡、分类和 viewport 正确恢复。
- [ ] 删除快照不影响当前工作区。
- [x] AI 接口业务失败时，快照展示“后端服务异常，请稍后再试”，清理创建缓存状态并回到未开始状态。
- [ ] AI 接口业务失败时，工坊 / PRD 的用户可见 fallback 与重试入口生效。
- [ ] 全局 AI 动效只在 AI 运行时出现，不遮挡关键交互。
- [ ] 浏览器刷新后端到端持久化数据可恢复。
- [ ] PRD PDF 导出内容 smoke test。

## 性能对比测试原则

- benchmark 必须和普通集成测试分离，避免每次开发都调用真实 AI。
- 真实 API benchmark 需要显式环境变量开启。
- benchmark fixture 必须稳定，避免每次改动样本导致结果不可比。
- 输出报告不写入 `data/`，避免运行态和仓库样例数据混淆。
- 报告应优先保留摘要指标，不提交包含真实用户输入、API Key、完整敏感响应的文件。

## 验收基线

每个主线开发完成前至少运行：

- `npm run check`
- `npm run test:integration`

涉及真实页面交互或视觉状态时补跑：

- `npm run test:ui`

发布或合并前补跑：

- `npm run build`
