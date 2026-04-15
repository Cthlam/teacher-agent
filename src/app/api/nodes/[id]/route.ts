import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const node = await prisma.node.findUnique({
      where: { id },
      include: {
        sourceEdges: true,
        targetEdges: true,
      },
    });

    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    return NextResponse.json(node);
  } catch (error) {
    console.error("GET /api/nodes/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch node" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, content, posX, posY, posZ } = await request.json();

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (posX !== undefined) updateData.posX = posX;
    if (posY !== undefined) updateData.posY = posY;
    if (posZ !== undefined) updateData.posZ = posZ;

    const node = await prisma.node.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(node);
  } catch (error) {
    console.error("PUT /api/nodes/[id] error:", error);
    return NextResponse.json({ error: "Failed to update node" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.node.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/nodes/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete node" }, { status: 500 });
  }
}
