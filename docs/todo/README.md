# AetheL TODO Index

本目录将原 `docs/bubble-context-merge-upgrade-todo.md` 拆分为可维护的专题文档。旧文件保留为入口，后续开发优先更新这里的模块化 TODO。

## 当前优先级

### P0 已完成

- [x] API 级 mock AI 集成测试覆盖文件持久层、AI skill、PRD 分束、snapshot 和 apiClient fallback。
- [x] 运行数据不混入 Git：`data/bubbles/*`、`data/snapshots/*`、`data/.trash/*`、`data/workspace.json` 已作为本地运行态隔离。
- [x] 首次使用引导数据规划到 `data/onboarding/`，和真实用户运行数据分离。
- [x] `workshop` / `prd` / `snapshot` / `categorize` / `followup` prompt 已抽离到 `api/prompts/`。

### P1 已完成

- [x] PRD 上传支持 PDF / DOCX / Markdown / TXT / HTML / JSON / CSV。
- [x] 创意工坊支持拖拽上传、文件内容预览摘要和 `sourceFileName` 来源元信息。
- [x] UI 测试覆盖工坊上传、工坊到 PRD 接力、PRD Markdown 导出、选区气泡条和快照预选集合。
- [x] `categorize` / `followup` AI JSON 返回增加运行时归一化、fallback 和过长内容截断。

### P2 当前进行中

- [x] 不接受外部 PR #2，但吸收其性能方向，完成更保守的 AI 请求缓存、同 payload 并发复用和 PRD section 并行生成。
- [x] TODO 文档拆分为 `docs/todo/` 文件系统。
- [x] 修正 AI provider 默认逻辑：`AI_PROVIDER` 缺失时按已配置 key 自动选择，避免只有 ModelScope key 却默认 Moonshot 空 key。
- [x] AI 设置新增默认 `自动调用`：系统按任务 profile 自动选择服务商 / 模型，用户仍可手动指定 Moonshot / DeepSeek / ModelScope。
- [x] 建立 AI task profile：`fast-json`、`section-draft`、`long-document`、`snapshot-large`、`workshop-transform`，分别配置 max tokens、thinking、timeout、缓存和 fallback。
- [x] 修复认知快照连续生成稳定性：快照统一走 `snapshot-large`、6000 tokens、禁用响应缓存，后端 schema 校验失败触发 fallback，前端对后端异常给出固定提示并清理创建状态。
- [ ] 针对 Moonshot / DeepSeek / ModelScope 建立性能对比测试基线，覆盖认知快照、AI 归类、PRD section、工坊 skill。
- [ ] 为 PRD 生成增加 `prdSkillId` 或 `documentTemplateId`。
- [ ] 第一批内置 PRD Skill / Prompt Pack，优先 `frontend-design-md`。
- [ ] PRD section 增加保存状态或最近编辑时间。
- [ ] 低性能模式真正关闭大面积 blur、彩色层和非关键动画。
- [ ] 补浏览器刷新后的端到端持久化恢复测试。
- [ ] PRD PDF 导出内容 smoke test。

## 文档地图

- [roadmap.md](./roadmap.md)：阶段路线与产品主链路。
- [backend-ai.md](./backend-ai.md)：AI 接口、prompt、缓存、PRD Skill 规划。
- [frontend.md](./frontend.md)：页面体验、导航、视觉和交互待办。
- [data-storage.md](./data-storage.md)：Markdown 知识原子、运行数据隔离、导入导出。
- [testing.md](./testing.md)：测试覆盖清单与验证命令。
- [performance.md](./performance.md)：参考 PR #2 后保留的性能优化方案与边界。
- [logs.md](./logs.md)：按日期归档的开发记录。

## 更新规则

- 当前开发优先级更新在本文件。
- 专题任务更新到对应模块文件，不再把所有内容堆回旧 TODO。
- 已完成的重要里程碑同步到 [logs.md](./logs.md)。
- 涉及运行数据、测试报告、benchmark 输出时，不提交 `data/` 运行态文件，只提交规划或稳定文档。
