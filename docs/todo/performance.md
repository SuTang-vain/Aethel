# Performance TODO

## PR #2 参考结论

不接受外部 PR #2 的实现，但保留以下方向：

- 相同 AI 请求应该有短期缓存，减少重复 token 成本。
- 用户快速重复点击时，前端应复用同一个 pending 请求。
- PRD section 按分组生成天然适合并行。
- 性能报告和 benchmark 输出不应混入运行数据目录。

拒绝原实现的原因：

- `aiStore` 使用全局 pending promise，未按 payload 区分，可能把不同请求串成同一个结果。
- `snapshotCognition` cache key 只看 bubble id，内容、标签、追问、权重变化后会返回陈旧结果。
- 并行 `categorize` 会削弱跨分组关系、重复和冲突判断。
- 新增 `data/prd-quality-comparison.json` 属于运行或评估数据，不应进入 Git。

## 已完成优化

- [x] 新增 `src/lib/inflightRequests.ts`，通过稳定序列化生成 `scope + payload` key。
- [x] `categorize`、`generatePrdSections`、`runWorkshopSkill`、`followUp` 使用同 payload in-flight 去重。
- [x] 后端 `createChatCompletion` 支持非流式 AI 请求的 TTL 内存缓存。
- [x] cache key 包含 provider、baseURL、model、stream 和 messages。
- [x] `/api/ai/config` 更新后清空 AI response cache。
- [x] 对同一个 cache key 的并发请求复用 pending promise。
- [x] 缓存仅用于可复现的非流式调用，不缓存 chat / generate-prd 流式输出。
- [x] PRD section 多分组使用并行生成，单个分组失败不阻断其他分组。
- [x] `categorize` 保持单次整体分析，不拆分并行。
- [x] 认知快照生成禁用 AI response cache，并统一使用 `snapshot-large` 的 6000 tokens 输出预算，避免连续生成时复用旧响应或截断 JSON。

## 后续优化边界

- [ ] 为 AI response cache 增加调试指标：hit / miss / pending / evicted。
- [ ] 评估 snapshot 前端缓存，但只可用于明确的预览或草稿场景；正式认知快照生成默认不缓存，除非 cache key 完整包含 content、tag、extensions、category、interactionWeight、relations 和 prompt/profile 版本。
- [ ] 对大输入做 token 预算估算，提前截断或提示用户分批处理。
- [x] 建立 `自动调用` 性能策略：根据 task profile、输入规模、近期耗时和失败率选择 provider / model。
- [x] 为 Moonshot / Kimi 显式设置每类任务的 `max_completion_tokens`，降低短任务被高输出预算拖慢的概率。
- [x] 为 DeepSeek 增加 thinking 控制：低延迟 JSON / section 任务默认关闭 thinking，高复杂任务按需开启。
- [ ] PRD sections 从后端并行升级为 SSE 渐进式返回，section 完成一个推送一个。
- [ ] Snapshot 大输入采用 map-reduce：按 tag/category 并行生成局部摘要，再合成全局快照。
- [ ] Workshop 输入变换采用“快速结构扫描 + 后台候选气泡补全”，降低首屏等待。
- [ ] 低性能模式落地：关闭大面积 backdrop blur、彩色层和非关键动画。
- [ ] Vite build chunk 继续观察，PDF / DOCX 解析维持按需加载。

## 性能对比测试规划

目标：用稳定样本比较 Moonshot / DeepSeek / ModelScope 在 AetheL 真实任务上的延迟、成功率、JSON 稳定性和输出质量，不把测试输出混入运行态 `data/`。

测试集：

- [ ] 小型气泡集：5 个气泡，覆盖 AI 归类和 snapshot。
- [ ] 中型气泡集：20 个气泡，覆盖 categorize、snapshot、PRD sections。
- [ ] 大型气泡集：50 个气泡，触发 snapshot map-reduce 和 token 预算策略。
- [ ] PRD 文档输入：短 PRD、长 PRD、结构混乱 PRD。
- [ ] DESIGN.md 目标输入：前端交互型气泡集合。

测试任务：

- [ ] `fast-json/categorize`：总耗时、parse 成功率、relations 质量。
- [ ] `fast-json/followup`：总耗时、fallback 触发率、选项可执行性。
- [ ] `snapshot-large`：连续两次生成成功率、JSON 完整率、认知锚点可用性。
- [ ] `snapshot-large/map-reduce`：单次调用 vs map-reduce 对比。
- [ ] `section-draft/prd-sections`：串行 vs 并行 vs SSE 渐进式首块时间。
- [ ] `workshop-transform`：完整等待 vs 快速结构扫描 + 后台补全。

指标：

- [ ] `timeToFirstByteMs` / `timeToFirstSectionMs`。
- [ ] `totalLatencyMs`。
- [ ] `promptTokensEstimate` / `outputTokensEstimate`。
- [ ] `provider` / `model` / `taskProfile`。
- [ ] `cacheHit` / `pendingReuse`。
- [ ] `statusCode`、429、timeout、schema parse fail。
- [ ] JSON 归一化 fallback 次数。
- [ ] 人工抽样质量评分：可用、需编辑、不可用。

执行方式：

- [ ] 新增 `tests/benchmark/ai-performance-benchmark.ts`，默认只使用 mock 或离线样本，不调用真实 API。
- [ ] 新增可选真实 API benchmark，需要显式环境变量启用，例如 `AETHEL_RUN_REAL_AI_BENCHMARK=1`。
- [ ] benchmark 输出写入 `reports/ai-performance/` 或控制台摘要，不写入 `data/`。
- [ ] 报告文件默认不自动提交；只将稳定基准说明和测试脚本纳入 Git。
- [ ] 对比报告需要标记测试日期、地区网络、provider、model、样本版本和并发配置。

## 验收标准

- [x] 同 payload 的重复 PRD section 请求不会重复调用 mock AI。
- [x] 不同 payload 的 PRD section 请求不会复用错误结果。
- [x] PRD section 多分组生成返回每个成功分组的 `groupId`。
- [x] 自动调用在 mock 测试中能按 task profile 选择预期 provider / model。
- [x] 手动 provider 选择能覆盖自动调用。
- [x] DeepSeek fast-json profile 会关闭 thinking。
- [x] Moonshot profile 会传入明确的输出 token 上限。
- [x] Snapshot profile 会传入 6000 tokens 输出上限，并禁用 AI response cache。
- [ ] 性能 benchmark 能输出不同 provider / model / profile 的延迟对比摘要。
- [ ] 真实浏览器验证低性能模式对主要页面生效。
