"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  use,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Box,
  Maximize2,
  BookOpen,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import clsx from "clsx";
import NodePanel from "@/components/NodePanel";
import ChatPanel from "@/components/ChatPanel";
import QuizModal from "@/components/QuizModal";
import type {
  Classroom,
  GraphData,
  GraphNode,
  KnowledgeNode,
  KnowledgeEdge,
  ChatMessage,
  AgentResponse,
  Quiz,
} from "@/types";

// Dynamic import for MindMap (uses browser APIs)
const MindMap = dynamic(() => import("@/components/MindMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-bg flex items-center justify-center">
      <Loader2 size={24} className="text-text-muted animate-spin" />
    </div>
  ),
});

function buildGraphData(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[]
): GraphData {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      title: n.title,
      nodeType: n.nodeType as GraphNode["nodeType"],
      content: n.content,
      isRoot: n.isRoot,
      x: n.posX || undefined,
      y: n.posY || undefined,
      z: n.posZ || undefined,
    })),
    links: edges.map((e) => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      label: e.label,
    })),
  };
}

export default function ClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set());
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [nodePanelVisible, setNodePanelVisible] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Load classroom data
  useEffect(() => {
    fetchClassroom();
  }, [id]);

  const fetchClassroom = async () => {
    try {
      const res = await fetch(`/api/classrooms/${id}`);
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data: Classroom & {
        messages: ChatMessage[];
      } = await res.json();

      setClassroom(data);
      setGraphData(buildGraphData(data.nodes, data.edges));
      setChatMessages(
        (data.messages as ChatMessage[]).map((m) => ({
          ...m,
          role: m.role as "user" | "assistant",
        }))
      );
    } finally {
      setPageLoading(false);
    }
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNodeId(node.id);
    setNodePanelVisible(true);
  }, []);

  const handleCloseNodePanel = useCallback(() => {
    setNodePanelVisible(false);
    setSelectedNodeId(null);
  }, []);

  const selectedNode = classroom?.nodes.find((n) => n.id === selectedNodeId);

  const connectedNodeTitles = selectedNode
    ? classroom!.edges
        .filter(
          (e) =>
            e.sourceId === selectedNodeId || e.targetId === selectedNodeId
        )
        .map((e) => {
          const otherId =
            e.sourceId === selectedNodeId ? e.targetId : e.sourceId;
          return classroom!.nodes.find((n) => n.id === otherId)?.title ?? "";
        })
        .filter(Boolean)
    : [];

  const handleNodeUpdate = async (
    nodeId: string,
    title: string,
    content: string
  ) => {
    const res = await fetch(`/api/nodes/${nodeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    const updated = await res.json();

    setClassroom((prev) =>
      prev
        ? {
            ...prev,
            nodes: prev.nodes.map((n) =>
              n.id === nodeId ? { ...n, ...updated } : n
            ),
          }
        : prev
    );
    setGraphData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, title, content } : n
      ),
    }));
  };

  const handleGenerateQuiz = async (nodeId: string) => {
    setIsAgentLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroomId: id,
          message: `Generate a quiz for the node with ID: ${nodeId}. Use the generate_quiz tool.`,
          activeNodeId: nodeId,
        }),
      });
      const data: AgentResponse = await res.json();

      if (data.graphUpdates.generatedQuiz) {
        setActiveQuiz(data.graphUpdates.generatedQuiz);
      }

      await fetchClassroom();
    } finally {
      setIsAgentLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    // Optimistically add user message
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      classroomId: id,
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, optimisticMsg]);
    setIsAgentLoading(true);
    setLastResponse(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroomId: id,
          message,
          activeNodeId: selectedNodeId,
        }),
      });

      const data: AgentResponse = await res.json();
      setLastResponse(data);

      // Update graph with new nodes/edges
      if (
        data.graphUpdates.createdNodes.length > 0 ||
        data.graphUpdates.updatedNodes.length > 0 ||
        data.graphUpdates.createdEdges.length > 0
      ) {
        const newIds = new Set(data.graphUpdates.createdNodes.map((n) => n.id));
        setNewNodeIds(newIds);
        setTimeout(() => setNewNodeIds(new Set()), 5000);

        await fetchClassroom();
      } else {
        // Just update chat messages
        setChatMessages((prev) =>
          prev
            .filter((m) => m.id !== optimisticMsg.id)
            .concat([
              optimisticMsg,
              {
                id: `agent-${Date.now()}`,
                classroomId: id,
                role: "assistant" as const,
                content: data.message,
                createdAt: new Date().toISOString(),
              },
            ])
        );
      }

      if (data.graphUpdates.generatedQuiz) {
        setActiveQuiz(data.graphUpdates.generatedQuiz);
      }
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setIsAgentLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    const fullPrompt =
      selectedNode
        ? `${prompt} — focusing on "${selectedNode.title}"`
        : prompt;
    handleSendMessage(fullPrompt);
  };

  if (pageLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading classroom...</span>
        </div>
      </div>
    );
  }

  if (!classroom) return null;

  const chatHeight = chatCollapsed ? "40px" : "280px";
  const rightPanelOpen = nodePanelVisible && selectedNode;

  return (
    <div className="h-full flex flex-col bg-bg overflow-hidden">
      {/* Top bar */}
      <header className="h-10 shrink-0 border-b border-border flex items-center gap-3 px-3 bg-bg-secondary">
        <button
          onClick={() => router.push("/")}
          className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
        </button>

        <div className="h-4 w-px bg-border" />

        <BookOpen size={14} className="text-text-muted" />
        <span className="text-text-secondary text-xs">{classroom.subject}</span>
        <span className="text-border text-xs">/</span>
        <span className="text-text-primary text-xs font-medium truncate max-w-[200px]">
          {classroom.title}
        </span>

        <div className="flex-1" />

        {/* Node count */}
        <span className="text-text-muted text-xs">
          {graphData.nodes.length} nodes
        </span>

        <div className="h-4 w-px bg-border" />

        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 bg-bg-tertiary rounded-md p-0.5">
          <button
            onClick={() => setViewMode("2d")}
            className={clsx(
              "px-2 py-0.5 rounded text-xs transition-colors",
              viewMode === "2d"
                ? "bg-bg-secondary text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            2D
          </button>
          <button
            onClick={() => setViewMode("3d")}
            className={clsx(
              "flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors",
              viewMode === "3d"
                ? "bg-bg-secondary text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Box size={10} />
            3D
          </button>
        </div>

        <button
          className="p-1.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-colors"
          title="Toggle fullscreen"
          onClick={() => document.documentElement.requestFullscreen?.()}
        >
          <Maximize2 size={13} />
        </button>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Mindmap */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Graph area */}
          <div
            className="flex-1 relative overflow-hidden"
            style={{ minHeight: 0 }}
          >
            <MindMap
              graphData={graphData}
              selectedNodeId={selectedNodeId}
              onNodeClick={handleNodeClick}
              viewMode={viewMode}
              newNodeIds={newNodeIds}
            />
          </div>

          {/* Chat panel (collapsible) */}
          <div
            className="shrink-0 border-t border-border flex flex-col transition-all duration-300 overflow-hidden"
            style={{ height: chatHeight }}
          >
            {/* Chat toggle bar */}
            <div
              className="h-10 flex items-center justify-between px-3 cursor-pointer hover:bg-bg-secondary/50 transition-colors"
              onClick={() => setChatCollapsed((c) => !c)}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={13} className="text-text-secondary" />
                <span className="text-xs text-text-secondary font-medium">
                  Chat with AI Tutor
                </span>
                {isAgentLoading && (
                  <Loader2
                    size={11}
                    className="text-accent-blue animate-spin"
                  />
                )}
              </div>
              <button className="text-text-muted hover:text-text-secondary transition-colors">
                {chatCollapsed ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>
            </div>

            {!chatCollapsed && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatPanel
                  messages={chatMessages}
                  isLoading={isAgentLoading}
                  activeNodeTitle={selectedNode?.title}
                  lastResponse={lastResponse}
                  onSend={handleSendMessage}
                  onQuickAction={handleQuickAction}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Node detail panel */}
        {rightPanelOpen && selectedNode && (
          <div className="w-72 shrink-0 overflow-hidden flex flex-col">
            <NodePanel
              node={selectedNode}
              onClose={handleCloseNodePanel}
              onUpdate={handleNodeUpdate}
              onGenerateQuiz={handleGenerateQuiz}
              connectedNodeTitles={connectedNodeTitles}
            />
          </div>
        )}
      </div>

      {/* Quiz modal */}
      {activeQuiz && (
        <QuizModal quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />
      )}
    </div>
  );
}
