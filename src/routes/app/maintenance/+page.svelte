<script lang="ts">
  import { onMount } from "svelte";
  import ScanInput from "$lib/components/ScanInput.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";

  let records: any[] = [];
  let activeMaintTab = "records";
  let stats: any = { vendorStats: [], monthStats: [], topTools: [], totalRecords: 0, totalCost: 0, inMaintenance: 0 };
  let statsLoading = false;
  let statsVendor = "";
  let statsYear = new Date().getFullYear().toString();
  let statsMonth = "";
  let loading = true;
  let statusFilter = "";
  let search = "";
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + 1 - i);

  // New maintenance modal
  let showNewModal = false;
  let scanCode = "";
  let scanTimer: ReturnType<typeof setTimeout> | null = null;
  let scannedTool: any = null;
  let description = "";
  let notes = "";
  let repairVendor = "";
  let vendors: any[] = [];
  let newLoading = false;
  let newError = "";

  const statusOptions = [
    { value: "", label: "全部" },
    { value: "IN_MAINTENANCE", label: "维修中" },
    { value: "COMPLETED", label: "已完成" },
  ];

  onMount(() => { loadRecords(); loadVendors(); loadStats(); });

  async function loadStats() {
    statsLoading = true;
    try {
      const params = new URLSearchParams();
      if (statsVendor) params.set("vendor", statsVendor);
      if (statsMonth) params.set("month", statsMonth);
      if (statsYear) params.set("year", statsYear);
      const res = await fetch("/api/maintenance/stats?" + params);
      if (res.ok) stats = await res.json();
    } catch {}
    statsLoading = false;
  }

  async function loadVendors() {
    try {
      const res = await fetch("/api/repair-vendors");
      if (res.ok) vendors = await res.json();
    } catch {}
  }

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

  async function onScanInput(val: string) {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(() => onScanForNew(val), 300);
  }

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
      body: JSON.stringify({ toolId: scannedTool.id, description, notes, repairVendor }),
    });
    const data = await res.json();
    if (data.success) {
      showNewModal = false;
      scannedTool = null;
      description = "";
      notes = "";
      repairVendor = "";
      scanCode = "";
      loadRecords();
    } else { newError = data.message || "报修失败"; }
    newLoading = false;
  }

  const statusMap: Record<string, string> = { IN_MAINTENANCE: "维修中", COMPLETED: "已完成" };

  const toolStatusMap: Record<string, string> = { IN_STOCK: '在库', IN_USE: '使用中', MAINTENANCE: '维修中', SCRAPPED: '已报废' };
  const statusColors: Record<string, string> = { IN_MAINTENANCE: "bg-yellow-100 text-yellow-800", COMPLETED: "bg-green-100 text-green-800" };

  function fmt(d: string) { return new Date(d).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-2xl font-bold">刀具维修</h2>
</div>

<!-- Tabs -->
<div class="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
  <button class="px-4 py-2 text-sm rounded-md {activeMaintTab === 'records' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}" on:click={() => activeMaintTab = "records"}>维修记录</button>
  <button class="px-4 py-2 text-sm rounded-md {activeMaintTab === 'stats' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}" on:click={() => { activeMaintTab = "stats"; loadStats(); }}>维修统计</button>
</div>

<div class="flex items-center justify-between mb-6">
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

{#if activeMaintTab === "stats"}
  <div class="space-y-6">
    <!-- Filters -->
    <div class="card">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="label">维修厂家</label>
          <select class="input" bind:value={statsVendor} on:change={loadStats}>
            <option value="">全部厂家</option>
            {#each vendors as v}
              <option value={v.name}>{v.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="label">年份</label>
          <select class="input" bind:value={statsYear} on:change={loadStats}>
            {#each yearOptions as y}
              <option value={y}>{y}年</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="label">月份</label>
          <select class="input" bind:value={statsMonth} on:change={loadStats}>
            <option value="">全部</option>
            {#each Array(12) as _, i}
              {@const m = String(i + 1).padStart(2, "0")}
              <option value={m}>{m}月</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    {#if statsLoading}
      <div class="text-center py-8 text-gray-400">加载中...</div>
    {:else}
      <!-- Summary cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-2xl">🔧</div>
            <div>
              <p class="text-sm text-gray-500">维修总次数</p>
              <p class="text-3xl font-bold">{stats.totalRecords}</p>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center text-2xl">🔨</div>
            <div>
              <p class="text-sm text-gray-500">维修中</p>
              <p class="text-3xl font-bold text-red-600">{stats.inMaintenance}</p>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-2xl">💰</div>
            <div>
              <p class="text-sm text-gray-500">维修总费用</p>
              <p class="text-3xl font-bold text-green-600">¥{stats.totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- By vendor -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">按维修厂家统计</h3>
        {#if stats.vendorStats.length === 0}
          <p class="text-gray-400 text-sm">暂无数据</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="table-header">维修厂家</th>
                  <th class="table-header">维修次数</th>
                  <th class="table-header">维修费用</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each stats.vendorStats as vs}
                  <tr>
                    <td class="table-cell font-medium">{vs.vendor || "未指定"}</td>
                    <td class="table-cell">{vs.count} 次</td>
                    <td class="table-cell">¥{vs.cost.toFixed(2)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

      <!-- By month -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">按月份统计</h3>
        {#if stats.monthStats.length === 0}
          <p class="text-gray-400 text-sm">暂无数据</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="table-header">月份</th>
                  <th class="table-header">维修次数</th>
                  <th class="table-header">维修费用</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each stats.monthStats as ms}
                  <tr>
                    <td class="table-cell font-medium">{ms.month}</td>
                    <td class="table-cell">{ms.count} 次</td>
                    <td class="table-cell">¥{ms.cost.toFixed(2)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

      <!-- Top tools by maintenance count -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">刀具维修次数排行</h3>
        {#if stats.topTools.length === 0}
          <p class="text-gray-400 text-sm">暂无数据</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="table-header">排名</th>
                  <th class="table-header">刀具编码</th>
                  <th class="table-header">刀具名称</th>
                  <th class="table-header">维修次数</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each stats.topTools as tt, i}
                  <tr>
                    <td class="table-cell text-gray-500">{i + 1}</td>
                    <td class="table-cell font-mono text-blue-600">{tt.toolCode}</td>
                    <td class="table-cell">{tt.name}</td>
                    <td class="table-cell">
                      <span class="badge {tt.maintenanceCount > 5 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}">
                        {tt.maintenanceCount} 次
                      </span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<!-- New maintenance modal -->
<Modal title="刀具报修" bind:show={showNewModal} confirmText="提交报修" on:confirm={submitNewMaintenance} {newLoading} on:close={() => { showNewModal = false; scanCode = ""; scannedTool = null; newError = ""; }}>
  {#if newError}
    <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-3">{newError}</div>
  {/if}
  <div class="space-y-3">
    <div>
      <label class="label">扫描刀具编码</label>
      <ScanInput bind:value={scanCode} placeholder="扫码或输入..." on:submit={(e) => onScanForNew(e.detail)} on:input={(e) => onScanInput(e.detail)} />
    </div>
    {#if scannedTool}
      <div class="bg-blue-50 text-blue-700 text-sm px-3 py-2 rounded-lg">
        已找到：{scannedTool.toolCode} - {scannedTool.name}（状态：{toolStatusMap[scannedTool.status] || scannedTool.status}）
      </div>
    {/if}
    <div>
      <label class="label">维修厂家</label>
      <select class="input" bind:value={repairVendor}>
        <option value="">请选择厂家</option>
        {#each vendors as v}
          <option value={v.name}>{v.name}</option>
        {/each}
      </select>
      <input class="input mt-2" bind:value={repairVendor} placeholder="或手动输入厂家名称" />
    </div>
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
