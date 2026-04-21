import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db";
import { buildClassroomContext, formatContextForPrompt } from "./context-builder";
import type {
  AgentMode,
  AgentResponse,
  KnowledgeNode,
  KnowledgeEdge,
  Quiz,
  QuizQuestion,
} from "@/types";

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_AGENT_MODEL = process.env.OLLAMA_AGENT_MODEL || "qwen3:14b";
const OLLAMA_QUIZ_MODEL = process.env.OLLAMA_QUIZ_MODEL || OLLAMA_AGENT_MODEL;
const CLAUDE_AGENT_MODEL = process.env.CLAUDE_AGENT_MODEL || "claude-sonnet-4-6";
const CLAUDE_QUIZ_MODEL =
  process.env.CLAUDE_QUIZ_MODEL || "claude-haiku-4-5-20251001";

interface AgentTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const AGENT_TOOLS: AgentTool[] = [
  {
    name: "create_node",
    description:
      "Create a new knowledge node in the mindmap. Use this to add a new concept, definition, example, summary, or deep-dive topic to the learning graph. Always create nodes when explaining a new concept or when the user asks to explore something new.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short, clear title for the node (3-8 words)",
        },
        content: {
          type: "string",
          description:
            "Rich markdown content explaining the topic. Use headings, bullet points, code blocks, and LaTeX math ($$...$$) where appropriate. Be thorough.",
        },
        node_type: {
          type: "string",
          enum: [
            "concept",
            "example",
            "definition",
            "summary",
            "deep_dive",
            "root",
          ],
          description: "Type of knowledge node",
        },
        parent_node_id: {
          type: "string",
          description:
            "ID of the parent/related node to link to. Omit for standalone nodes.",
        },
        edge_label: {
          type: "string",
          description:
            "Label for the relationship edge (e.g. 'is a type of', 'includes', 'leads to')",
        },
      },
      required: ["title", "content", "node_type"],
    },
  },
  {
    name: "update_node",
    description:
      "Update the content of an existing knowledge node. Use this to enrich or correct existing nodes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        node_id: {
          type: "string",
          description: "ID of the node to update",
        },
        title: {
          type: "string",
          description: "New title (optional)",
        },
        content: {
          type: "string",
          description: "New markdown content (optional)",
        },
      },
      required: ["node_id"],
    },
  },
  {
    name: "create_edge",
    description:
      "Create a link between two existing nodes to show their relationship.",
    inputSchema: {
      type: "object" as const,
      properties: {
        source_id: {
          type: "string",
          description: "ID of the source node",
        },
        target_id: {
          type: "string",
          description: "ID of the target node",
        },
        label: {
          type: "string",
          description: "Relationship label",
        },
      },
      required: ["source_id", "target_id"],
    },
  },
  {
    name: "get_node_content",
    description: "Retrieve the full content of a specific node by its ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        node_id: {
          type: "string",
          description: "ID of the node to retrieve",
        },
      },
      required: ["node_id"],
    },
  },
  {
    name: "search_nodes",
    description: "Search for existing nodes by title or content keywords.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        classroom_id: {
          type: "string",
          description: "Classroom ID to search within",
        },
      },
      required: ["query", "classroom_id"],
    },
  },
  {
    name: "generate_quiz",
    description:
      "Generate a multiple-choice quiz to test the user's understanding of a node's content.",
    inputSchema: {
      type: "object" as const,
      properties: {
        node_id: {
          type: "string",
          description: "ID of the node to create a quiz for",
        },
        num_questions: {
          type: "number",
          description: "Number of quiz questions (default: 5, max: 10)",
        },
        difficulty: {
          type: "string",
          enum: ["easy", "medium", "hard"],
          description: "Quiz difficulty level",
        },
      },
      required: ["node_id"],
    },
  },
];

interface ToolInput {
  title?: string;
  content?: string;
  node_type?: string;
  parent_node_id?: string;
  edge_label?: string;
  node_id?: string;
  source_id?: string;
  target_id?: string;
  label?: string;
  query?: string;
  classroom_id?: string;
  num_questions?: number;
  difficulty?: string;
}

interface ToolExecutionState {
  mode: AgentMode;
  classroomId: string;
}

