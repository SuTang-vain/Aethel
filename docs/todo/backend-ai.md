# Backend AI TODO

## Prompt 与接口

- [x] `workshop` / `prd` / `snapshot` prompt 抽离到 `api/prompts/`。
- [x] `categorize` / `followup` prompt 抽离到 `api/prompts/`。
- [x] `categorize` / `followup` AI JSON 返回做运行时 schema 归一化。
- [x] `categorize` / `followup` user prompt 增加过长内容截断。
- [x] PRD section 支持按分组并行生成。
- [ ] Snapshot 输入结构标准化，补齐 relations、categoryName、权重字段。
- [x] Snapshot 输出接入运行时 schema 校验，AI 返回不完整或 JSON 截断时触发 provider fallback。
- [x] 快照生成失败时，前端展示“后端服务异常，请稍后再试”，清理本次快照创建状态并回到未开始状态。
- [ ] 为 AI API fallback 失败场景提供更明确的前端重试入口，快照已先完成异常提示与状态清理。

## PRD Skill / Prompt Pack

产品判断：不把底层 prompt 全量开放给普通用户编辑。AetheL 的扩展单位应是可装载、可配置、可测试的 PRD Skill / Prompt Pack。

稳定内核：

- JSON 输出格式。
- 安全约束。
- 字段 schema。
- fallback 要求。
- AetheL 气泡 / PRD / snapshot 数据协议。

Skill Pack：

- PRD 类型。
- 章节结构。
- 生成视角。
- 关注维度。
- 示例片段。
- 输出风格。
- 适用输入类型。

第一批内置类型：

- [ ] 通用产品 PRD。
- [ ] 前端交互 PRD。
- [ ] 设计实现说明 `DESIGN.md`。
- [ ] 后端接口 PRD。
- [ ] 增长实验 PRD。
- [ ] AI 功能 PRD。
- [ ] 合规 / 风控 PRD。

实现路线：

- [ ] 为 PRD 生成增加 `prdSkillId` 或 `documentTemplateId`。
- [ ] 新增 `api/prompts/skills/` 或 `api/skills/`，承载内置 PRD skill 定义。
- [ ] 将 PRD sections prompt 改为稳定内核 + Skill Pack 结构化配置组合生成。
- [ ] PRD 页增加文档类型选择入口，默认使用通用产品 PRD。
- [ ] 第一批优先实现 `frontend-design-md`。
- [ ] 自定义 Skill 只允许编辑结构化字段，默认不开放底层 system prompt。
- [ ] 高级 prompt override 必须带预览、测试、schema 校验和恢复默认。

`frontend-design-md` 草案：

```ts
{
  id: 'frontend-design-md',
  name: '前端 DESIGN.md',
  inputTypes: ['bubbles', 'prd-section', 'markdown'],
  outputType: 'markdown-document',
  sections: [
    '页面目标',
    '信息架构',
    '组件结构',
    '状态与数据流',
    '交互细节',
    '响应式规则',
    '视觉约束',
    '边界状态',
    '验收标准'
  ],
  focus: [
    '前端工程可实现性',
    '组件拆分',
    '交互状态',
    '设计一致性',
    '移动端适配'
  ]
}
```

## 联网产品研究 Skill

- [ ] 创意工坊新增 `联网产品研究` skill。
- [ ] 模式包括市场分析、创意建议、规则规范。
- [ ] 输入来源支持手写描述、当前 PRD、选中气泡集合、上传文档。
- [ ] 输出结构化结论、建议气泡、可插入 PRD 内容和来源链接。
- [ ] 后端新增受控搜索 API，避免前端暴露搜索服务密钥。
- [ ] AI prompt 区分事实来源摘要和模型推断建议。
- [ ] 对医疗、金融、法律、隐私合规等高风险领域显示人工复核提示。

## AI 配置

- [x] 支持 Moonshot / DeepSeek / ModelScope。
- [x] 支持 `GET /api/ai/config` 和 `POST /api/ai/config`。
- [x] 前端设置中心可以切换 provider、API Key 和 model。
- [x] Logo 回到灵感气泡主工作区，设置入口放入右上角全局辅助菜单。
- [x] 更新 AI 配置后清空后端 AI response cache。
- [x] `AI_PROVIDER` 缺失时不再硬默认 Moonshot，而是按已配置 key 自动选择：ModelScope -> DeepSeek -> Moonshot。
- [x] 前端设置 store 默认从 Moonshot 调整为 ModelScope，减少首次启动误导。
- [x] `.env.example`、README 和多 API 文档同步说明 provider 推断规则。
- [x] 设置中心新增默认 `自动调用` 模式；手动选择 provider / model 时覆盖自动策略。
- [x] 自动调用不是固定单一模型，而是根据任务 profile、输入规模、近期性能指标和失败情况选择服务商 / 模型。
- [x] 自动调用必须可解释：活动记录中展示本次使用的 provider、model、profile、fallback 原因。

## AI Task Profile

目标：把不同 AI 功能从“同一个默认 completion 参数”拆成可观测、可调度、可测试的任务 profile，降低 Moonshot / DeepSeek 等平台的排队和长等待。

建议 profile：

- [x] `fast-json`：AI 归类、追问。目标是低延迟、稳定 JSON、短输出。
- [x] `section-draft`：单个 PRD section / DESIGN.md section。目标是中等长度、可并行、可逐块返回。
- [x] `long-document`：完整 PRD、完整 DESIGN.md。目标是质量优先、可流式输出。
- [x] `snapshot-large`：认知快照生成统一使用该 profile，当前单次合成输出预算为 6000 tokens，禁用 AI response cache，后续再扩展 map-reduce。
- [x] `workshop-transform`：创意工坊输入变换。目标是先返回结构扫描，再补候选气泡。

每个 profile 需要配置：

- [x] provider / model 候选列表。
- [x] `max_tokens` 或 `max_completion_tokens`。
- [x] 是否启用 DeepSeek thinking。
- [x] 超时时间。
- [ ] 并发上限。
- [x] fallback provider / model。
- [x] 是否允许流式或渐进式返回。
- [x] 快照 JSON schema / normalize fallback。
- [ ] PRD / workshop JSON schema / normalize fallback 补齐到与 categorize / followup / snapshot 同等级。

服务商参数策略：

- [x] Moonshot / Kimi：按任务显式设置 `max_completion_tokens`，避免短任务被默认长输出预算拖慢或排队。
- [x] DeepSeek：对 `fast-json`、`section-draft`、`snapshot-large` 默认关闭 thinking；复杂长文档或合规分析再开启。
- [x] ModelScope：作为自动调用中的低延迟候选，但保留失败重试和输出 schema 校验。
- [x] Snapshot 不再走 `fast-json` 的短输出预算，避免第二次生成时出现 JSON 截断、字段不完整或缓存复用旧结果。
- [ ] 对支持 token 估算的 provider，加入请求前 token 预算估算，用于截断、分块和自动调用决策。

自动调用决策草案：

```text
用户设置为自动调用
  -> 根据 API 功能映射 task profile
  -> 估算输入规模与输出预算
  -> 根据最近性能指标选择候选 provider/model
  -> 执行请求
  -> 超时 / 429 / schema parse fail 时 fallback
  -> 记录活动日志和性能指标
```

手动模式约束：

- [x] 用户手动选择 Moonshot / DeepSeek / ModelScope 时，默认不跨 provider 自动切换。
- [x] 手动模式仍应用 task profile 的 max tokens、thinking、timeout、schema 校验。
- [ ] 可增加“失败时允许自动 fallback”开关，默认关闭或弱提示确认。
