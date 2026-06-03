import { prisma } from "$lib/server/db";
import { Prisma } from "@prisma/client";
import type { Prisma as PrismaTypes } from "@prisma/client";

export async function generateToolCode(tx?: PrismaTypes.TransactionClient): Promise<string> {
  const client = tx || prisma;

  const rows = await client.$queryRaw<Array<{ nextValue: number }>>(
    Prisma.sql`SELECT nextValue FROM tool_code_sequences WHERE id = 1 FOR UPDATE`
  );
  const sequence = rows[0];

  if (!sequence) {
    throw new Error("刀具编码序列不存在，请先执行数据库迁移");
  }

  const currentValue = sequence.nextValue;

  await client.toolCodeSequence.update({
    where: { id: 1 },
    data: { nextValue: currentValue + 1 },
  });

  return `Q${String(currentValue).padStart(5, "0")}`;
}
