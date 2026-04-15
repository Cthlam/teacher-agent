import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import type { AgentRequest } from "@/types";

export async function POST(request: Request) {
  try {
    const body: AgentRequest = await request.json();
    const { classroomId, message, activeNodeId } = body;

    if (!classroomId || !message) {
      return NextResponse.json(
        { error: "classroomId and message are required" },
        { status: 400 }
      );
    }

    const result = await runAgent(classroomId, message, activeNodeId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/agent error:", error);
    const errMsg =
      error instanceof Error ? error.message : "Agent request failed";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
