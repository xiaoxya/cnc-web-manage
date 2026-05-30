<script lang="ts">
  import { onMount } from "svelte";
  import ScanInput from "$lib/components/ScanInput.svelte";
  import Pagination from "$lib/components/ui/Pagination.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";

  let tools: any[] = [];
  let total = 0;
  let page = 1;
  let pageSize = 20;
  let search = "";
  let categoryId = "";
  let locationId = "";
  let status = "";
  let categories: any[] = [];
  let locations: any[] = [];
  let loading = true;
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  const statusOptions = [
    { value: "", label: "全部" },
    { value: "IN_STOCK", label: "在库" },
    { value: "IN_USE", label: "使用中" },
    { value: "MAINTENANCE", label: "维修中" },
  ];

  onMount(async () => {
    await Promise.all([loadTools(), loadOptions()]);
  });

  async function loadOptions() {
    try {
      const [catRes, locRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/locations"),
      ]);
      if (catRes.ok) categories = await catRes.json();
      if (locRes.ok) locations = await locRes.json();
    } catch {}
  }

  async function loadTools() {
    loading = true;
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (categoryId) params.set("categoryId", categoryId);
      if (locationId) params.set("locationId", locationId);
      if (status) params.set("status", status);

      const res = await fetch(`/api/tools?${params}`);
      if (res.ok) {
        const data = await res.json();
        tools = data.tools;
        total = data.total;
      }
    } catch {}
    loading = false;
  }

  function onSearchInput(val: string) {
    search = val;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { page = 1; loadTools(); }, 300);
  }

  function onSearchScan(val: string) {
    if (val) {
      search = val;
      page = 1;
      loadTools();
    }
  }

  function onPageChange(e: CustomEvent) {
    page = e.detail;
    loadTools();
  }

  function applyFilter() { page = 1; loadTools(); }

  const statusMap: Record<string, string> = {
    IN_STOCK: "在库", IN_USE: "使用中", MAINTENANCE: "维修中", SCRAPPED: "已报废"
  };
  const statusColors: Record<string, string> = {
    IN_STOCK: "bg-green-100 text-green-800", IN_USE: "bg-blue-100 text-blue-800",
    MAINTENANCE: "bg-yellow-100 text-yellow-800", SCRAPPED: "bg-red-100 text-red-800",
  };

  function getLowStockClass(tool: any): string {
    if (tool.quantity <= tool.minQuantity) return "text-red-600 font-semibold";
    return "";
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-2xl font-bold">刀具列表</h2>
  <div class="flex gap-2">
    <a href="/app/tools/new" class="btn-primary">+ 新增刀具</a>
    <a href="/app/tools/batch-in" class="btn-success btn-sm">批量入库</a>
    <a href="/app/tools/batch-out" class="btn-secondary btn-sm">批量出库</a>
  </div>
</div>

<!-- Filters -->
<div class="card mb-6">
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div>
      <label class="label">扫码/搜索</label>
      <ScanInput bind:value={search} placeholder="扫描或输入刀具编码/名称..." on:submit={(e) => onSearchScan(e.detail)} on:input={(e) => onSearchInput(e.detail)} />
    </div>
    <div>
      <label class="label">分类</label>
      <select class="input" bind:value={categoryId} on:change={applyFilter}>
        <option value="">全部分类</option>
        {#each categories as cat}
          <option value={cat.id}>{cat.name} ({cat.code})</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">库位</label>
      <select class="input" bind:value={locationId} on:change={applyFilter}>
        <option value="">全部库位</option>
        {#each locations as loc}
          <option value={loc.id}>{loc.code} - {loc.name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">状态</label>
      <select class="input" bind:value={status} on:change={applyFilter}>
        {#each statusOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
  </div>
</div>

<!-- Tool table -->
<div class="card">
  {#if loading}
    <div class="text-center py-8 text-gray-400">加载中...</div>
  {:else if tools.length === 0}
    <EmptyState message="没有找到刀具" icon="🔧" />
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">刀具编码</th>
            <th class="table-header">名称</th>
            <th class="table-header">分类</th>
            <th class="table-header">规格</th>
            <th class="table-header">库位</th>
            <th class="table-header text-right">库存</th>
            <th class="table-header text-right">最低预警</th>
            <th class="table-header">状态</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each tools as tool}
            <tr class="hover:bg-gray-50">
              <td class="table-cell font-mono text-blue-600">{tool.toolCode}</td>
              <td class="table-cell font-medium">{tool.name}</td>
              <td class="table-cell">{tool.category?.name || "—"}</td>
              <td class="table-cell text-gray-500">{tool.specification || "—"}</td>
              <td class="table-cell">{tool.location?.code || "—"}</td>
              <td class="table-cell text-right {getLowStockClass(tool)}">{tool.quantity} {tool.unit}</td>
              <td class="table-cell text-right text-gray-500">{tool.minQuantity}</td>
              <td class="table-cell">
                <span class="badge {statusColors[tool.status]}">{statusMap[tool.status]}</span>
              </td>
              <td class="table-cell">
                <a href="/app/tools/{tool.id}" class="text-blue-600 hover:text-blue-800 text-sm">详情</a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <Pagination {page} {pageSize} {total} on:pageChange={onPageChange} />
  {/if}
</div>
