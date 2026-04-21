import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import type { AgentMode, AgentRequest } from "@/types";

export async function POST(request: Request) {
  try {
    const body: AgentRequest = await request.json();
    const { classroomId, message, activeNodeId, mode } = body;

    if (!classroomId || !message) {
      return NextResponse.json(
        { error: "classroomId and message are required" },
        { status: 400 }
      );
    }

    if (mode && mode !== "local" && mode !== "premium") {
      return NextResponse.json(
        { error: "mode must be either 'local' or 'premium'" },
        { status: 400 }
      );
    }

    const agentMode: AgentMode = mode || "local";
    const result = await runAgent(classroomId, message, activeNodeId, agentMode);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/agent error:", error);
    const errMsg =
      error instanceof Error ? error.message : "Agent request failed";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
