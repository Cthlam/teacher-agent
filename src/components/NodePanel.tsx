"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  Edit3,
  Check,
  Brain,
  Link2,
  ChevronRight,
  Tag,
} from "lucide-react";
import type { KnowledgeNode, NodeType } from "@/types";
import clsx from "clsx";

const NODE_COLORS: Record<NodeType, string> = {
  root: "#ffd700",
  concept: "#4f8ef7",
  example: "#4caf50",
  definition: "#9c27b0",
  summary: "#ff9800",
  deep_dive: "#f44336",
  quiz: "#00bcd4",
};

interface NodePanelProps {
  node: KnowledgeNode;
  onClose: () => void;
  onUpdate: (nodeId: string, title: string, content: string) => Promise<void>;
  onGenerateQuiz: (nodeId: string) => void;
  connectedNodeTitles: string[];
}

export default function NodePanel({
  node,
  onClose,
  onUpdate,
  onGenerateQuiz,
  connectedNodeTitles,
}: NodePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editContent, setEditContent] = useState(node.content);
  const [isSaving, setIsSaving] = useState(false);

  const color = NODE_COLORS[node.nodeType as NodeType] ?? NODE_COLORS.concept;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(node.id, editTitle, editContent);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(node.title);
    setEditContent(node.content);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary border-l border-border animate-fade-in">
      {/* Header */}
      <div
        className="flex items-start justify-between p-4 border-b border-border"
        style={{ borderTopColor: color, borderTopWidth: 2 }}
      >
        <div className="flex-1 min-w-0 mr-2">
          {isEditing ? (
            <input
              className="w-full bg-bg-tertiary border border-border rounded px-2 py-1 text-text-primary font-semibold text-sm focus:outline-none focus:border-accent-blue"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          ) : (
            <h2 className="text-text-primary font-semibold text-sm leading-snug">
              {node.title}
            </h2>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <Tag size={10} style={{ color }} />
            <span
              className="text-xs font-medium capitalize"
              style={{ color }}
            >
              {node.nodeType.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="p-1.5 rounded hover:bg-bg-tertiary text-accent-green transition-colors"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                onClick={handleCancel}
                className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary transition-colors"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                title="Edit node"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => onGenerateQuiz(node.id)}
                className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-accent-cyan transition-colors"
                title="Generate quiz"
              >
                <Brain size={14} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary transition-colors"
                title="Close"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isEditing ? (
          <textarea
            className="w-full h-full bg-bg-secondary text-text-primary text-sm font-mono p-4 resize-none focus:outline-none"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Write markdown content..."
          />
        ) : (
          <div className="p-4 prose-node">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {node.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Connected nodes */}
      {connectedNodeTitles.length > 0 && !isEditing && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Link2 size={12} className="text-text-secondary" />
            <span className="text-xs text-text-secondary font-medium">
              Connected ({connectedNodeTitles.length})
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {connectedNodeTitles.slice(0, 5).map((title, i) => (
              <div
                key={i}
                className="flex items-center gap-1 text-xs text-text-muted"
              >
                <ChevronRight size={10} />
                <span className="truncate">{title}</span>
              </div>
            ))}
            {connectedNodeTitles.length > 5 && (
              <span className="text-xs text-text-muted ml-3">
                +{connectedNodeTitles.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick action */}
      {!isEditing && (
        <div className="border-t border-border p-3">
          <button
            onClick={() => onGenerateQuiz(node.id)}
            className={clsx(
              "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-colors",
              "bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 border border-accent-cyan/30"
            )}
          >
            <Brain size={13} />
            Generate Quiz for this Node
          </button>
        </div>
      )}
    </div>
  );
}
