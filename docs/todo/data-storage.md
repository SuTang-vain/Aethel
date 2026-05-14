# Data And Storage TODO

## 运行数据策略

- [x] 本地运行态默认写入 `data/`。
- [x] 支持 `AETHEL_DATA_DIR` 覆盖数据目录，便于测试和隔离运行环境。
- [x] `data/bubbles/*`、`data/snapshots/*`、`data/.trash/*`、`data/workspace.json` 不纳入 Git。
- [x] `data/onboarding/` 保留为版本化首次使用引导种子目录。
- [x] 集成测试写入临时目录，不污染本地 `data/`。
- [ ] 设计首次使用引导数据导入流程：用户确认后从 `data/onboarding/` 复制或生成到运行态。
- [ ] 为导入/导出预留 `Export Markdown Vault` 能力。

## Markdown 知识原子持久层

目标：每个气泡是一个独立 Markdown 文档，长期保存内容、语义元数据和低频信息；高频画布状态由 workspace JSON 承载。

文件结构：

```text
data/
├─ bubbles/
├─ snapshots/
├─ onboarding/
└─ workspace.json
```

- [x] `data/bubbles/*.md` 保存内容、标签、分类、追问补充、语义关系和低频元数据。
- [x] `data/workspace.json` 保存坐标、缩放、筛选、选中、面板状态等高频 UI 状态。
- [x] `data/snapshots/*.md` 保存快照摘要、语义锚点、唤醒指令，并引用 bubble ids。
- [x] frontmatter 字段使用稳定顺序减少 diff 噪音。
- [x] 文件名使用 id，不使用用户输入标题。

## 后端存储模块

- [x] `api/routes/bubbles.ts`。
- [x] `api/routes/snapshots.ts`。
- [x] `api/routes/workspace.ts`。
- [x] `api/storage/markdown.ts`。
- [x] `api/storage/bubbleFiles.ts`。
- [x] `api/storage/snapshotFiles.ts`。
- [x] `api/storage/workspaceFile.ts`。
- [x] `api/storage/atomicWrite.ts`。
- [x] `api/storage/writeQueue.ts`。
- [x] `api/storage/paths.ts`。

## 写入与冲突控制

- [x] 气泡正文和标签编辑使用 debounce。
- [x] 拖拽位置通过 workspace 级 debounce 批量保存。
- [x] 后端写文件使用临时文件 + rename。
- [x] 同一个 key 的并发写入排队处理。
- [x] 删除气泡先移动到 `data/.trash/`。
- [x] Vite 开发服务器忽略 `data/**`，避免文件层写入触发页面刷新。
- [x] 前端持久化使用 workspace 内容签名去重，避免重复 PATCH。
- [ ] 浏览器刷新后的端到端持久化恢复测试。

## 来源元信息

- [x] 气泡支持 `sourceSkillId`、`sourceGroupId`、`sourceLabel`、`sourceFileName`。
- [x] `sourceFileName` 贯穿前端 store、后端 StoredBubble、Markdown payload 与 bubble API。
- [ ] 联网研究来源增加 `externalSources`。
- [ ] PRD 导出时可选择是否附带来源引用。

联网来源结构草案：

```ts
interface ExternalEvidenceSource {
  title: string
  url: string
  accessedAt: string
  snippet?: string
  sourceType: 'market' | 'creative' | 'regulation'
}
```
