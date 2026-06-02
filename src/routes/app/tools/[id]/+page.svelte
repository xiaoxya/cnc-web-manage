<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import Modal from "$lib/components/ui/Modal.svelte";
  import ScanInput from "$lib/components/ScanInput.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";

  let tool: any = null;
  let categories: any[] = [];
  let locations: any[] = [];
  let loading = true;
  let editing = false;
  let showDeleteModal = false;
  
  let deleteLoading = false;
  let reEnableLoading = false;
  let error = "";
  let userRole = "";

  const statusOptions = [
    { value: "IN_STOCK", label: "在库" },
    { value: "IN_USE", label: "使用中" },
    { value: "MAINTENANCE", label: "维修中" },
    { value: "SCRAPPED", label: "已报废" },
  ];

  let form: any = {};

  $: toolId = $page.params.id;

  onMount(async () => {
    const [toolRes, catRes, locRes, userRes] = await Promise.all([
      fetch(`/api/tools/${toolId}`),
      fetch("/api/categories"),
      fetch("/api/locations"),
      fetch("/api/auth/me"),
    ]);
    if (toolRes.ok) { tool = await toolRes.json(); form = { ...tool }; }
    if (catRes.ok) categories = await catRes.json();
    if (locRes.ok) locations = await locRes.json();
    if (userRes.ok) { const u = await userRes.json(); userRole = u.user?.role || ""; }
    loading = false;
  });

  async function saveEdit() {
    error = "";
    try {
      const res = await fetch(`/api/tools/${toolId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, specification: form.specification, material: form.material,
          brand: form.brand, categoryId: form.categoryId, locationId: form.locationId,
          quantity: form.quantity, minQuantity: form.minQuantity, unit: form.unit,
          price: form.price, notes: form.notes, status: form.status,
        }),
      });
      const data = await res.json();
      if (data.success) { tool = data.tool; editing = false; }
      else { error = data.message; }
    } catch { error = "保存失败"; }
  }

  async function deleteTool() {
    deleteLoading = true;
    const res = await fetch(`/api/tools/${toolId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) goto("/app/tools");
    else { error = data.message; deleteLoading = false; showDeleteModal = false; }
  }

  async function reEnableTool() {
    if (!confirm("确定要重新启用已报废刀具 " + tool.toolCode + " - " + tool.name + " 吗？\n启用后状态将变为'在库'，库存重置为 1。")) return;
    try {
      const res = await fetch(`/api/tools/${toolId}`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else { alert(data.message || "启用失败"); }
    } catch (e) {
      alert("操作失败");
    }
  }

  const statusMap: Record<string, string> = {
    IN_STOCK: "在库", IN_USE: "使用中", MAINTENANCE: "维修中", SCRAPPED: "已报废"
  };
  const statusColors: Record<string, string> = {
    IN_STOCK: "bg-green-100 text-green-800", IN_USE: "bg-blue-100 text-blue-800",
    MAINTENANCE: "bg-yellow-100 text-yellow-800", SCRAPPED: "bg-red-100 text-red-800",
  };
  const typeMap: Record<string, string> = { IN: "入库", OUT: "出库" };
  const maintMap: Record<string, string> = { IN_MAINTENANCE: "维修中", COMPLETED: "已完成" };

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
</script>

<div class="flex items-center gap-4 mb-6">
  <a href="/app/tools" class="text-gray-400 hover:text-gray-600">&larr; 返回</a>
  <h2 class="text-2xl font-bold">刀具详情</h2>
</div>

{#if loading}
  <div class="text-center py-12 text-gray-400">加载中...</div>
{:else if !tool}
  <EmptyState message="刀具不存在" icon="🔧" />
{:else}
  {#if error}
    <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Tool info -->
    <div class="lg:col-span-2">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">基本信息</h3>
          <div class="flex gap-2">
            {#if tool.status === "SCRAPPED"}
              {#if userRole === "ADMIN"}
                <button class="btn-secondary btn-sm" on:click={reEnableTool}>重新启用</button>
              {/if}
            {:else}
              {#if !editing}
                <button class="btn-secondary btn-sm" on:click={() => editing = true}>编辑</button>
                {#if userRole === "ADMIN"}
                  <button class="btn-danger btn-sm" on:click={() => showDeleteModal = true}>报废</button>
                {/if}
              {/if}
            {/if}
          </div>
        </div>

        {#if editing}
          <!-- Edit mode -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="label">名称</label>
              <input class="input" bind:value={form.name} />
            </div>
            <div>
              <label class="label">分类</label>
              <select class="input" bind:value={form.categoryId}>
                {#each categories as cat}
                  <option value={cat.id}>{cat.name}</option>
                {/each}
              </select>
            </div>
            <div>
              <label class="label">库位</label>
              <select class="input" bind:value={form.locationId}>
                <option value={null}>无</option>
                {#each locations as loc}
                  <option value={loc.id}>{loc.code} - {loc.name}</option>
                {/each}
              </select>
            </div>
            <div>
              <label class="label">规格型号</label>
              <input class="input" bind:value={form.specification} />
            </div>
            <div>
              <label class="label">材质</label>
              <input class="input" bind:value={form.material} />
            </div>
            <div>
              <label class="label">品牌</label>
              <input class="input" bind:value={form.brand} />
            </div>
            <div>
              <label class="label">库存</label>
              <input type="number" class="input" bind:value={form.quantity} min="0" />
            </div>
            <div>
              <label class="label">最低预警</label>
              <input type="number" class="input" bind:value={form.minQuantity} min="0" />
            </div>
            <div>
              <label class="label">单价</label>
              <input type="number" class="input" bind:value={form.price} min="0" step="0.01" />
            </div>
            <div>
              <label class="label">单位</label>
              <input class="input" bind:value={form.unit} />
            </div>
            <div>
              <label class="label">状态</label>
              <select class="input" bind:value={form.status}>
                {#each statusOptions as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="label">备注</label>
              <textarea class="input" bind:value={form.notes} rows="2"></textarea>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button class="btn-primary" on:click={saveEdit}>保存</button>
            <button class="btn-secondary" on:click={() => editing = false}>取消</button>
          </div>
        {:else}
          <!-- View mode -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div class="md:col-span-3">
              <span class="text-gray-500">编码</span>
              <p class="font-mono font-semibold text-blue-700">{tool.toolCode}</p>
            </div>
            <div>
              <span class="text-gray-500">名称</span>
              <p class="font-medium">{tool.name}</p>
            </div>
            <div>
              <span class="text-gray-500">状态</span>
              <p><span class="badge {statusColors[tool.status]}">{statusMap[tool.status]}</span></p>
            </div>
            <div><span class="text-gray-500">分类</span><p>{tool.category?.name || "-"}</p></div>
            <div><span class="text-gray-500">库位</span><p>{tool.location?.code ? `${tool.location.code} - ${tool.location.name}` : "-"}</p></div>
            <div><span class="text-gray-500">规格型号</span><p>{tool.specification || "-"}</p></div>
            <div><span class="text-gray-500">材质</span><p>{tool.material || "-"}</p></div>
            <div><span class="text-gray-500">品牌</span><p>{tool.brand || "-"}</p></div>
            <div>
              <span class="text-gray-500">库存</span>
              <p class="{tool.status !== 'SCRAPPED' && tool.quantity <= tool.minQuantity ? 'text-red-600 font-bold' : ''}">
                {tool.status === "SCRAPPED" ? "-" : `${tool.quantity} ${tool.unit}`}
              </p>
            </div>
            <div><span class="text-gray-500">最低预警</span><p>{tool.status === "SCRAPPED" ? "-" : `${tool.minQuantity} ${tool.unit}`}</p></div>
            <div><span class="text-gray-500">单价</span><p>{tool.price ? `¥${Number(tool.price).toFixed(2)}` : "-"}</p></div>
            <div><span class="text-gray-500">单位</span><p>{tool.unit}</p></div>
            {#if tool.notes}
              <div class="md:col-span-3"><span class="text-gray-500">备注</span><p class="text-gray-600">{tool.notes}</p></div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Transaction history -->
      {#if tool.status !== "SCRAPPED"}
      <div class="card mt-6">
        <h3 class="text-lg font-semibold mb-4">出入库记录</h3>
        {#if tool.transactions?.length === 0}
          <p class="text-gray-400 text-sm">暂无记录</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="table-header">时间</th>
                  <th class="table-header">类型</th>
                  <th class="table-header text-right">数量</th>
                  <th class="table-header">操作人</th>
                  <th class="table-header">备注</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each tool.transactions as tx}
                  <tr>
                    <td class="table-cell text-gray-500">{fmt(tx.createdAt)}</td>
                    <td class="table-cell">
                      <span class="badge {tx.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">{typeMap[tx.type]}</span>
                    </td>
                    <td class="table-cell text-right font-medium">{tx.quantity}</td>
                    <td class="table-cell">{tx.operator?.displayName || "-"}</td>
                    <td class="table-cell text-gray-500">{tx.notes || "-"}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
      {/if}
    </div>

    <!-- Maintenance history -->
    <div>
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">维修记录</h3>
        {#if tool.maintenance?.length === 0}
          <p class="text-gray-400 text-sm">暂无维修记录</p>
        {:else}
          <div class="space-y-4">
            {#each tool.maintenance as m}
              <div class="border-l-2 {m.status === 'COMPLETED' ? 'border-green-500' : 'border-yellow-500'} pl-3">
                <div class="flex items-center gap-2 mb-1">
                  <span class="badge {m.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">{maintMap[m.status]}</span>
                  <span class="text-xs text-gray-400">{fmt(m.createdAt)}</span>
                </div>
                <p class="text-sm text-gray-600">{m.description}</p>
                {#if m.cost}
                  <p class="text-xs text-gray-500 mt-1">费用：¥{Number(m.cost).toFixed(2)}</p>
                {/if}
                {#if m.notes}
                  <p class="text-xs text-gray-400 mt-1">备注：{m.notes}</p>
                {/if}
                <p class="text-xs text-gray-400 mt-1">报修人：{m.reporter?.displayName || "-"}</p>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Delete/Scrap modal -->
  <Modal title="确认报废" bind:show={showDeleteModal} confirmText="确认报废" cancelText="取消" variant="danger" {deleteLoading} on:confirm={deleteTool} on:close={() => showDeleteModal = false}>
    <p>确定要将刀具 <strong>{tool.toolCode} - {tool.name}</strong> 标记为已报废？？</p>
  </Modal>


{/if}