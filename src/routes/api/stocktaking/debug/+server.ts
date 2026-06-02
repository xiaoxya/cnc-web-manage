import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    // Check tools count
    const toolCount = await prisma.tool.count();
    const factoryCount = await prisma.factory.count();
    // Check stocktaking schema 
    const colInfo = await prisma.$queryRawUnsafe("PRAGMA table_info(stocktakings)");
    return json({ toolCount, factoryCount, columns: colInfo });
  } catch (e: any) {
    return json({ error: e.message, stack: e.stack }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
};
