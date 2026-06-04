<script lang="ts">
  import { onMount } from "svelte";
  import ScanInput from "$lib/components/ScanInput.svelte";
  import Pagination from "$lib/components/ui/Pagination.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";

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
  let currentUserRole = "";
  let showScrapModal = false;
  let scrapTarget: any = null;
  let scrapLoading = false;
  let scrapError = "";
  let success = "";
  let activeTab = "all";
  let inUseItems: any[] = [];
  let factorySummary: any[] = [];
  let factories: any[] = [];
  let inUseSearch = "";
  let inUseFactoryId = "";
  let inUseLoading = false;
  let returnTarget: any = null;
  let showReturnModal = false;
  let returnLoading = false;
  let returnError = "";
  let showOutModal = false;
  let outTarget: any = null;
  let outFactoryId = "";
  let outNotes = "";
  let outLoading = false;
  let outError = "";

  const statusOptions = [
    { value: "", label: "全部" },
    { value: "IN_STOCK", label: "在库" },
    { value: "IN_USE", label: "使用中" },
    { value: "MAINTENANCE", label: "维修中" },
    { value: "SCRAPPED", label: "已报废" },
  ];

  onMount(async () => {
    await Promise.all([loadTools(), loadOptions(), loadUser(), loadFactories()]);
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

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data?.user) currentUserRole = data.user.role;
      }
    } catch {}
  }

  async function loadInUse() {
    inUseLoading = true;
    try {
      const params = new URLSearchParams();
      if (inUseSearch) params.set("search", inUseSearch);
      if (inUseFactoryId) params.set("factoryId", inUseFactoryId);
      const res = await fetch("/api/tools/in-use?" + params.toString());
      if (res.ok) {
        const data = await res.json();
        inUseItems = data.items || [];
        factorySummary = data.factorySummary || [];
      }
    } catch {}
    inUseLoading = false;
  }

  function switchTab(tab: string) {
    activeTab = tab;
    if (tab === "inuse") loadInUse();
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

  async function scrapTool() {
    if (!scrapTarget) return;
    scrapLoading = true; scrapError = "";
    try {
      const res = await fetch(`/api/tools/${scrapTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showScrapModal = false; scrapTarget = null;
        loadTools();
      } else { scrapError = data.message || "操作失败"; }
    } catch { scrapError = "网络错误"; }
    scrapLoading = false;
  }

  async function returnTool() {
    if (!returnTarget) return;
    returnLoading = true; returnError = "";
    try {
      const res = await fetch("/api/tools/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: returnTarget.id, factoryId: returnTarget.factoryId }),
      });
      const data = await res.json();
      if (data.success) {
        showReturnModal = false; returnTarget = null;
        // 刷新两个标签页数据
        loadInUse();
        if (activeTab === "all") loadTools();
        // 显示短暂成功提示
        success = "回收成功，刀具已归库";
        setTimeout(() => success = "", 2000);
      } else { returnError = data.message || "操作失败"; }
    } catch { returnError = "网络错误"; }
    returnLoading = false;
  }

  async function loadFactories() {
    try {
      const res = await fetch("/api/factories");
      if (res.ok) factories = await res.json();
    } catch {}
  }

  async function outboundTool() {
    if (!outTarget) return;
    if (!outFactoryId) {
      outError = "请选择目标工厂";
      return;
    }
    outLoading = true;
    outError = "";
    try {
      const res = await fetch("/api/tools/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OUT",
          factoryId: Number(outFactoryId),
          items: [{ toolId: outTarget.id, quantity: 1, notes: outNotes || null }],
        }),
      });
      const data = await res.json();
      if (data.success) {
        showOutModal = false;
        outTarget = null;
        outFactoryId = "";
        outNotes = "";
        loadTools();
        if (activeTab === "inuse") loadInUse();
        success = "出库成功";
        setTimeout(() => success = "", 2000);
      } else {
        outError = data.message || "操作失败";
      }
    } catch {
      outError = "网络错误";
    }
    outLoading = false;
  }

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
  {#if currentUserRole === "ADMIN"}
  <div class="flex gap-2">
    <a href="/app/tools/new" class="btn-primary">➕ 新增刀具</a>
    <a href="/app/tools/batch-in" class="btn-success btn-sm">批量入库</a>
    <a href="/app/tools/batch-out" class="btn-primary">➖批量出库</a>
  </div>
  {/if}
</div>

<!-- Tab bar -->
<div class="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
  <button class="px-4 py-2 text-sm rounded-md {activeTab === 'all' ? 'bg-white shadow font-medium' : 'text-gray-600 hover:text-gray-800'}" on:click={() => switchTab('all')}>全部刀具</button>
  <button class="px-4 py-2 text-sm rounded-md {activeTab === 'inuse' ? 'bg-white shadow font-medium' : 'text-gray-600 hover:text-gray-800'}" on:click={() => switchTab('inuse')}>工厂在用</button>
</div>

{#if activeTab === "all"}
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
              <td class="table-cell text-right {getLowStockClass(tool)}">{tool.status === "SCRAPPED" ? "-" : tool.quantity + " " + tool.unit}</td>
              <td class="table-cell text-right text-gray-500">{tool.status === "SCRAPPED" ? "-" : tool.minQuantity}</td>
              <td class="table-cell">
                <span class="badge {statusColors[tool.status]}">{tool.status === 'IN_USE' && tool.factoryName ? '使用中 - ' + tool.factoryCode : statusMap[tool.status]}</span>
              </td>
              <td class="table-cell">
                <a href="/app/tools/{tool.id}" class="text-blue-600 hover:text-blue-800 text-sm">详情</a>
                {#if tool.status !== "SCRAPPED" && currentUserRole === "ADMIN"}
                  <button class="text-green-600 hover:text-green-800 text-sm ml-2" on:click={() => { outTarget = tool; showOutModal = true; }}>出库</button>
                  <button class="text-red-600 hover:text-red-800 text-sm ml-2" on:click={() => { scrapTarget = tool; showScrapModal = true; }}>报废</button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <Pagination {page} {pageSize} {total} on:pageChange={onPageChange} />
  {/if}
</div>
{/if}

<!-- In-use tab -->
{#if activeTab === "inuse"}
  {#if success}
    <div class="bg-green-50 text-green-600 text-sm px-4 py-2 rounded-lg mb-4">{success}</div>
  {/if}
  {#if inUseLoading}
    <div class="text-center py-8 text-gray-400">加载中...</div>
  {:else}
    <!-- Filters for in-use -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="label">搜索</label>
          <input class="input" bind:value={inUseSearch} placeholder="编码/名称/规格..." on:keydown={(e) => { if (e.key === "Enter") loadInUse(); }} />
        </div>
        <div>
          <label class="label">工厂</label>
          <select class="input" bind:value={inUseFactoryId} on:change={loadInUse}>
            <option value="">全部工厂</option>
            {#each factorySummary as f}
              <option value={f.factoryId}>{f.factoryCode} - {f.factoryName}</option>
            {/each}
          </select>
        </div>
        <div class="flex items-end">
          <button class="btn-primary btn-sm" on:click={loadInUse}>筛选</button>
        </div>
      </div>
    </div>

    {#if factorySummary.length > 0}
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      {#each factorySummary as f}
        <div class="card text-center">
          <p class="text-xs text-gray-500">{f.factoryCode}</p>
          <p class="text-sm font-medium truncate" title={f.factoryName}>{f.factoryName}</p>
          <p class="text-2xl font-bold text-blue-600">{f.toolCount}</p>
          <p class="text-xs text-gray-400">把</p>
        </div>
      {/each}
    </div>
    {/if}

    <div class="card">
      {#if inUseItems.length === 0}
        <div class="text-center py-8 text-gray-400"><p class="text-lg">暂无工厂在用刀具</p><p class="text-sm mt-1">批量出库到工厂后，这里会显示刀具去向</p></div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="table-header">刀具编码</th>
                <th class="table-header">名称</th>
                <th class="table-header">规格</th>
                <th class="table-header">分类</th>
                <th class="table-header">所在工厂</th>
                <th class="table-header text-right">数量</th>
                <th class="table-header">出库时间</th>
                <th class="table-header">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each inUseItems as item}
                <tr class="hover:bg-gray-50">
                  <td class="table-cell font-mono text-blue-600">{item.toolCode}</td>
                  <td class="table-cell font-medium">{item.name}</td>
                  <td class="table-cell text-gray-500">{item.specification || "—"}</td>
                  <td class="table-cell">{item.categoryName || "—"}</td>
                  <td class="table-cell">
                    <span class="badge bg-purple-100 text-purple-800">{item.factoryCode}</span>
                    <span class="text-sm text-gray-500 ml-1">{item.factoryName}</span>
                  </td>
                  <td class="table-cell text-right">1 把</td>
                  <td class="table-cell text-gray-500 text-xs">{new Date(item.lastOutTime).toLocaleDateString("zh-CN")}</td>
                  <td class="table-cell">
                    <a href="/app/tools/{item.id}" class="text-blue-600 hover:text-blue-800 text-sm">详情</a>
                    {#if currentUserRole === "ADMIN"}
                    <button class="text-green-600 hover:text-green-800 text-sm ml-2" on:click={() => { returnTarget = item; showReturnModal = true; }}>回收</button>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
{/if}

<!-- Return modal -->
<Modal title="刀具回收入库" bind:show={showReturnModal} confirmText="确认回收" variant="success" loading={returnLoading} on:confirm={returnTool} on:close={() => { showReturnModal = false; returnTarget = null; returnError = ""; }}>
  {#if returnError}
    <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-3">{returnError}</div>
  {/if}
  {#if returnTarget}
    <p>确定将以下刀具从工厂回收入库？</p>
    <p class="mt-2 font-semibold">{returnTarget.toolCode} - {returnTarget.name}</p>
    <p class="text-sm text-gray-500 mt-1">当前所在工厂：{returnTarget.factoryName}</p>
    <p class="text-sm text-gray-500">回收后将自动增加库存并恢复为“在库”状态</p>
  {/if}
</Modal>

<Modal title="单把刀具出库" bind:show={showOutModal} confirmText="确认出库" variant="primary" loading={outLoading} on:confirm={outboundTool} on:close={() => { showOutModal = false; outTarget = null; outFactoryId = ""; outNotes = ""; outError = ""; }}>
  {#if outError}
    <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-3">{outError}</div>
  {/if}
  {#if outTarget}
    <p>确定将以下刀具出库到指定工厂？</p>
    <p class="mt-2 font-semibold">{outTarget.toolCode} - {outTarget.name}</p>
    <div class="mt-4">
      <label class="label">目标工厂 <span class="text-red-500">*</span></label>
      {#if factories.length > 0}
        <select class="input" bind:value={outFactoryId}>
          <option value="">请选择工厂</option>
          {#each factories as f}
            <option value={f.id}>{f.code} - {f.name}</option>
          {/each}
        </select>
      {:else}
        <div class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          暂未加载到工厂列表，请稍后重试或先检查工厂管理是否已有数据。
        </div>
      {/if}
    </div>
    <div class="mt-4">
      <label class="label">备注</label>
      <input class="input" bind:value={outNotes} placeholder="可选" />
    </div>
    <p class="text-sm text-gray-500 mt-2">出库后该刀具会进入“使用中”状态，数量记为 1 把。</p>
  {/if}
</Modal>

<!-- Scrap modal -->
<Modal title="刀具报废" bind:show={showScrapModal} confirmText="确认报废" variant="danger" loading={scrapLoading} on:confirm={scrapTool} on:close={() => { showScrapModal = false; scrapTarget = null; scrapError = ""; }}>
  {#if scrapError}
    <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-3">{scrapError}</div>
  {/if}
  {#if scrapTarget}
    <p>确定将以下刀具标记为报废？</p>
    <p class="mt-2 font-semibold">{scrapTarget.toolCode} - {scrapTarget.name}</p>
    <p class="text-sm text-gray-500 mt-1">报废后该刀具将不再出现在列表中</p>
  {/if}
</Modal>
