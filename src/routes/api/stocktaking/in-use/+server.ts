import { getTokenFromCookies, verifyToken } from '$lib/server/auth';
import { prisma } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get('cookie'));
  if (!token) return json([], { status: 401 });

  try {
    verifyToken(token);

    const filterFactoryId = url.searchParams.get('factoryId');
    if (!filterFactoryId) return json([]);

    const factoryId = parseInt(filterFactoryId);

    const latestTxs: Array<{toolId: number; factoryId: number; latestType: string}> = await prisma.$queryRawUnsafe(
      `SELECT t.toolId, t.factoryId, t.type as latestType
       FROM tool_transactions t
       INNER JOIN (
         SELECT toolId, MAX(createdAt) as maxCreatedAt
         FROM tool_transactions
         WHERE factoryId = ${factoryId}
         GROUP BY toolId
       ) latest ON t.toolId = latest.toolId AND t.createdAt = latest.maxCreatedAt
       WHERE t.factoryId = ${factoryId}`
    );

    const outTools = latestTxs.filter(tx => tx.latestType === 'OUT');
    if (outTools.length === 0) return json([]);

    const toolIds = outTools.map(t => t.toolId);
    const tools = await prisma.tool.findMany({
      where: { id: { in: toolIds }, status: { not: 'SCRAPPED' } },
      include: { category: true, location: true },
    });

    const factory = await prisma.factory.findUnique({ where: { id: factoryId } });
    const toolMap = new Map(tools.map(t => [t.id, t]));

    const items: unknown[] = [];
    for (const tx of outTools) {
      const tool = toolMap.get(tx.toolId);
      if (!tool || tool.status === 'IN_STOCK') continue;

      items.push({
        id: tool.id,
        toolCode: tool.toolCode,
        name: tool.name,
        specification: tool.specification,
        quantity: tool.quantity,
        unit: tool.unit,
        categoryName: tool.category?.name || '',
        factoryId: factory?.id || factoryId,
        factoryCode: factory?.code || '',
        factoryName: factory?.name || '',
      });
    }

    return json(items);
  } catch (e) {
    console.error('Stocktaking in-use API error:', e);
    return json([], { status: 500 });
  }
};
