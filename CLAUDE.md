# Teacher Agent — Classroom AI

An educational web app with an AI tutor and interactive knowledge mindmap.

## Stack
- Next.js 16 (App Router, Turbopack) + TypeScript
- Prisma + SQLite (`prisma/dev.db`)
- Anthropic Claude API (agent with tool use)
- react-force-graph (2D/3D visualization)
- Tailwind CSS (dark theme)

## Dev commands
```bash
npm run dev          # start dev server on :3000
npm run build        # production build
npm run db:push      # sync schema to SQLite (run after schema changes)
npm run db:studio    # open Prisma Studio
```

## Env setup
Copy `.env.example` → `.env.local` and set:
```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL="file:./dev.db"
```

## Architecture
- `src/lib/agent.ts` — Claude agent with 6 tools (create_node, update_node, create_edge, get_node_content, search_nodes, generate_quiz)
- `src/lib/context-builder.ts` — builds knowledge graph context for the agent
- `src/app/api/agent/route.ts` — agent API endpoint
- `src/components/MindMap.tsx` — 2D/3D force graph (dynamic import, SSR disabled)
- `src/app/classroom/[id]/page.tsx` — main classroom page

## Node types
root, concept, example, definition, summary, deep_dive, quiz

## Notes
- Node PATH requires `/c/Program Files/nodejs` — Node.js was installed via winget
- react-force-graph callbacks must use `object` parameter type and cast to internal types (TypeScript incompatibility)
