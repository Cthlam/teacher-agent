# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Teacher Agent — Classroom AI

An educational web app where a Claude AI tutor dynamically builds a knowledge graph (mindmap) as students learn. Knowledge is organized as interconnected nodes rather than linear chat.

## Stack
- Next.js 16 (App Router, Turbopack) + TypeScript (strict mode, `@/*` → `src/*`)
- Prisma + SQLite (`prisma/dev.db`)
- Anthropic Claude API — `claude-sonnet-4-6` for agent loop, `claude-haiku-4-5-20251001` for quiz generation
- react-force-graph (2D/3D canvas visualization, dynamic import, SSR disabled)
- Tailwind CSS (dark theme, custom colors: `#0d1117` bg, `#4f8ef7` accent)

## Dev commands
```bash
npm run dev          # start dev server on :3000
npm run build        # production build
npm run db:push      # sync schema to SQLite (run after schema changes)
npm run db:studio    # open Prisma Studio
```

No test runner or linter is configured.

## Env setup
Copy `.env.example` → `.env.local` and set:
```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL="file:./dev.db"
```

## Architecture

### Agentic loop (`src/lib/agent.ts`)
Runs an autonomous tool-use loop (max 10 iterations) with these tools:
`create_node`, `update_node`, `create_edge`, `get_node_content`, `search_nodes`, `generate_quiz`

Context fed to the agent is built by `src/lib/context-builder.ts`, which sends only:
- Last 20 chat messages
- The currently selected node (full content)
- Up to 8 nearest neighbor nodes (title + preview)
- All node titles for reference

Quiz generation is a separate Claude API call inside `executeToolCall` (not part of the main agent loop) to ensure reliable JSON parsing.

### Data models (`prisma/schema.prisma`)
- **Classroom** — container with `title`, `subject`, `description`; cascade-deletes all children
- **Node** — `title`, `content` (markdown), `nodeType`, 3D position (`posX/Y/Z`), `isRoot`
- **Edge** — relationship between two nodes with optional `label`
- **ChatMessage** — `role` (user/assistant), `content`
- **Quiz** — linked to a node; `questions` stored as JSON string, parsed on load

Node types: `root`, `concept`, `example`, `definition`, `summary`, `deep_dive`, `quiz`

Prisma client is a singleton (`src/lib/db.ts`) to prevent connection pooling issues.

### API routes
```
POST   /api/agent              — run agent (body: message, classroomId, activeNodeId)
GET    /api/classrooms         — list all
POST   /api/classrooms         — create
GET    /api/classrooms/[id]    — get with full graph
DELETE /api/classrooms/[id]    — delete
GET    /api/nodes/[id]         — get node with edges
PUT    /api/nodes/[id]         — update (title, content, position)
DELETE /api/nodes/[id]         — delete
DELETE /api/edges              — delete by ID (query param)
```

### Frontend components
- `src/app/classroom/[id]/page.tsx` — main classroom page; orchestrates state for selected node, chat, quiz modal, graph data
- `src/components/MindMap.tsx` — 2D/3D force graph; uses `dynamic` import with `ssr: false`; new nodes glow for 5s via `newNodeIds` Set
- Chat panel — collapsible bottom drawer; optimistic message add (removed on failure)
- NodePanel — right slide-out; markdown viewer + inline editor
- QuizModal — full-screen overlay with question carousel

## Non-obvious patterns & gotchas
- **react-force-graph TypeScript**: callbacks must use `object` parameter type and cast internally (library types are incompatible)
- **Graph layout**: new nodes placed randomly in a circle around origin; first node at (0, 0)
- **No ESLint/Prettier**: no formatter is configured — match existing style manually
- **Node PATH**: requires `/c/Program Files/nodejs` — Node.js was installed via winget on Windows
