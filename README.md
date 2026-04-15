# Classroom AI

An AI-powered interactive learning application where knowledge is organized as a dynamic, growing mindmap instead of a linear chat. Ask your AI tutor anything — it builds a structured knowledge graph as you learn, lets you drill down as deep as you want, and quizzes you to reinforce understanding.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Anthropic](https://img.shields.io/badge/Claude-Sonnet_4.6-orange?logo=anthropic)
![License](https://img.shields.io/badge/license-MIT-green)

---

## How It Works

Each learning session is called a **classroom**. Instead of scrolling through a long chat history, everything you learn is organized as a **knowledge graph** — a network of interconnected nodes, each a focused markdown document on one specific concept.

As you chat with the AI tutor, it automatically:
- Creates new nodes for concepts it introduces
- Links related nodes together (like wiki cross-links)
- Enriches existing nodes with deeper detail when you ask follow-up questions
- Generates quizzes so you can test your retention

You control the depth. Ask for a surface overview or push the agent to go deep — it responds by expanding the graph accordingly.

---

## Core Features

### Interactive 2D / 3D Mindmap
The knowledge graph is rendered as a physics-based force graph using [react-force-graph](https://github.com/vasturiano/react-force-graph). Switch between 2D (canvas) and 3D (WebGL) views in the toolbar. Nodes are color-coded by type and newly created nodes glow to draw attention.

| Node Type | Color | Purpose |
|-----------|-------|---------|
| Root | Gold | The central subject of the classroom |
| Concept | Blue | A key idea or principle |
| Definition | Purple | Formal definition of a term |
| Example | Green | Concrete example or case study |
| Deep Dive | Red | Advanced exploration of a subtopic |
| Summary | Orange | Overview / recap |

### Agentic AI Tutor
The tutor is powered by **Claude Sonnet 4.6** running an agentic tool-use loop. It has six tools it can call autonomously during a single response:

| Tool | What it does |
|------|-------------|
| `create_node` | Adds a new node to the mindmap with rich markdown content |
| `update_node` | Enriches or corrects an existing node |
| `create_edge` | Links two nodes to show their relationship |
| `get_node_content` | Reads a node's full content for reference |
| `search_nodes` | Finds existing nodes to avoid duplication |
| `generate_quiz` | Creates a multiple-choice quiz for any node |

### Smart Context Management
Rather than loading the entire graph into every prompt, the agent receives only the **currently selected node** and its **immediate neighbors**. This keeps the context window focused and cost-efficient while still giving the agent full spatial awareness of the graph.

### Node Detail Panel
Click any node to open a side panel showing the full markdown content. You can:
- Read the rendered markdown (with tables, code blocks, math, etc.)
- Edit the content inline
- See which other nodes it connects to
- Trigger quiz generation for that specific node

### Interactive Quizzes
The agent uses **Claude Haiku 4.5** (fast and cheap) to generate multiple-choice quizzes. Each quiz:
- Presents questions one at a time
- Shows instant feedback with explanations
- Tracks score and shows a results screen

### Chat Panel
A collapsible chat panel sits at the bottom of the screen with quick-prompt shortcuts (e.g. "Explain with examples", "Go deeper", "Quiz me"). The chat context carries the full message history so the agent always knows where the conversation left off.

---

## Getting Started

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
git clone https://github.com/Cthlam/teacher-agent.git
cd teacher-agent
npm install
```

### Environment setup

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your key:

```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL="file:./dev.db"
```

### Database setup

```bash
npm run db:push
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                     # Home — list and create classrooms
│   ├── classroom/[id]/page.tsx      # Classroom view (mindmap + chat + node panel)
│   └── api/
│       ├── agent/route.ts           # POST /api/agent — runs the Claude agent loop
│       ├── classrooms/route.ts      # GET / POST classrooms
│       ├── classrooms/[id]/route.ts # GET / DELETE a classroom
│       ├── nodes/[id]/route.ts      # GET / PUT / DELETE a node
│       └── edges/route.ts           # DELETE an edge
├── components/
│   ├── MindMap.tsx                  # 2D/3D force graph (dynamic import, SSR off)
│   ├── NodePanel.tsx                # Right panel: markdown viewer + editor
│   ├── ChatPanel.tsx                # Bottom panel: chat interface
│   └── QuizModal.tsx                # Full-screen quiz overlay
├── lib/
│   ├── agent.ts                     # Claude agent — tool definitions + agentic loop
│   ├── context-builder.ts           # Builds focused node context for each prompt
│   └── db.ts                        # Prisma client singleton
└── types/
    └── index.ts                     # Shared TypeScript types
prisma/
└── schema.prisma                    # SQLite schema (Classroom, Node, Edge, ChatMessage, Quiz)
```

---

## Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| [next](https://nextjs.org/) | ^16 | React framework (App Router, Turbopack) |
| [react](https://react.dev/) | ^19 | UI library |
| [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) | ^0.39 | Claude API client |
| [@prisma/client](https://www.prisma.io/) | ^6 | Type-safe SQLite ORM |
| [react-force-graph](https://github.com/vasturiano/react-force-graph) | ^1.47 | 2D/3D force-directed graph renderer |
| [three](https://threejs.org/) | ^0.171 | WebGL engine (required by react-force-graph 3D) |
| [react-markdown](https://github.com/remarkjs/react-markdown) | ^9 | Markdown rendering |
| [remark-gfm](https://github.com/remarkjs/remark-gfm) | ^4 | GitHub Flavored Markdown (tables, strikethrough) |
| [rehype-highlight](https://github.com/rehypejs/rehype-highlight) | ^7 | Syntax highlighting in code blocks |
| [lucide-react](https://lucide.dev/) | ^0.469 | Icon set |
| [clsx](https://github.com/lukeed/clsx) | ^2 | Conditional class name utility |
| [uuid](https://github.com/uuidjs/uuid) | ^11 | Unique ID generation |

### Dev / Build

| Package | Version | Purpose |
|---------|---------|---------|
| [prisma](https://www.prisma.io/) | ^6 | Schema management + migrations |
| [typescript](https://www.typescriptlang.org/) | ^5 | Type checking |
| [tailwindcss](https://tailwindcss.com/) | ^3 | Utility-first CSS |
| [autoprefixer](https://github.com/postcss/autoprefixer) | ^10 | CSS vendor prefixing |
| [postcss](https://postcss.org/) | ^8 | CSS transformation pipeline |

---

## Available Scripts

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run start        # Serve production build
npm run db:push      # Sync Prisma schema to SQLite (run after schema changes)
npm run db:generate  # Regenerate Prisma client types
npm run db:studio    # Open Prisma Studio (visual DB browser)
```

---

## License

MIT
