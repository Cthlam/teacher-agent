"use client";

import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Loader2, Bot, User, GitBranch, Brain } from "lucide-react";
import clsx from "clsx";
import type { ChatMessage, AgentResponse } from "@/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  activeNodeTitle?: string | null;
  lastResponse?: AgentResponse | null;
  onSend: (message: string) => void;
  onQuickAction: (action: string) => void;
}

const QUICK_PROMPTS = [
  "Give me an overview",
  "Explain with examples",
  "What are the key concepts?",
  "Go deeper on this topic",
  "Quiz me",
  "Summarize what I've learned",
];

export default function ChatPanel({
  messages,
  isLoading,
  activeNodeTitle,
  lastResponse,
  onSend,
  onQuickAction,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    onSend(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full bg-bg border-t border-border">
      {/* Graph update banner */}
      {lastResponse && lastResponse.graphUpdates.createdNodes.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-blue/10 border-b border-accent-blue/20 text-xs text-accent-blue animate-fade-in">
          <GitBranch size={12} />
          <span>
            Added {lastResponse.graphUpdates.createdNodes.length} node
            {lastResponse.graphUpdates.createdNodes.length > 1 ? "s" : ""} to
            mindmap:{" "}
            {lastResponse.graphUpdates.createdNodes
              .map((n) => `"${n.title}"`)
              .join(", ")}
          </span>
        </div>
      )}

      {/* Quiz generated banner */}
      {lastResponse?.graphUpdates.generatedQuiz && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-cyan/10 border-b border-accent-cyan/20 text-xs text-accent-cyan animate-fade-in">
          <Brain size={12} />
          <span>
            Quiz ready: &quot;{lastResponse.graphUpdates.generatedQuiz.title}&quot;
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot size={32} className="mx-auto mb-3 text-text-muted" />
            <p className="text-text-secondary text-sm font-medium">
              Your AI tutor is ready
            </p>
            <p className="text-text-muted text-xs mt-1">
              Ask anything to start building your knowledge graph
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex gap-2 animate-fade-in",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={clsx(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                msg.role === "user"
                  ? "bg-accent-blue/20 text-accent-blue"
                  : "bg-bg-tertiary text-text-secondary"
              )}
            >
              {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
            </div>

            <div
              className={clsx(
                "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-accent-blue/15 text-text-primary border border-accent-blue/20"
                  : "bg-bg-secondary text-text-primary border border-border"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose-chat">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 animate-fade-in">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-bg-tertiary text-text-secondary">
              <Bot size={12} />
            </div>
            <div className="bg-bg-secondary border border-border rounded-xl px-3 py-2 flex items-center gap-2">
              <Loader2 size={12} className="text-accent-blue animate-spin" />
              <span className="text-xs text-text-secondary">
                Thinking and updating mindmap...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onQuickAction(prompt)}
            disabled={isLoading}
            className="shrink-0 text-xs px-2.5 py-1 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-border-light transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        {activeNodeTitle && (
          <div className="flex items-center gap-1.5 mb-1.5 text-xs text-text-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
            <span>Focused on: {activeNodeTitle}</span>
          </div>
        )}
        <div className="flex items-end gap-2 bg-bg-secondary border border-border rounded-xl px-3 py-2 focus-within:border-accent-blue/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask your tutor anything..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent text-text-primary text-sm resize-none focus:outline-none placeholder:text-text-muted leading-relaxed"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-1.5 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
        <p className="text-xs text-text-muted mt-1 text-right">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
