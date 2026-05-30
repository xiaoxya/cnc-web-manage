<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import ScanInput from "$lib/components/ScanInput.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";

  let stocktaking: any = null;
  let loading = true;
  let saving = false;
  let showCompleteModal = false;
  let completeLoading = false;
  let searchTerm = "";
  let error = "";

  $: id = $page.params.id;
  $: filteredItems = stocktaking?.items?.filter((i: any) => {
    if (!searchTerm) return true;
    const t = i.tool;
    return (t?.toolCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }) || [];

  $: diffCount = stocktaking?.items?.filter((i: any) => i.difference !== 0)?.length || 0;

  onMount(async () => {
    const res = await fetch(`/api/stocktaking/${id}`);
    if (res.ok) stocktaking = await res.json();
    loading = false;
  });

  async function onScan(val: string) {
    if (!val) return;
    searchTerm = val;
    // Auto-focus the matching item and scroll to it
    if (filteredItems.length === 1) {
      setTimeout(() => {
        const el = document.getElementById(`item-${filteredItems[0].id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.querySelector("input")?.focus();
      }, 200);
    }
  }

  async function updateItem(item: any, val: number) {
    item.actualQuantity = val;
    item.difference = val - item.expectedQuantity;
    saving = true;
    try {
      await fetch(`/api/stocktaking/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, actualQuantity: val, notes: item.notes }),
      });
    } catch {}
    saving = false;
  }

  async function completeStocktaking() {
    completeLoading = true;
    const res = await fetch(`/api/stocktaking/${id}?complete=true`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      goto("/app/stocktaking");
    } else { error = "完成盘点失败"; completeLoading = false; showCompleteModal = false; }
  }
</script>

<div class="flex items-center gap-4 mb-6">
  <a href="/app/stocktaking" class="text-gray-400 hover:text-gray-600">&larr; 返回</a>
  <h2 class="text-2xl font-bold">盘点执行</h2>
</div>

{#if loading}
  <div class="text-center py-12 text-gray-400">加载中...</div>
{:else if !stocktaking}
  <div class="text-center py-12 text-gray-400">盘点记录不存在</div>
{:else}
  <!-- Header info -->
  <div class="card mb-6">
    <div class="flex items-center justify-between">
      <div class="flex gap-6 text-sm">
        <div><span class="text-gray-500">盘点单号：</span><span class="font-mono">{stocktaking.stocktakingNo}</span></div>
        <div><span class="text-gray-500">创建人：</span><span>{stocktaking.operator?.displayName || "—"}</span></div>
        <div><span class="text-gray-500">道具总数：</span><span>{stocktaking.items?.length || 0}</span></div>
        <div><span class="text-gray-500">差异项：</span><span class="{diffCount > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}">{diffCount}</span></div>
      </div>
      {#if stocktaking.status === "IN_PROGRESS"}
        <button class="btn-success" on:click={() => showCompleteModal = true}>完成盘点</button>
      {:else}
        <span class="badge bg-green-100 text-green-800">已完成</span>
      {/if}
    </div>
  </div>

  <!-- Search/scan -->
  {#if stocktaking.status === "IN_PROGRESS"}
    <div class="card mb-6">
      <label class="label">扫码定位刀具</label>
      <ScanInput bind:value={searchTerm} placeholder="扫描刀具编码快速定位..." on:submit={(e) => onScan(e.detail)} />
    </div>
  {/if}

  <!-- Items table -->
  <div class="card">
    {#if stocktaking.status === "COMPLETED"}
      <div class="bg-blue-50 text-blue-700 text-sm px-4 py-3 rounded-lg mb-4">
        盘点已完成，系统已根据实际数量更新库存。
        {#if diffCount > 0}
          <span class="font-semibold">共有 {diffCount} 项差异。</span>
        {/if}
        点击 <button class="text-blue-600 underline" on:click={async () => {
          // Simple CSV export
          const items = stocktaking.items || [];
          let csv = "刀具编码,名称,规格,预期数量,实际数量,差异,备注\n";
          for (const item of items) {
            const t = item.tool;
            csv += `${t?.toolCode || ""},${t?.name || ""},${t?.specification || ""},${item.expectedQuantity},${item.actualQuantity},${item.difference},${item.notes || ""}\n`;
          }
          const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `盘点报告_${stocktaking.stocktakingNo}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }}>导出报告</button>
      </div>
    {/if}

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">#</th>
            <th class="table-header">刀具编码</th>
            <th class="table-header">名称</th>
            <th class="table-header">规格</th>
            <th class="table-header text-right">预期数量</th>
            <th class="table-header text-right">实际数量</th>
            <th class="table-header text-right">差异</th>
            {#if stocktaking.status === "IN_PROGRESS"}
              <th class="table-header">备注</th>
            {/if}
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each filteredItems as item, i}
            <tr id="item-{item.id}" class="hover:bg-gray-50 {item.difference !== 0 ? 'bg-red-50' : ''}">
              <td class="table-cell text-gray-400">{i + 1}</td>
              <td class="table-cell font-mono text-blue-600">{item.tool?.toolCode || "—"}</td>
              <td class="table-cell">{item.tool?.name || "—"}</td>
              <td class="table-cell text-gray-500">{item.tool?.specification || "—"}</td>
              <td class="table-cell text-right">{item.expectedQuantity}</td>
              <td class="table-cell text-right">
                {#if stocktaking.status === "IN_PROGRESS"}
                  <input
                    type="number"
                    class="input w-20 text-right"
                    value={item.actualQuantity}
                    on:change={(e) => updateItem(item, parseInt(e.currentTarget.value) || 0)}
                    min="0"
                  />
                {:else}
                  {item.actualQuantity}
                {/if}
              </td>
              <td class="table-cell text-right font-medium {item.difference < 0 ? 'text-red-600' : item.difference > 0 ? 'text-green-600' : 'text-gray-500'}">
                {item.difference > 0 ? "+" : ""}{item.difference}
              </td>
              {#if stocktaking.status === "IN_PROGRESS"}
                <td class="table-cell">
                  <input class="input" value={item.notes || ""} placeholder="备注" on:change={(e) => { item.notes = e.currentTarget.value; updateItem(item, item.actualQuantity); }} />
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <Modal title="确认完成盘点" bind:show={showCompleteModal} confirmText="完成盘点" variant="primary" on:confirm={completeStocktaking} {completeLoading} on:close={() => showCompleteModal = false}>
    {#if error}
      <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-3">{error}</div>
    {/if}
    <p>盘点完成后，系统将根据实际数量自动更新库存。</p>
    {#if diffCount > 0}
      <p class="text-red-600 font-medium mt-2">共有 {diffCount} 项差异，请确认已核对完毕。</p>
    {/if}
  </Modal>
{/if}
