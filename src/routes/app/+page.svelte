<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/ui/Card.svelte";

  let stats = {
    totalTools: 0,
    lowStockCount: 0,
    maintenanceCount: 0,
    recentTransactions: [] as any[],
    recentMaintenance: [] as any[],
  };
  let loading = true;

  onMount(async () => {
    try {
      const res = await fetch("/api/tools/stats");
      if (res.ok) stats = await res.json();
    } catch {}
    loading = false;
  });

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  const statusMap: Record<string, string> = {
    IN_STOCK: "在库", IN_USE: "使用中", MAINTENANCE: "维修中", SCRAPPED: "已报废"
  };
  const typeMap: Record<string, string> = { IN: "入库", OUT: "出库" };
  const maintMap: Record<string, string> = { IN_MAINTENANCE: "维修中", COMPLETED: "已完成" };
</script>

<h2 class="text-2xl font-bold mb-6">仪表盘</h2>

{#if loading}
  <div class="text-center py-12 text-gray-400">加载中...</div>
{:else}
  <!-- Stats cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div class="card">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-2xl">🔧</div>
        <div>
          <p class="text-sm text-gray-500">刀具总数</p>
          <p class="text-3xl font-bold">{stats.totalTools}</p>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center text-2xl">⚠️</div>
        <div>
          <p class="text-sm text-gray-500">低库存预警</p>
          <p class="text-3xl font-bold text-yellow-600">{stats.lowStockCount}</p>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center text-2xl">🔨</div>
        <div>
          <p class="text-sm text-gray-500">维修中</p>
          <p class="text-3xl font-bold text-red-600">{stats.maintenanceCount}</p>
        </div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Recent transactions -->
    <div class="card">
      <h3 class="text-lg font-semibold mb-4">最近出入库</h3>
      {#if stats.recentTransactions.length === 0}
        <p class="text-gray-400 text-sm">暂无记录</p>
      {:else}
        <div class="space-y-3">
          {#each stats.recentTransactions as tx}
            <div class="flex items-center justify-between text-sm">
              <div>
                <span class="font-medium">{tx.tool?.name || "—"}</span>
                <span class="text-gray-400 ml-2">({tx.tool?.toolCode})</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="badge {tx.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">
                  {typeMap[tx.type] || tx.type}
                </span>
                <span class="font-semibold">{tx.quantity}</span>
                <span class="text-gray-400 text-xs">{formatDate(tx.createdAt)}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Recent maintenance -->
    <div class="card">
      <h3 class="text-lg font-semibold mb-4">最近维修</h3>
      {#if stats.recentMaintenance.length === 0}
        <p class="text-gray-400 text-sm">暂无记录</p>
      {:else}
        <div class="space-y-3">
          {#each stats.recentMaintenance as m}
            <div class="flex items-center justify-between text-sm">
              <div>
                <span class="font-medium">{m.tool?.name || "—"}</span>
                <span class="text-gray-400 ml-2">({m.tool?.toolCode})</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="badge {m.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                  {maintMap[m.status] || m.status}
                </span>
                <span class="text-gray-400 text-xs">{formatDate(m.createdAt)}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
