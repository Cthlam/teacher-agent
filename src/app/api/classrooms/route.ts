import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const classrooms = await prisma.classroom.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { nodes: true, messages: true } },
      },
    });
    return NextResponse.json(classrooms);
  } catch (error) {
    console.error("GET /api/classrooms error:", error);
    return NextResponse.json({ error: "Failed to fetch classrooms" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, subject, description } = await request.json();
    if (!title || !subject) {
      return NextResponse.json(
        { error: "title and subject are required" },
        { status: 400 }
      );
    }

    const classroom = await prisma.classroom.create({
      data: { title, subject, description },
    });

    return NextResponse.json(classroom, { status: 201 });
  } catch (error) {
    console.error("POST /api/classrooms error:", error);
    return NextResponse.json({ error: "Failed to create classroom" }, { status: 500 });
  }
}
