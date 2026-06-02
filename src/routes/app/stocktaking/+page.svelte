<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Modal from "$lib/components/ui/Modal.svelte";

  let stocktakings: any[] = [];
  let loading = true;
  let actionLoading = false;
  let error = "";
  let selectedIds: number[] = [];
  let deletingId: number | null = null;
  let showDeleteModal = false;

  onMount(() => load());

  async function load() {
    loading = true;
    try {
      const r = await fetch("/api/stocktaking");
      if (r.ok) stocktakings = await r.json();
    } catch { error = "加载失败"; }
    loading = false;
  }

  function toggleSelect(id: number) {
    if (selectedIds.includes(id)) {
      selectedIds = selectedIds.filter((i) => i !== id);
    } else {
      selectedIds = [...selectedIds, id];
    }
  }

  function toggleAll() {
    if (selectedIds.length === stocktakings.length) {
      selectedIds = [];
    } else {
      selectedIds = stocktakings.map((s) => s.id);
    }
  }

  async function handleExport() {
    if (selectedIds.length === 0) { error = "请先选择盘点单"; return; }
    actionLoading = true; error = "";
    try {
      const ids = selectedIds.join(",");
      const res = await fetch("/api/stocktaking/export?ids=" + ids);
      if (!res.ok) { error = "导出失败"; return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stocktaking_" + new Date().toISOString().slice(0, 10) + ".xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch { error = "导出失败"; }
    actionLoading = false;
  }

  function confirmDelete(id: number) {
    deletingId = id;
    showDeleteModal = true;
  }

  async function doDelete() {
    if (!deletingId) return;
    actionLoading = true; error = "";
    try {
      const r = await fetch("/api/stocktaking/" + deletingId, { method: "DELETE" });
      const data = await r.json();
      if (data.success) { await load(); showDeleteModal = false; }
      else { error = data.message || "删除失败"; }
    } catch { error = "删除失败"; }
    actionLoading = false;
  }

  const statusLabels: Record<string, string> = {
    IN_PROGRESS: "进行中", COMPLETED: "已完成",
  };
  const statusColors: Record<string, string> = {
    IN_PROGRESS: "bg-blue-100 text-blue-800", COMPLETED: "bg-green-100 text-green-800",
  };
</script>

<div class="max-w-5xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold">盘点管理</h2>
    <a href="/app/stocktaking/new" class="btn-primary">+ 新建盘点</a>
  </div>

  {#if error}
    <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>
  {/if}

  {#if selectedIds.length > 0}
    <div class="bg-blue-50 px-4 py-3 rounded-lg mb-4 flex items-center gap-3 flex-wrap">
      <span class="text-sm text-blue-700">已选 {selectedIds.length} 项</span>
      <button class="btn-primary btn-sm" on:click={handleExport} disabled={actionLoading}>导出选中(Excel)</button>
      <button class="text-sm text-gray-400 hover:text-gray-600" on:click={() => selectedIds = []}>取消选择</button>
    </div>
  {/if}

  {#if loading}
    <div class="text-center py-12 text-gray-400">加载中...</div>
  {:else if stocktakings.length === 0}
    <div class="card text-center py-12">
      <p class="text-gray-500">暂无盘点记录</p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header w-10"><input type="checkbox" on:change={toggleAll} checked={selectedIds.length === stocktakings.length && stocktakings.length > 0} /></th>
            <th class="table-header">盘点单号</th>
            <th class="table-header">工厂</th>
            <th class="table-header">状态</th>
            <th class="table-header">盘点人</th>
            <th class="table-header text-right">项目数</th>
            <th class="table-header">创建时间</th>
            <th class="table-header text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each stocktakings as st}
            <tr class="hover:bg-gray-50 cursor-pointer" on:click={() => goto("/app/stocktaking/" + st.id)}>
              <td class="table-cell"><input type="checkbox" checked={selectedIds.includes(st.id)} on:click={(e) => { e.stopPropagation(); toggleSelect(st.id); }} /></td>
              <td class="table-cell font-mono">{st.stocktakingNo}</td>
              <td class="table-cell">{st.factory?.code || ""} {st.factory?.name || ""}</td>
              <td class="table-cell"><span class="badge {statusColors[st.status]}">{statusLabels[st.status]}</span></td>
              <td class="table-cell">{st.operator?.displayName || "-"}</td>
              <td class="table-cell text-right">{st._count?.items || 0}</td>
              <td class="table-cell text-gray-500">{new Date(st.createdAt).toLocaleDateString("zh-CN")}</td>
              <td class="table-cell text-right">
                <button class="text-red-500 hover:text-red-700 text-xs" on:click={(e) => { e.stopPropagation(); confirmDelete(st.id); }}>删除</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<Modal title="确认删除" bind:show={showDeleteModal} confirmText="确认删除" variant="danger" on:confirm={doDelete} {actionLoading} on:close={() => showDeleteModal = false}>
  <p>确定要删除此盘点单吗？此操作不可撤销。</p>
</Modal>