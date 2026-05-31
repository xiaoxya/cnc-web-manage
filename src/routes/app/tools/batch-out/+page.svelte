<script lang="ts">
  import { onMount } from "svelte";
  import ScanInput from "$lib/components/ScanInput.svelte";
  import { goto } from "$app/navigation";

  let items: any[] = [{ toolCode: "", name: "", quantity: 1, notes: "" }];
  let factoryId: number | null = null;
  let factories: any[] = [];
  let referenceNo = "";
  let loading = false;
  let error = "";
  let success = "";
  let scanIndex = 0;
  let manualCode = "";

  onMount(async () => {
    try { const r = await fetch("/api/factories"); if (r.ok) factories = await r.json(); } catch {}
  });

  function addRow() { items = [...items, { toolCode: "", name: "", quantity: 1, notes: "" }]; }
  function removeRow(idx: number) { if (items.length > 1) items = items.filter((_, i) => i !== idx); }

  async function searchTool(val: string, idx: number) {
    if (!val) return;
    try {
      const res = await fetch(`/api/tools?search=${encodeURIComponent(val)}&pageSize=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.tools?.length > 0) {
          const tool = data.tools[0];
          items[idx].toolCode = tool.toolCode;
          items[idx].name = tool.name;
          items[idx].toolId = tool.id;
          items[idx]._found = true;
          items[idx]._notFound = false;
          items[idx]._maxQty = tool.quantity;
          if (idx === items.length - 1) addRow();
          scanIndex = idx + 1;
        } else {
          items[idx]._notFound = true;
          items[idx]._found = false;
          setTimeout(() => items[idx]._notFound = false, 2000);
        }
      }
    } catch {}
  }

  async function onScan(val: string, idx: number) {
    await searchTool(val, idx);
  }

  async function onManualSearch() {
    const code = manualCode;
    if (!code) return;
    manualCode = "";
    // Always add a new row first, the new row will get auto-filled
    addRow();
    // Fill the row just before the new one
    const idx = items.length - 2;
    if (idx < 0) return;
    await searchTool(code, idx);
    scanIndex = idx + 1;
  }

  function handleManualKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") onManualSearch();
  }

  function importExcel() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/tools/batch/import?type=OUT", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        items = data.items.map((t: any) => ({ toolId: t.id, toolCode: t.toolCode, name: t.name, quantity: Math.max(1, t.quantity || 1), notes: t.notes || "", _found: true }));
      } else { error = data.message || "导入失败"; }
    };
    input.click();
  }

  async function submitBatch() {
    const validItems = items.filter(i => i.toolId && i.quantity > 0);
    if (!factoryId) { error = "请选择目标工厂"; return; }
    if (validItems.length === 0) { error = "请至少扫描或输入一把刀具并输入数量"; return; }

    loading = true; error = ""; success = "";
    try {
      const res = await fetch("/api/tools/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OUT",
          items: validItems.map(i => ({ toolId: i.toolId, quantity: i.quantity, notes: i.notes })),
          referenceNo,
          factoryId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        success = `出库成功，共处理 ${data.count} 条记录`;
        setTimeout(() => goto("/app/tools"), 1500);
      } else { error = data.message || "出库失败"; }
    } catch { error = "网络错误"; }
    loading = false;
  }
</script>

<div class="max-w-4xl mx-auto">
  <div class="flex items-center gap-4 mb-6">
    <a href="/app/tools" class="text-gray-400 hover:text-gray-600">&larr; 返回</a>
    <h2 class="text-2xl font-bold">批量出库</h2>
  </div>

  <div class="card">
    {#if error}<div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>{/if}
    {#if success}<div class="bg-green-50 text-green-600 text-sm px-4 py-2 rounded-lg mb-4">{success}</div>{/if}

    <div class="mb-4">
      <label class="label">单据号（可选）</label>
      <input class="input" bind:value={referenceNo} placeholder="留空自动生成" />
    </div>

    <div class="mb-4">
      <label class="label">目标工厂 <span class="text-red-500">*</span></label>
      <select class="input" bind:value={factoryId}>
        <option value={null}>请选择工厂</option>
        {#each factories as f}
          <option value={f.id}>{f.code} - {f.name}</option>
        {/each}
      </select>
    </div>

    <!-- Manual input area -->
    <div class="flex items-center gap-2 mb-4 p-3 bg-orange-50 rounded-lg">
      <span class="text-sm text-orange-700 font-medium">📝 手动输入刀具编码：</span>
      <input
        class="input flex-1"
        bind:value={manualCode}
        on:keydown={handleManualKeydown}
        placeholder="输入刀具编码后按回车搜索"
      />
      <button class="btn-primary btn-sm" on:click={onManualSearch}>搜索</button>
    </div>

    <p class="text-sm text-gray-500 mb-4">扫描刀具编码自动填入，注意出库数量不能超过当前库存</p>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">#</th>
            <th class="table-header">扫码/输入</th>
            <th class="table-header">刀具名称</th>
            <th class="table-header text-right">当前库存</th>
            <th class="table-header text-right">出库数量</th>
            <th class="table-header">备注</th>
            <th class="table-header"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each items as item, i}
            <tr>
              <td class="table-cell text-gray-400">{i + 1}</td>
              <td class="table-cell">
                {#if item._found}
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">{item.toolCode}</span>
                  </div>
                {:else}
                  <ScanInput placeholder="扫描刀具编码..." on:scan={(e) => onScan(e.detail, i)} autofocus={i === scanIndex} />
                  {#if item._notFound}<p class="text-xs text-red-500 mt-1">未找到该刀具</p>{/if}
                {/if}
              </td>
              <td class="table-cell">
                {#if item._found}
                  <span class="font-medium">{item.name}</span>
                {:else}
                  —
                {/if}
              </td>
              <td class="table-cell text-right">{item._maxQty ?? "—"}</td>
              <td class="table-cell">
                <input type="number" class="input w-20 text-right" bind:value={item.quantity} min="1" max={item._maxQty || 9999} />
              </td>
              <td class="table-cell"><input class="input" bind:value={item.notes} placeholder="备注" /></td>
              <td class="table-cell"><button class="text-red-500 hover:text-red-700 text-xs" on:click={() => removeRow(i)}>删除</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="flex items-center gap-3 mt-4">
      <button class="btn-secondary btn-sm" on:click={addRow}>+ 添加行</button>
      <button class="btn-secondary btn-sm" on:click={importExcel}>📫 导入 Excel</button>
      <a href="/api/tools/template?type=OUT" class="btn-secondary btn-sm" download>📜 下载模板</a>
      <div class="flex-1"></div>
      <button class="btn-primary" on:click={submitBatch} disabled={loading}>
        {loading ? "处理中..." : "确认出库"}
      </button>
    </div>
  </div>
</div>
