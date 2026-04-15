import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await prisma.edge.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/edges error:", error);
    return NextResponse.json({ error: "Failed to delete edge" }, { status: 500 });
  }
}
