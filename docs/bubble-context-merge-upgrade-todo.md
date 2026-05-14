# 灵感气泡与上下文管理合并升级 TODO

本文件已从单一长文档整理为模块化 TODO 文件系统。历史规划不再继续堆叠在这里，后续请优先更新 `docs/todo/` 下的专题文档。

## 当前结论

AetheL 的产品形态是面向产品构思的 AI 认知工作区：

- 灵感气泡是主工作区，负责捕捉、组织、联想、沉淀与恢复产品构思现场。
- 快照库是工作区的记忆层、快照层和历史入口。
- 创意工坊是输入变换层，负责把外部资料、粗糙想法或 PRD 草稿气泡化。
- PRD 输出中心是结构化文档输出层，负责把气泡集合生成可编辑文档。

主链路：

```text
粗糙想法 / PRD 草稿 / 外部资料
  -> 创意工坊 AI skill 分析
  -> 候选气泡与用户确认补充
  -> 写入灵感气泡画布
  -> 画布整理、追问、归类、快照
  -> PRD 输出中心按标签/分类分束
  -> 可编辑章节草稿
  -> Markdown / PDF / DESIGN.md
```

## 模块化 TODO

- [docs/todo/README.md](./todo/README.md)：当前优先级与文档地图。
- [docs/todo/roadmap.md](./todo/roadmap.md)：阶段路线与产品主链路。
- [docs/todo/backend-ai.md](./todo/backend-ai.md)：AI 接口、prompt、缓存、PRD Skill 规划。
- [docs/todo/frontend.md](./todo/frontend.md)：页面体验、导航、视觉和交互待办。
- [docs/todo/data-storage.md](./todo/data-storage.md)：Markdown 知识原子、运行数据隔离、导入导出。
- [docs/todo/testing.md](./todo/testing.md)：测试覆盖清单与验证命令。
- [docs/todo/performance.md](./todo/performance.md)：参考外部 PR 后保留的性能优化方案与边界。
- [docs/todo/logs.md](./todo/logs.md)：按日期归档的开发记录。

## 当前优先级摘录

1. PRD Skill / Prompt Pack：以结构化 skill 承载不同 PRD 类型，不把底层 prompt 全量开放给普通用户。
2. `frontend-design-md`：第一批内置 skill，支持从气泡或 PRD section 生成前端实现说明 `DESIGN.md`。
3. PRD section 编辑稳定性：增加保存状态或最近编辑时间。
4. 低性能模式：真正关闭大面积 blur、彩色层和非关键动画。
5. 测试闭环：补浏览器刷新持久化恢复和 PRD PDF 导出内容 smoke test。
6. 首次使用引导：基于 `data/onboarding/` 规划引导数据导入，不混入用户运行数据。

## 2026-05-12 更新

- 不接受外部开发者 PR #2。
- 已参考其思路完成更保守的性能优化：同 payload in-flight 去重、后端 AI response cache、PRD section 多分组并行。
- 已避免引入 PR #2 中的运行数据文件、过重 benchmark 报告和 `categorize` 并行拆分风险。
- TODO 已拆分为 `docs/todo/` 文件系统，旧文件保留为索引入口。
