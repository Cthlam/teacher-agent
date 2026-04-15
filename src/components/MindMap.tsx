"use client";

import React, {
  useCallback,
  useRef,
  useEffect,
  useState,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import type { GraphData, GraphNode, GraphLink, NodeType } from "@/types";

// Dynamic imports — react-force-graph needs browser APIs
const ForceGraph2D = dynamic(
  () => import("react-force-graph").then((m) => m.ForceGraph2D),
  { ssr: false }
);
const ForceGraph3D = dynamic(
  () => import("react-force-graph").then((m) => m.ForceGraph3D),
  { ssr: false }
);

const NODE_COLORS: Record<NodeType, string> = {
  root: "#ffd700",
  concept: "#4f8ef7",
  example: "#4caf50",
  definition: "#9c27b0",
  summary: "#ff9800",
  deep_dive: "#f44336",
  quiz: "#00bcd4",
};

const NODE_LABELS: Record<NodeType, string> = {
  root: "Root",
  concept: "Concept",
  example: "Example",
  definition: "Definition",
  summary: "Summary",
  deep_dive: "Deep Dive",
  quiz: "Quiz",
};

interface MindMapProps {
  graphData: GraphData;
  selectedNodeId: string | null;
  onNodeClick: (node: GraphNode) => void;
  viewMode: "2d" | "3d";
  newNodeIds?: Set<string>;
}

export default function MindMap({
  graphData,
  selectedNodeId,
  onNodeClick,
  viewMode,
  newNodeIds = new Set(),
}: MindMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const paintNode2D = useCallback(
    (nodeObj: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = nodeObj as GraphNode;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const isSelected = node.id === selectedNodeId;
      const isNew = newNodeIds.has(node.id);
      const color = NODE_COLORS[node.nodeType] ?? NODE_COLORS.concept;
      const size = node.isRoot ? 10 : 7;

      // Glow for selected or new nodes
      if (isSelected || isNew) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20 / globalScale;
      } else {
        ctx.shadowBlur = 0;
      }

      // Draw node circle
      ctx.beginPath();
      ctx.arc(x, y, size / globalScale, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected
        ? color
        : `${color}cc`;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Draw label
      const fontSize = Math.max(8, 12 / globalScale);
      ctx.font = `${node.isRoot ? "bold " : ""}${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isSelected ? "#ffffff" : "#c9d1d9";
      ctx.fillText(node.title, x, y + size / globalScale + 2 / globalScale);
    },
    [selectedNodeId, newNodeIds]
  );

  const getNodeColor3D = useCallback(
    (nodeObj: object) => {
      const node = nodeObj as GraphNode;
      return NODE_COLORS[node.nodeType] ?? NODE_COLORS.concept;
    },
    []
  );

  // Stable graphData to avoid re-renders
  const stableData = useMemo(
    () => ({
      nodes: graphData.nodes,
      links: graphData.links,
    }),
    [graphData.nodes, graphData.links]
  );

  if (!mounted) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full bg-bg flex items-center justify-center"
      >
        <div className="text-text-secondary text-sm">Loading mindmap...</div>
      </div>
    );
  }

  // Using eslint-disable to avoid react-force-graph generic type conflicts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commonProps: Record<string, any> = {
    graphData: stableData,
    width: dimensions.width,
    height: dimensions.height,
    backgroundColor: "#0d1117",
    linkColor: () => "#30363d",
    linkWidth: 1.5,
    linkDirectionalArrowLength: 4,
    linkDirectionalArrowRelPos: 1,
    linkLabel: (link: GraphLink) => link.label ?? "",
    onNodeClick: (node: object) => onNodeClick(node as GraphNode),
    nodeLabel: (node: object) => {
      const n = node as GraphNode;
      return `${n.title} (${NODE_LABELS[n.nodeType] ?? n.nodeType})`;
    },
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 bg-bg-secondary/80 backdrop-blur-sm border border-border rounded-lg p-2">
        {(Object.entries(NODE_LABELS) as [NodeType, string][]).map(
          ([type, label]) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: NODE_COLORS[type] }}
              />
              <span className="text-text-secondary">{label}</span>
            </div>
          )
        )}
      </div>

      {graphData.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-5xl mb-4">🧠</div>
            <p className="text-text-primary font-semibold text-lg">
              Your knowledge graph is empty
            </p>
            <p className="text-text-secondary text-sm mt-2">
              Ask the AI tutor anything to start building your mindmap
            </p>
          </div>
        </div>
      )}

      {viewMode === "2d" ? (
        <ForceGraph2D
          {...commonProps}
          nodeCanvasObject={paintNode2D}
          nodeCanvasObjectMode={() => "replace"}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalParticleColor={() => "#4f8ef7"}
        />
      ) : (
        <ForceGraph3D
          {...commonProps}
          nodeColor={getNodeColor3D}
          nodeOpacity={0.9}
          nodeRelSize={5}
          linkOpacity={0.5}
        />
      )}
    </div>
  );
}
