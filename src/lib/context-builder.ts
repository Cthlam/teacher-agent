import { prisma } from "./db";
import type { KnowledgeNode, KnowledgeEdge } from "@/types";

export interface ClassroomContext {
  subject: string;
  title: string;
  allNodes: KnowledgeNode[];
  allEdges: KnowledgeEdge[];
  activeNode?: KnowledgeNode | null;
  neighborNodes: KnowledgeNode[];
  recentNodes: KnowledgeNode[];
}

export async function buildClassroomContext(
  classroomId: string,
  activeNodeId?: string | null
): Promise<ClassroomContext> {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    include: {
      nodes: { orderBy: { updatedAt: "desc" } },
      edges: true,
    },
  });

  if (!classroom) {
    throw new Error(`Classroom ${classroomId} not found`);
  }

  const allNodes = classroom.nodes as unknown as KnowledgeNode[];
  const allEdges = classroom.edges as unknown as KnowledgeEdge[];

  let activeNode: KnowledgeNode | null = null;
  let neighborNodes: KnowledgeNode[] = [];

  if (activeNodeId) {
    activeNode = allNodes.find((n) => n.id === activeNodeId) ?? null;

    if (activeNode) {
      const connectedEdges = allEdges.filter(
        (e) => e.sourceId === activeNodeId || e.targetId === activeNodeId
      );
      const neighborIds = new Set<string>();
      for (const edge of connectedEdges) {
        if (edge.sourceId !== activeNodeId) neighborIds.add(edge.sourceId);
        if (edge.targetId !== activeNodeId) neighborIds.add(edge.targetId);
      }
      neighborNodes = allNodes.filter((n) => neighborIds.has(n.id));
    }
  }

  const recentNodes = allNodes.slice(0, 8);

  return {
    subject: classroom.subject,
    title: classroom.title,
    allNodes,
    allEdges,
    activeNode,
    neighborNodes,
    recentNodes,
  };
}

export function formatContextForPrompt(ctx: ClassroomContext): string {
  const lines: string[] = [];

  lines.push(`## Classroom: "${ctx.title}" — Subject: ${ctx.subject}`);
  lines.push(`Total nodes in knowledge graph: ${ctx.allNodes.length}`);
  lines.push("");

  if (ctx.activeNode) {
    lines.push(`### Currently Viewing Node`);
    lines.push(`**ID:** ${ctx.activeNode.id}`);
    lines.push(`**Title:** ${ctx.activeNode.title}`);
    lines.push(`**Type:** ${ctx.activeNode.nodeType}`);
    lines.push(`**Content:**`);
    lines.push(ctx.activeNode.content);
    lines.push("");

    if (ctx.neighborNodes.length > 0) {
      lines.push(`### Connected Nodes (${ctx.neighborNodes.length})`);
      for (const node of ctx.neighborNodes) {
        lines.push(`- **[${node.id}] ${node.title}** (${node.nodeType})`);
        // Show first 200 chars of neighbor content for context
        const preview = node.content.slice(0, 200);
        lines.push(`  ${preview}${node.content.length > 200 ? "..." : ""}`);
      }
      lines.push("");
    }
  }

  // Always show a map of all node titles so the agent knows what exists
  if (ctx.allNodes.length > 0) {
    lines.push(`### All Nodes in Graph`);
    for (const node of ctx.allNodes) {
      const edgeCount =
        ctx.allEdges.filter(
          (e) => e.sourceId === node.id || e.targetId === node.id
        ).length;
      lines.push(
        `- [${node.id}] **${node.title}** (${node.nodeType}, ${edgeCount} connections)`
      );
    }
  }

  return lines.join("\n");
}
