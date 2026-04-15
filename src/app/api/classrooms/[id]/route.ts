import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        nodes: { orderBy: { createdAt: "asc" } },
        edges: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!classroom) {
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
    }

    return NextResponse.json(classroom);
  } catch (error) {
    console.error("GET /api/classrooms/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch classroom" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.classroom.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/classrooms/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete classroom" }, { status: 500 });
  }
}
