export function buildGeneratePrdSystemPrompt(template: string, modules?: string[]) {
  return `你是一个专业的产品经理，擅长撰写高质量的PRD文档。
根据用户提供的灵感气泡内容，生成结构化的PRD文档。
${template === 'lean' ? '使用精简模板，只包含核心模块。' : template === 'detailed' ? '使用详细模板，包含所有可能的模块。' : '使用标准模板。'}
${modules ? `需要包含的模块：${modules.join('、')}` : ''}

请按模块逐个输出，每个模块使用以下格式：
## 模块名称
模块内容...`
}

export function buildGeneratePrdUserPrompt(bubblesContent: string) {
  return `请根据以下灵感气泡的详细内容生成PRD，不要只引用气泡ID，要吸收每个气泡的内容、标签和追问补充：\n\n${bubblesContent}`
}

export function buildPrdSectionsSystemPrompt(template: string) {
  return `你是一个专业的产品经理，正在把产品构思气泡生成可编辑的 PRD 分章节草稿。
用户已经按标签/分类把气泡分组，每个分组应生成一个独立 PRD section。

要求：
1. 每个输入分组必须返回一个 section，section.groupId 必须等于输入分组ID。
2. section.title 可以优化为更像 PRD 章节标题，但必须保留该分组的含义。
3. section.content 使用 Markdown 正文，不要再输出一级标题；可以包含二级/三级小标题、列表、验收点。
4. 内容要吸收气泡正文、标签和追问补充，不要只是罗列气泡。
5. 避免跨分组重复表达，同一类判断在自己的 section 中讲清楚即可。
6. ${template === 'lean' ? '使用精简模板，章节内容保持短而可执行。' : template === 'detailed' ? '使用详细模板，补足背景、约束、验收标准和风险。' : '使用标准模板，平衡完整性与可读性。'}

请只返回严格 json，不要包含 Markdown 代码块或额外说明：
{
  "sections": [
    {
      "groupId": "输入分组ID",
      "title": "章节标题",
      "content": "Markdown 正文"
    }
  ]
}`
}

export function buildPrdSectionsUserPrompt(groupLines: string) {
  return `请根据以下分组气泡生成 PRD sections：\n\n${groupLines}`
}

export function buildPrdSectionUserPrompt(group: {
  id: string
  title: string
  tag?: string
  bubbles?: Array<{ id: string; content: string; tag?: string; extensions?: string[] }>
}) {
  const bubbles = Array.isArray(group.bubbles) ? group.bubbles : []
  const bubbleLines = bubbles.map((bubble, index) => {
    const lines = [
      `气泡 ${index + 1}`,
      `ID: ${bubble.id}`,
      `内容: ${bubble.content}`,
    ]
    if (bubble.tag) lines.push(`标签: ${bubble.tag}`)
    if (bubble.extensions?.length) lines.push(`追问补充: ${bubble.extensions.join('；')}`)
    return lines.join('\n')
  }).join('\n\n')

  return `请只为下面这一个分组生成 1 个 PRD section，返回格式仍然必须是 {"sections":[...]}，且 section.groupId 必须等于 "${group.id}"：\n\n${[
    `分组ID: ${group.id}`,
    `章节标题: ${group.title}`,
    group.tag ? `标签: ${group.tag}` : '',
    '气泡：',
    bubbleLines || '无',
  ].filter(Boolean).join('\n')}`
}
