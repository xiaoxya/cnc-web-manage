<script lang="ts">
  import { onMount } from "svelte";
  import ScanInput from "$lib/components/ScanInput.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";

  let records: any[] = [];
  let loading = true;
  let statusFilter = "";
  let search = "";

  // New maintenance modal
  let showNewModal = false;
  let scanCode = "";
  let scannedTool: any = null;
  let description = "";
  let notes = "";
  let newLoading = false;
  let newError = "";

  const statusOptions = [
    { value: "", label: "全部" },
    { value: "IN_MAINTENANCE", label: "维修中" },
    { value: "COMPLETED", label: "已完成" },
  ];

  onMount(() => loadRecords());

  async function loadRecords() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/maintenance?${params}`);
      if (res.ok) records = await res.json();
    } catch {}
    loading = false;
  }

  function applyFilter() { loadRecords(); }

  async function onScanForNew(val: string) {
    if (!val) return;
    try {
      const res = await fetch(`/api/tools?search=${encodeURIComponent(val)}&pageSize=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.tools?.length > 0) {
          scannedTool = data.tools[0];
          scanCode = scannedTool.toolCode;
          showNewModal = true;
        }
      }
    } catch {}
  }

  async function submitNewMaintenance() {
    if (!scannedTool) { newError = "请先扫描刀具"; return; }
    if (!description) { newError = "请输入故障描述"; return; }
    newLoading = true; newError = "";
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId: scannedTool.id, description, notes }),
    });
    const data = await res.json();
    if (data.success) {
      showNewModal = false;
      scannedTool = null;
      description = "";
      notes = "";
      scanCode = "";
      loadRecords();
    } else { newError = data.message || "报修失败"; }
    newLoading = false;
  }

  const statusMap: Record<string, string> = { IN_MAINTENANCE: "维修中", COMPLETED: "已完成" };
  const statusColors: Record<string, string> = { IN_MAINTENANCE: "bg-yellow-100 text-yellow-800", COMPLETED: "bg-green-100 text-green-800" };

  function fmt(d: string) { return new Date(d).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-2xl font-bold">刀具维修</h2>
  <button class="btn-primary" on:click={() => showNewModal = true}>+ 报修</button>
</div>

<div class="card mb-6">
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label class="label">扫码搜索刀具</label>
      <ScanInput bind:value={search} placeholder="扫描或输入刀具编码..." on:submit={(e) => { search = e.detail; loadRecords(); }} on:input={(e) => { search = e.detail; loadRecords(); }} />
    </div>
    <div>
      <label class="label">状态筛选</label>
      <select class="input" bind:value={statusFilter} on:change={applyFilter}>
        {#each statusOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
  </div>
</div>

<div class="card">
  {#if loading}
    <div class="text-center py-8 text-gray-400">加载中...</div>
  {:else if records.length === 0}
    <EmptyState message="暂无维修记录" icon="🔨" />
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">时间</th>
            <th class="table-header">刀具编码</th>
            <th class="table-header">刀具名称</th>
            <th class="table-header">故障描述</th>
            <th class="table-header">状态</th>
            <th class="table-header">报修人</th>
            <th class="table-header">费用</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each records as r}
            <tr class="hover:bg-gray-50">
              <td class="table-cell text-gray-500">{fmt(r.createdAt)}</td>
              <td class="table-cell font-mono text-blue-600">{r.tool?.toolCode || "—"}</td>
              <td class="table-cell">{r.tool?.name || "—"}</td>
              <td class="table-cell max-w-xs truncate">{r.description}</td>
              <td class="table-cell"><span class="badge {statusColors[r.status]}">{statusMap[r.status]}</span></td>
              <td class="table-cell">{r.reporter?.displayName || "—"}</td>
              <td class="table-cell">{r.cost ? `¥${Number(r.cost).toFixed(2)}` : "—"}</td>
              <td class="table-cell">
                <a href="/app/maintenance/{r.id}" class="text-blue-600 hover:text-blue-800 text-xs">详情</a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- New maintenance modal -->
<Modal title="刀具报修" bind:show={showNewModal} confirmText="提交报修" on:confirm={submitNewMaintenance} {newLoading} on:close={() => { showNewModal = false; scanCode = ""; scannedTool = null; newError = ""; }}>
  {#if newError}
    <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-3">{newError}</div>
  {/if}
  <div class="space-y-3">
    <div>
      <label class="label">扫描刀具编码</label>
      <ScanInput bind:value={scanCode} placeholder="扫码或输入..." on:submit={(e) => onScanForNew(e.detail)} />
    </div>
    {#if scannedTool}
      <div class="bg-blue-50 text-blue-700 text-sm px-3 py-2 rounded-lg">
        已找到：{scannedTool.toolCode} - {scannedTool.name}（库存：{scannedTool.quantity}）
      </div>
    {/if}
    <div>
      <label class="label">故障描述 <span class="text-red-500">*</span></label>
      <textarea class="input" rows="3" bind:value={description} placeholder="请描述故障情况"></textarea>
    </div>
    <div>
      <label class="label">备注</label>
      <input class="input" bind:value={notes} placeholder="可选" />
    </div>
  </div>
</Modal>
