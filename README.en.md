# AetheL: AI Cognitive Workspace for Product Thinking

<p align="center">
  <img src="public/aethel-logo.png" alt="AetheL Logo" width="280" />
</p>

[中文说明](./README.zh.md) | [Main README](./README.md)

## Overview

**AetheL** is an AI cognitive workspace for product thinking. It helps product managers, founders, designers, and builders capture early ideas as lightweight "bubbles", clarify them through AI follow-up questions, compress emerging logic into cognitive snapshots, and turn selected thinking threads into structured PRD drafts.

AetheL is designed for the messy middle of product creation: when ideas are still rough, context changes quickly, and the team needs a workspace that can preserve reasoning instead of only storing final documents.

## Core Features

- **Product thinking bubble space**: Capture assumptions, user scenarios, constraints, risks, evidence, and open questions as movable thinking units.
- **AI categorization and relationship detection**: Group related bubbles, recommend tags, and surface related, duplicate, or contradictory ideas.
- **Cognitive snapshots**: Generate semantic summaries with anchors, logic levels, follow-up questions, and next actions. Snapshot generation uses a dedicated `snapshot-large` AI task profile with stricter schema validation.
- **Creative Workshop**: Transform one-line ideas, rough notes, PRD drafts, and uploaded documents into structured candidate bubbles through AI skills.
- **PRD Output Center**: Generate editable PRD section drafts from selected bubble groups, keep source context visible, and export Markdown or PDF.
- **AI follow-up loop**: Ask contextual questions to clarify target users, usage scenarios, success criteria, dependencies, and risks.
- **Durable local knowledge storage**: Persist bubbles and snapshots as Markdown files, with workspace layout and runtime state stored in JSON.
- **Multi-provider AI configuration**: Support ModelScope, DeepSeek, and Moonshot, with automatic provider selection when `AI_PROVIDER` is omitted.

## Product Workflow

```text
Rough idea / PRD draft / external material
  -> Creative Workshop AI skill
  -> Candidate bubbles
  -> Bubble workspace organization, follow-up, categorization, and snapshots
  -> PRD Output Center grouped by tags or categories
  -> Editable section drafts
  -> Markdown / PDF export
```

## Key Pages

- **Inspiration Bubbles (`/`)**: The primary cognitive canvas for capturing, selecting, editing, deleting, classifying, and expanding product-thinking bubbles.
- **Creative Workshop (`/workshop`)**: The input transformation layer for converting ideas, files, and drafts into structured product-thinking bubbles.
- **PRD Output (`/prd`)**: The document output layer for generating editable PRD sections from selected bubbles.
- **Snapshot Library (`/context`)**: The semantic memory layer for reviewing and restoring saved thinking contexts.
- **Settings (`/settings`)**: AI provider configuration, activity records, storage options, appearance settings, and system-level controls.

## AI Task Profiles

AetheL routes different AI tasks through different profiles instead of sharing one global completion configuration.

| Profile | Used For | Strategy |
|---------|----------|----------|
| `fast-json` | Categorization and follow-up | Low-latency structured JSON responses. |
| `section-draft` | PRD section generation | Medium-length section drafts, suitable for grouped generation. |
| `long-document` | Full document generation | Longer output with quality-first settings. |
| `snapshot-large` | Cognitive snapshot generation | 6000-token output budget, response cache disabled, strict schema validation. |
| `workshop-transform` | Creative Workshop skills | Structured transformation from raw input to candidate bubbles. |

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, Framer Motion.
- **Visualization**: HTML5 Canvas API for the high-performance bubble workspace.
- **Backend**: Express as the secure AI proxy and local workspace file API.
- **AI providers**: ModelScope, DeepSeek, and Moonshot through OpenAI-compatible chat completion APIs.
- **Persistence**: Markdown files under `data/bubbles` and `data/snapshots`, plus runtime workspace state in `data/workspace.json`.

## Getting Started

### Prerequisites

- Node.js 18 or later.
- At least one API key for ModelScope, DeepSeek, or Moonshot.

### Installation

```bash
git clone https://github.com/SuTang-vain/AetheL.git
cd AetheL
npm install
```

Create a `.env` file in the project root:

```env
MODELSCOPE_API_KEY=your_modelscope_key
DEEPSEEK_API_KEY=your_deepseek_key
MOONSHOT_API_KEY=your_moonshot_key

# Optional. If omitted, AetheL picks the first configured key in this order:
# modelscope -> deepseek -> moonshot
AI_PROVIDER=modelscope

PORT=3000
```

Start the development servers:

```bash
npm run dev
```

Open:

```text
http://localhost:5173/
```

The Express API runs on `http://localhost:3000/`, and Vite proxies `/api/*` requests to it.

## Useful Scripts

```bash
npm run check             # TypeScript type check
npm run lint              # ESLint
npm run build             # Production build
npm run test:integration  # API and integration tests
npm run test:ui           # UI flow tests
```

## Local Data Layout

```text
data/
├─ bubbles/       # One Markdown file per bubble
├─ snapshots/     # Semantic snapshot Markdown files
├─ .trash/        # Soft-deleted bubble and snapshot files
└─ workspace.json # Canvas layout, viewport, categories, relations, and runtime state
```

Runtime files under `data/` are local workspace state and should not be treated as source fixtures.

## License

MIT License
