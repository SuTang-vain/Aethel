# Roadmap TODO

## 产品定位

AetheL 是面向产品构思的 AI 认知工作区。灵感气泡是主工作区，负责捕捉、组织、联想、沉淀与恢复产品构思现场；快照库是工作区的记忆层和历史入口；创意工坊是输入变换层；PRD 输出中心是结构化文档输出层。

## 主链路

```text
外部资料 / 模糊想法 / PRD 草稿
  -> 创意工坊 AI skill
  -> 候选气泡
  -> 灵感气泡画布
  -> 归类 / 追问 / 快照
  -> PRD 输出中心
  -> Markdown / PDF / DESIGN.md
```

## 近期路线

1. PRD Skill / Prompt Pack。
2. `frontend-design-md` 内置 skill。
3. PRD section 保存状态。
4. 低性能视觉模式落地。
5. 浏览器刷新持久化恢复测试。
6. PRD PDF 导出 smoke test。
7. 首次使用引导数据导入流程。
8. 来源筛选和外部证据层。

## 中期路线

- 多维权重机制：点击、编辑、快照、PRD 使用、关系命中、恢复次数。
- 联网产品研究 skill：市场分析、创意建议、规则规范。
- 快照输入 schema 继续标准化，输出已接入运行时 schema 校验和 provider fallback。
- 导出 Markdown Vault。
- 自定义 Skill Pack 安装 / 导入。

## 长期路线

- 快照库进一步融入灵感气泡二级入口，降低独立业务模块感。
- AetheL 数据协议稳定后支持跨项目迁移。
- 高级用户可启用 prompt override，但必须带预览、测试、schema 校验和恢复默认。