async function generateQuizWithClaude(
  title: string,
  content: string,
  numQuestions: number,
  difficulty: string
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Premium mode requires ANTHROPIC_API_KEY. Set it in your environment."
    );
  }

  const quizResponse = await anthropicClient.messages.create({
    model: CLAUDE_QUIZ_MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Generate a ${difficulty} multiple-choice quiz with ${Math.min(numQuestions, 10)} questions about the following content.

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this is correct"
    }
  ]
}

Content to quiz about:
Title: ${title}
${content}`,
      },
    ],
  });

  return quizResponse.content[0].type === "text" ? quizResponse.content[0].text : "";
}

function buildOllamaQuizPrompt(
  title: string,
  content: string,
  numQuestions: number,
  difficulty: string
): string {
  return `Generate a ${difficulty} multiple-choice quiz with ${Math.min(numQuestions, 10)} questions about the following content.

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this is correct"
    }
  ]
}

Content to quiz about:
Title: ${title}
${content}`;
}

async function generateQuizWithOllama(
  title: string,
  content: string,
  numQuestions: number,
  difficulty: string
): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_QUIZ_MODEL,
      stream: false,
      format: "json",
      messages: [
        {
          role: "user",
          content: buildOllamaQuizPrompt(title, content, numQuestions, difficulty),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama quiz request failed: ${errorText}`);
  }

  const payload = (await response.json()) as {
    message?: { content?: string };
  };

  return payload.message?.content || "";
}

async function generateQuiz(
  title: string,
  content: string,
  numQuestions: number,
  difficulty: string,
  mode: AgentMode
): Promise<string> {
  if (mode === "premium") {
    return generateQuizWithClaude(title, content, numQuestions, difficulty);
  }
  return generateQuizWithOllama(title, content, numQuestions, difficulty);
}

