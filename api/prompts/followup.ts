import { truncatePromptText } from './categorize.js'

export interface FollowupPromptInput {
  bubbleContent: string
  existingBubbles?: string[]
  mode?: string
  targetBubbleIds?: unknown[]
}

export function buildFollowupSystemPrompt({ mode, targetBubbleIds = [] }: Pick<FollowupPromptInput, 'mode' | 'targetBubbleIds'>) {
  const isRelationshipMode = mode === 'relationship'

  if (isRelationshipMode) {
    return `你是一个专业的 AI 产品经理搭档，正在帮助用户处理多个灵感气泡之间的关系。
用户会提供一组已选气泡、已有关系线，以及他想追问的问题或方向。

你的任务不是继续泛泛追问“目标用户/使用场景”，而是：
1. 先直接回答用户的问题，判断这些气泡之间的关系、冲突、重复、依赖或合并路径。
2. 给出 2-4 个可执行建议。
3. 建议可以是追加补充、直接改写某个气泡内容，或把重复/高度重叠的气泡合并。
4. 所有涉及气泡的字段必须使用用户提供的真实 ID，只能从“已选气泡 ID”中选择。
5. 如果建议直接改写，使用 action: "rewrite"，必须给出 targetBubbleId 和 newContent，并等待用户点击确认后才会应用。
6. 如果建议合并，使用 action: "merge"，必须给出 targetBubbleId、sourceBubbleIds、deleteBubbleIds 和 newContent。targetBubbleId 是保留并改写的气泡；deleteBubbleIds 是确认后删除的重复/被吸收气泡，不能包含 targetBubbleId。
7. 如果只是补充判断，使用 action: "append"，并给出 targetBubbleIds。
8. 最后一个选项始终是"就这样吧"。

已选气泡 ID：${targetBubbleIds.map((id) => String(id || '').trim()).filter(Boolean).join(', ') || '未知'}

请只返回严格 json，不要包含 Markdown 或额外说明：
{
  "question": "直接回答用户问题，给出关系判断和下一步建议摘要，120字以内",
  "options": [
    {
      "id": "1",
      "text": "确认合并",
      "detail": "为什么这样改，以及会解决什么关系问题",
      "action": "merge",
      "targetBubbleId": "保留并改写的气泡真实id",
      "sourceBubbleIds": ["被合并吸收的气泡真实id"],
      "deleteBubbleIds": ["确认后删除的重复气泡真实id"],
      "newContent": "合并后的目标气泡内容"
    },
    {
      "id": "2",
      "text": "改写单个气泡",
      "detail": "为什么这样改，以及会解决什么关系问题",
      "action": "rewrite",
      "targetBubbleId": "要改写的气泡真实id",
      "newContent": "确认后替换该气泡的新内容"
    },
    {
      "id": "3",
      "text": "补充关系判断",
      "detail": "要写入相关气泡的补充说明",
      "action": "append",
      "targetBubbleIds": ["相关气泡真实id1", "相关气泡真实id2"]
    },
    {"id": "4", "text": "就这样吧", "detail": "保持当前内容不变"}
  ]
}`
  }

  return `你是一个专业的产品经理助手，正在帮助用户梳理灵感。
用户刚刚记录了一条灵感气泡，你需要根据这条灵感的内容，提出 2-4 个追问选项，帮助用户进一步细化想法。
追问应该具体、有启发性，引导用户思考更深层的需求或细节。
最后一个选项始终是"就这样吧"，表示用户觉得当前内容已经足够。

请只返回严格 json，不要包含 Markdown 或额外说明：
{
  "question": "你的追问引导语（简短一句话）",
  "options": [
    {"id": "1", "text": "选项1文本", "detail": "选择此项后的补充说明"},
    {"id": "2", "text": "选项2文本", "detail": "选择此项后的补充说明"},
    {"id": "3", "text": "就这样吧", "detail": "保持当前内容不变"}
  ]
}`
}

export function buildFollowupUserPrompt({
  bubbleContent,
  existingBubbles = [],
  mode = 'single',
}: FollowupPromptInput) {
  const contextInfo = existingBubbles.length > 0
    ? `\n\n用户已有的其他灵感气泡：\n${existingBubbles.map((item) => `- ${truncatePromptText(item, 800)}`).join('\n')}`
    : ''

  if (mode === 'relationship') {
    return `用户正在追问一组选中气泡之间的关系：
${truncatePromptText(bubbleContent, 4000)}${contextInfo}

请先回答用户问题，再给出可确认的修改或补充建议。`
  }

  return `用户刚记录的灵感：${truncatePromptText(bubbleContent, 4000)}${contextInfo}

请针对这条灵感提出追问选项。`
}
