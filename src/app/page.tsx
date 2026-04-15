"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, BookOpen, Trash2, Loader2, Brain, Sparkles } from "lucide-react";
import clsx from "clsx";

interface ClassroomSummary {
  id: string;
  title: string;
  subject: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { nodes: number; messages: number };
}

export default function HomePage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject: "",
    description: "",
  });

  useEffect(() => {
    fetchClassrooms();
  }, []);

  async function fetchClassrooms() {
    try {
      const res = await fetch("/api/classrooms");
      const data = await res.json();
      setClassrooms(data);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.subject.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const classroom = await res.json();
      router.push(`/classroom/${classroom.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this classroom? This cannot be undone.")) return;
    await fetch(`/api/classrooms/${id}`, { method: "DELETE" });
    setClassrooms((prev) => prev.filter((c) => c.id !== id));
  }

  const relativeTime = (dateStr: string) => {
    const ms = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="h-full flex flex-col bg-bg overflow-auto">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-blue/20 flex items-center justify-center">
            <Brain size={18} className="text-accent-blue" />
          </div>
          <div>
            <h1 className="text-text-primary font-bold text-lg leading-none">
              Classroom AI
            </h1>
            <p className="text-text-muted text-xs mt-0.5">
              Learn anything, deeply
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue/20 border border-accent-blue/30 text-accent-blue hover:bg-accent-blue/30 transition-colors text-sm font-medium"
        >
          <Plus size={15} />
          New Classroom
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="text-text-muted animate-spin" />
          </div>
        ) : classrooms.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-6">🧠</div>
            <h2 className="text-text-primary font-bold text-2xl mb-3">
              Start your first classroom
            </h2>
            <p className="text-text-secondary text-sm max-w-md mx-auto mb-8">
              Each classroom is an interactive mindmap that grows as you learn.
              Ask your AI tutor anything and watch the knowledge graph build itself.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-blue/20 border border-accent-blue/30 text-accent-blue hover:bg-accent-blue/30 transition-colors font-medium"
            >
              <Sparkles size={16} />
              Create your first classroom
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-text-secondary text-sm font-medium mb-4">
              Your classrooms ({classrooms.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.map((c) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/classroom/${c.id}`)}
                  className="group relative bg-bg-secondary border border-border rounded-xl p-5 cursor-pointer hover:border-border-light transition-all hover:shadow-lg hover:shadow-black/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                      <BookOpen size={18} className="text-accent-blue" />
                    </div>
                    <button
                      onClick={(e) => handleDelete(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-accent-red transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <h3 className="text-text-primary font-semibold text-sm mb-1 leading-snug">
                    {c.title}
                  </h3>
                  <p className="text-accent-blue text-xs mb-2">{c.subject}</p>
                  {c.description && (
                    <p className="text-text-muted text-xs mb-3 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span>{c._count.nodes} nodes</span>
                    <span>·</span>
                    <span>{c._count.messages} messages</span>
                    <span>·</span>
                    <span>{relativeTime(c.updatedAt)}</span>
                  </div>
                </div>
              ))}

              {/* Add new card */}
              <div
                onClick={() => setShowCreate(true)}
                className="border-2 border-dashed border-border rounded-xl p-5 cursor-pointer hover:border-border-light transition-colors flex flex-col items-center justify-center gap-2 text-text-muted hover:text-text-secondary min-h-[140px]"
              >
                <Plus size={20} />
                <span className="text-sm">New classroom</span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-secondary border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-text-primary font-semibold">
                Create a new classroom
              </h2>
              <p className="text-text-muted text-xs mt-1">
                Define what you want to learn and let the AI tutor guide you
              </p>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-1.5">
                  Classroom title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Understanding Quantum Mechanics"
                  required
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-blue/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-1.5">
                  Subject *
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Physics, Machine Learning, History..."
                  required
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-blue/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-1.5">
                  Learning goal (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What specifically do you want to understand or achieve?"
                  rows={3}
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-blue/50 transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-border-light transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !form.title.trim() || !form.subject.trim()}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent-blue/20 border border-accent-blue/30 text-accent-blue text-sm font-medium transition-colors",
                    "hover:bg-accent-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {creating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {creating ? "Creating..." : "Start learning"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
