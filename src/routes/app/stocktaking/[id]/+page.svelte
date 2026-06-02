<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import ScanInput from "$lib/components/ScanInput.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";

  const stocktakingId = $page.url.pathname.split("/").pop();

  let stocktaking: any = null;
  let factory: any = null;
  let inUseTools: any[] = [];
  let scannedTool: any = null;
  let actualQuantity = 0;
  let notes = "";
  let loading = true;
  let submitLoading = false;
  let success = "";
  let error = "";
  let scanCode = "";
  let submitModal = false;
  let submittedCount = 0;
  let scanningLock = false;

  onMount(async () => {
    await loadStocktaking();
    await loadInUseTools();
  });

  async function loadStocktaking() {
    try {
      const res = await fetch("/api/stocktaking");
      if (res.ok) {
        const all = await res.json();
        const st = all.find((s: any) => s.id === parseInt(stocktakingId));
        if (st) {
          stocktaking = st;
          if (st.factory) factory = st.factory;
        }
      }
    } catch {}
    loading = false;
  }

  async function loadInUseTools() {
    try {
      const res = await fetch("/api/stocktaking/in-use?factoryId=" + (factory?.id || ""));
      if (res.ok) inUseTools = await res.json();
    } catch {}
  }

  async function onScanForTool(val: string) {
    if (!val || scanningLock) return;
    scanningLock = true;
    scannedTool = null;
    actualQuantity = 0;
    notes = "";

    const found = inUseTools.find(t => t.toolCode === val);
    if (found) {
      scannedTool = found;
      actualQuantity = found.quantity;
      scanningLock = false;
      return;
    }

    try {
      const res = await fetch("/api/tools?search=" + encodeURIComponent(val) + "&pageSize=1");
      if (res.ok) {
        const data = await res.json();
        if (data.tools?.length > 0) {
          scannedTool = data.tools[0];
          actualQuantity = scannedTool.quantity;
        }
      }
    } catch {}
    scanningLock = false;
  }

  function resetScan() {
    scanCode = "";
    scannedTool = null;
    actualQuantity = 0;
    notes = "";
  }

  function addToStocktaking() {
    if (!scannedTool) { error = "请先扫码或输入刀具编码"; return; }
    submitModal = true;
  }

  async function confirmSubmit() {
    if (!scannedTool) return;
    submitLoading = true;
    error = "";
    try {
      const res = await fetch("/api/stocktaking/" + stocktakingId + "/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            toolId: scannedTool.id,
            actualQuantity,
            notes: notes || null,
          }],
        }),
      });
      const data = await res.json();
      if (data.success) {
        submittedCount++;
        success = "已记录 " + scannedTool.toolCode + " - " + scannedTool.name + "，实盘 " + actualQuantity + " 把";
        submitModal = false;
        setTimeout(() => { success = ""; resetScan(); }, 1500);
      } else {
        error = data.message || "提交失败";
      }
    } catch {
      error = "网络错误";
    }
    submitLoading = false;
  }

  async function finishStocktaking() {
    if (!confirm("确定完成本轮盘点？未录入的刀具将保持原数量。")) return;
    submitLoading = true;
    error = "";
    try {
      const res = await fetch("/api/stocktaking/" + stocktakingId + "/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/app/stocktaking";
      } else {
        error = data.message || "完成盘点失败";
      }
    } catch {
      error = "网络错误";
    }
    submitLoading = false;
  }

  const statusMap: Record<string, string> = { IN_PROGRESS: "进行中", COMPLETED: "已完成" };
  const statusColors: Record<string, string> = { IN_PROGRESS: "bg-blue-100 text-blue-800", COMPLETED: "bg-green-100 text-green-800" };
</script>