async function executeToolCall(
  toolName: string,
  toolInput: ToolInput,
  state: ToolExecutionState
): Promise<{
  result: string;
  createdNode?: KnowledgeNode;
  updatedNode?: KnowledgeNode;
  createdEdge?: KnowledgeEdge;
  generatedQuiz?: Quiz;
}> {
  const { classroomId, mode } = state;
  switch (toolName) {
    case "create_node": {
      const { title, content, node_type, parent_node_id, edge_label } =
        toolInput;

      const existingNodes = await prisma.node.findMany({
        where: { classroomId },
      });
      const isFirst = existingNodes.length === 0;

      const angle = Math.random() * Math.PI * 2;
      const radius = 200 + Math.random() * 300;
      const posX = Math.cos(angle) * radius;
      const posY = Math.sin(angle) * radius;

      const node = await prisma.node.create({
        data: {
          classroomId,
          title: title!,
          content: content!,
          nodeType: node_type || "concept",
          posX: isFirst ? 0 : posX,
          posY: isFirst ? 0 : posY,
          posZ: 0,
          isRoot: isFirst,
        },
      });

      let createdEdge: KnowledgeEdge | undefined;
      if (parent_node_id) {
        const parentExists = await prisma.node.findUnique({
          where: { id: parent_node_id },
        });
        if (parentExists) {
          const edge = await prisma.edge.create({
            data: {
              classroomId,
              sourceId: parent_node_id,
              targetId: node.id,
              label: edge_label || null,
            },
          });
          createdEdge = edge as unknown as KnowledgeEdge;
        }
      }

      return {
        result: `Created node "${title}" with ID: ${node.id}${createdEdge ? ` and linked to parent ${parent_node_id}` : ""}`,
        createdNode: node as unknown as KnowledgeNode,
        createdEdge,
      };
    }

    case "update_node": {
      const { node_id, title, content } = toolInput;
      const updateData: Record<string, string> = {};
      if (title) updateData.title = title;
      if (content) updateData.content = content;

      const node = await prisma.node.update({
        where: { id: node_id! },
        data: updateData,
      });

      return {
        result: `Updated node "${node.title}"`,
        updatedNode: node as unknown as KnowledgeNode,
      };
    }

    case "create_edge": {
      const { source_id, target_id, label } = toolInput;

      const existing = await prisma.edge.findFirst({
        where: {
          OR: [
            { sourceId: source_id!, targetId: target_id! },
            { sourceId: target_id!, targetId: source_id! },
          ],
        },
      });
      if (existing) {
        return { result: "Edge already exists between these nodes" };
      }

      const edge = await prisma.edge.create({
        data: {
          classroomId,
          sourceId: source_id!,
          targetId: target_id!,
          label: label || null,
        },
      });

      return {
        result: `Created edge from ${source_id} to ${target_id}`,
        createdEdge: edge as unknown as KnowledgeEdge,
      };
    }

    case "get_node_content": {
      const { node_id } = toolInput;
      const node = await prisma.node.findUnique({ where: { id: node_id! } });
      if (!node) return { result: `Node ${node_id} not found` };

      return {
        result: `Node: "${node.title}"\nType: ${node.nodeType}\n\n${node.content}`,
      };
    }

    case "search_nodes": {
      const { query, classroom_id } = toolInput;
      const nodes = await prisma.node.findMany({
        where: {
          classroomId: classroom_id || classroomId,
          OR: [{ title: { contains: query! } }, { content: { contains: query! } }],
        },
        take: 10,
      });

      if (nodes.length === 0) {
        return { result: `No nodes found matching "${query}"` };
      }

      const summary = nodes
        .map((n) => `- [${n.id}] ${n.title} (${n.nodeType})`)
        .join("\n");
      return { result: `Found ${nodes.length} nodes:\n${summary}` };
    }

    case "generate_quiz": {
      const { node_id, num_questions = 5, difficulty = "medium" } = toolInput;
      const node = await prisma.node.findUnique({ where: { id: node_id! } });
      if (!node) return { result: `Node ${node_id} not found` };

      const rawText = await generateQuiz(
        node.title,
        node.content,
        num_questions,
        difficulty,
        mode
      );

      let quizData: { title: string; questions: QuizQuestion[] };
      try {
        quizData = JSON.parse(rawText);
      } catch {
        return { result: "Failed to generate quiz" };
      }

      const quiz = await prisma.quiz.create({
        data: {
          classroomId,
          nodeId: node_id,
          title: quizData.title,
          questions: JSON.stringify(quizData.questions),
        },
      });

      return {
        result: `Generated quiz "${quizData.title}" with ${quizData.questions.length} questions`,
        generatedQuiz: {
          ...quiz,
          questions: quizData.questions,
          createdAt: quiz.createdAt.toISOString(),
        } as Quiz,
      };
    }

    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}

const SYSTEM_PROMPT = `You are an expert AI tutor helping a student learn deeply about their chosen subject. You have access to an interactive knowledge mindmap that you can build and expand as the conversation progresses.

## Your Role
- Explain concepts clearly, building from foundations to advanced topics
- Create knowledge nodes in the mindmap to organize what you teach
- Link related concepts together so the student can see how ideas connect
- Generate quizzes to help the student practice and retain knowledge
- Match the depth of explanation to what the student asks — surface level overviews OR deep technical dives

## Mindmap Strategy
- **Always create nodes** when introducing a new concept, not just answering in chat
- Make nodes **self-contained** — they should be useful standalone references
- Use rich markdown: headers, bullet lists, code blocks, LaTeX math ($$...$$), tables
- Link nodes meaningfully: "is a type of", "requires understanding of", "leads to", "is an example of"
- Build the graph organically — don't create too many nodes at once, focus on what's most relevant

## Node Types
- **root**: The main subject being studied
- **concept**: A key idea or principle
- **definition**: Formal definition of a term
- **example**: A concrete example or case study
- **deep_dive**: Advanced exploration of a subtopic
- **summary**: Overview/recap of multiple concepts

## Context
The classroom context below shows what's already in the knowledge graph. Reference existing nodes by their IDs rather than duplicating content.`;

interface ClaudeAgentContentBlock {
  type: "text" | "tool_use";
  id?: string;
  name?: string;
  text?: string;
  input?: unknown;
}

interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown> | string;
  };
}

interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OllamaToolCall[];
}

