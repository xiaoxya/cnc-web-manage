<script lang="ts">
  import { onMount } from "svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";

  let records: any[] = [];
  let loading = true;

  onMount(async () => {
    const res = await fetch("/api/stocktaking");
    if (res.ok) records = await res.json();
    loading = false;
  });

  const statusMap: Record<string, string> = { IN_PROGRESS: "进行中", COMPLETED: "已完成" };
  const statusColors: Record<string, string> = { IN_PROGRESS: "bg-blue-100 text-blue-800", COMPLETED: "bg-green-100 text-green-800" };

  function fmt(d: string) { return new Date(d).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-2xl font-bold">刀具盘点</h2>
  <a href="/app/stocktaking/new" class="btn-primary">+ 新建盘点</a>
</div>

<div class="card">
  {#if loading}
    <div class="text-center py-8 text-gray-400">加载中...</div>
  {:else if records.length === 0}
    <EmptyState message="暂无盘点记录" icon="📋" />
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">盘点单号</th>
            <th class="table-header">状态</th>
            <th class="table-header">盘点人</th>
            <th class="table-header text-right">盘点项数</th>
            <th class="table-header">创建时间</th>
            <th class="table-header">完成时间</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each records as r}
            <tr class="hover:bg-gray-50">
              <td class="table-cell font-mono">{r.stocktakingNo}</td>
              <td class="table-cell"><span class="badge {statusColors[r.status]}">{statusMap[r.status]}</span></td>
              <td class="table-cell">{r.operator?.displayName || "—"}</td>
              <td class="table-cell text-right">{r._count?.items || 0}</td>
              <td class="table-cell text-gray-500">{fmt(r.createdAt)}</td>
              <td class="table-cell text-gray-500">{r.completedAt ? fmt(r.completedAt) : "—"}</td>
              <td class="table-cell">
                <a href="/app/stocktaking/{r.id}" class="text-blue-600 hover:text-blue-800">
                  {r.status === "IN_PROGRESS" ? "执行盘点" : "查看报告"}
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