{#if loading}
  <div class="text-center py-12 text-gray-400">加载中...</div>
{:else if !stocktaking}
  <div class="card text-center py-12">
    <p class="text-gray-500">盘点单不存在</p>
  </div>
{:else}
  <div class="flex items-center justify-between mb-6">
    <div>
      <a href="/app/stocktaking" class="text-gray-400 hover:text-gray-600">&larr; 返回</a>
      <h2 class="text-2xl font-bold">盘点详情</h2>
    </div>
    {#if stocktaking.status === "IN_PROGRESS"}
      <button class="btn-secondary" on:click={finishStocktaking} disabled={submitLoading}>
        完成盘点
      </button>
    {:else}
      <span class="badge bg-green-100 text-green-800">已完成</span>
    {/if}
  </div>

  <!-- Header info -->
  <div class="mb-6 card">
    <div class="flex items-center gap-4 flex-wrap">
      <div>
        <p class="text-sm text-gray-500">盘点单号</p>
        <p class="font-mono font-semibold">{stocktaking.stocktakingNo}</p>
      </div>
      <div class="border-l pl-4">
        <p class="text-sm text-gray-500">工厂</p>
        <p class="font-semibold">{factory?.code || ""} {factory?.name || ""}</p>
      </div>
      <div class="border-l pl-4">
        <p class="text-sm text-gray-500">状态</p>
        <span class="badge {statusColors[stocktaking.status]}">{statusMap[stocktaking.status]}</span>
      </div>
      <div class="border-l pl-4">
        <p class="text-sm text-gray-500">已录入</p>
        <p class="font-semibold text-blue-600">{submittedCount} / {inUseTools.length}</p>
      </div>
    </div>
  </div>

  {#if stocktaking.status === "IN_PROGRESS"}
    <!-- Scan area -->
    <div class="card mb-6">
      <h3 class="text-lg font-semibold mb-4">扫码盘点</h3>

      {#if error}
        <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-3">{error}</div>
      {/if}
      {#if success}
        <div class="bg-green-50 text-green-600 text-sm px-4 py-2 rounded-lg mb-3">{success}</div>
      {/if}

      <div class="flex gap-3 mb-4">
        <div class="flex-1">
          <label class="label">刀具编码</label>
          <ScanInput bind:value={scanCode} placeholder="扫码或输入刀具编码" on:submit={(e) => { onScanForTool(e.detail); }} />
        </div>
        <div class="flex items-end">
          <button class="btn-primary btn-sm" on:click={addToStocktaking} disabled={!scannedTool}>录入</button>
        </div>
      </div>

      {#if scannedTool}
        <div class="bg-blue-50 text-blue-700 text-sm px-4 py-3 rounded-lg mb-3">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono font-bold">{scannedTool.toolCode}</span>
            <button class="text-xs text-blue-400 hover:text-blue-600" on:click={resetScan}>清除</button>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div><span class="text-gray-500">名称：</span><span class="font-medium">{scannedTool.name}</span></div>
            <div><span class="text-gray-500">分类：</span><span>{scannedTool.categoryName || ""}</span></div>
            {#if scannedTool.specification}
            <div><span class="text-gray-500">规格：</span><span>{scannedTool.specification}</span></div>
            {/if}
            {#if scannedTool.factoryName}
            <div><span class="text-gray-500">工厂：</span><span class="badge bg-purple-100 text-purple-800">{scannedTool.factoryCode} - {scannedTool.factoryName}</span></div>
            {/if}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">实盘数量（把）</label>
            <input type="number" class="input" bind:value={actualQuantity} min="0" />
          </div>
          <div>
            <label class="label">备注</label>
            <input type="text" class="input" bind:value={notes} placeholder="可选备注" />
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Items table -->
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">盘点明细</h3>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">刀具编码</th>
            <th class="table-header">名称</th>
            <th class="table-header">规格</th>
            <th class="table-header text-right">账面数量</th>
            <th class="table-header text-right">实盘数量</th>
            <th class="table-header text-right">差异</th>
            <th class="table-header">备注</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each inUseTools as tool}
            <tr class="hover:bg-gray-50">
              <td class="table-cell font-mono">{tool.toolCode}</td>
              <td class="table-cell font-medium">{tool.name}</td>
              <td class="table-cell text-gray-500">{tool.specification || "-"}</td>
              <td class="table-cell text-right">{tool.quantity}</td>
              <td class="table-cell text-right font-semibold">{tool.quantity}</td>
              <td class="table-cell text-right text-gray-500">0</td>
              <td class="table-cell text-gray-500">-</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<!-- Confirm Modal -->
<Modal title="确认录入" bind:show={submitModal} confirmText="确认" on:confirm={confirmSubmit} on:close={() => submitModal = false} {submitLoading}>
  {#if scannedTool}
    <p>确认录入以下刀具：</p>
    <p class="mt-2 font-semibold">{scannedTool.toolCode} - {scannedTool.name}</p>
    <p class="text-sm text-gray-500 mt-1">实盘数量：<strong>{actualQuantity}</strong> 把</p>
    {#if notes}<p class="text-sm text-gray-500">备注：{notes}</p>{/if}
  {/if}
</Modal>