async function runPremiumAgentLoop(
  systemWithContext: string,
  messages: Anthropic.MessageParam[],
  state: ToolExecutionState
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Premium mode requires ANTHROPIC_API_KEY. Set it in your environment."
    );
  }

  const createdNodes: KnowledgeNode[] = [];
  const updatedNodes: KnowledgeNode[] = [];
  const createdEdges: KnowledgeEdge[] = [];
  let generatedQuiz: Quiz | undefined;
  let finalText = "";

  let currentMessages = [...messages];
  let continueLoop = true;
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (continueLoop && iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await anthropicClient.messages.create({
      model: CLAUDE_AGENT_MODEL,
      max_tokens: 4096,
      system: systemWithContext,
      tools: AGENT_TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
      })),
      messages: currentMessages,
    });

    if (
      response.stop_reason === "end_turn" ||
      response.stop_reason === "stop_sequence"
    ) {
      finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      continueLoop = false;
    } else if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        const toolResult = await executeToolCall(
          block.name,
          block.input as ToolInput,
          state
        );

        if (toolResult.createdNode) createdNodes.push(toolResult.createdNode);
        if (toolResult.updatedNode) updatedNodes.push(toolResult.updatedNode);
        if (toolResult.createdEdge) createdEdges.push(toolResult.createdEdge);
        if (toolResult.generatedQuiz) generatedQuiz = toolResult.generatedQuiz;

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: toolResult.result,
        });
      }

      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
    } else {
      continueLoop = false;
    }
  }

  return {
    message: finalText,
    graphUpdates: {
      createdNodes,
      updatedNodes,
      createdEdges,
      generatedQuiz,
    },
  } as AgentResponse;
}

function parseOllamaToolInput(input: Record<string, unknown> | string): ToolInput {
  if (typeof input === "string") {
    try {
      return JSON.parse(input) as ToolInput;
    } catch {
      return {};
    }
  }
  return input as ToolInput;
}

async function runLocalAgentLoop(
  systemWithContext: string,
  messages: Anthropic.MessageParam[],
  state: ToolExecutionState
) {
  const createdNodes: KnowledgeNode[] = [];
  const updatedNodes: KnowledgeNode[] = [];
  const createdEdges: KnowledgeEdge[] = [];
  let generatedQuiz: Quiz | undefined;
  let finalText = "";

  const currentMessages: OllamaMessage[] = [
    { role: "system", content: systemWithContext },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    })),
  ];

  let continueLoop = true;
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (continueLoop && iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_AGENT_MODEL,
        stream: false,
        messages: currentMessages,
        tools: AGENT_TOOLS.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama agent request failed: ${errorText}`);
    }

    const payload = (await response.json()) as {
      message?: {
        content?: string;
        tool_calls?: OllamaToolCall[];
      };
    };

    const assistantMessage = payload.message;
    if (!assistantMessage) break;

    const assistantText = assistantMessage.content || "";
    const toolCalls = assistantMessage.tool_calls || [];

    currentMessages.push({
      role: "assistant",
      content: assistantText,
      tool_calls: toolCalls,
    });

    if (toolCalls.length === 0) {
      finalText = assistantText;
      continueLoop = false;
      continue;
    }

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      const toolInput = parseOllamaToolInput(toolCall.function.arguments);
      const toolResult = await executeToolCall(toolName, toolInput, state);

      if (toolResult.createdNode) createdNodes.push(toolResult.createdNode);
      if (toolResult.updatedNode) updatedNodes.push(toolResult.updatedNode);
      if (toolResult.createdEdge) createdEdges.push(toolResult.createdEdge);
      if (toolResult.generatedQuiz) generatedQuiz = toolResult.generatedQuiz;

      currentMessages.push({
        role: "tool",
        content: toolResult.result,
      });
    }
  }

  return {
    message: finalText,
    graphUpdates: {
      createdNodes,
      updatedNodes,
      createdEdges,
      generatedQuiz,
    },
  } as AgentResponse;
}

export async function runAgent(
  classroomId: string,
  userMessage: string,
  activeNodeId?: string | null,
  mode: AgentMode = "local"
): Promise<AgentResponse> {
  const ctx = await buildClassroomContext(classroomId, activeNodeId);
  const contextStr = formatContextForPrompt(ctx);

  const history = await prisma.chatMessage.findMany({
    where: { classroomId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  await prisma.chatMessage.create({
    data: { classroomId, role: "user", content: userMessage },
  });

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const systemWithContext = `${SYSTEM_PROMPT}\n\n---\n\n## Current Knowledge Graph Context\n${contextStr}`;
  const state: ToolExecutionState = { mode, classroomId };

  const result =
    mode === "premium"
      ? await runPremiumAgentLoop(systemWithContext, messages, state)
      : await runLocalAgentLoop(systemWithContext, messages, state);

  if (result.message) {
    await prisma.chatMessage.create({
      data: { classroomId, role: "assistant", content: result.message },
    });
  }

  return result;
}
