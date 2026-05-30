<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let loading = false;
  let error = "";
  let notes = "";
  let stats = { totalTools: 0, toolCount: 0 };

  onMount(async () => {
    try {
      const res = await fetch("/api/tools/stats");
      if (res.ok) stats = await res.json();
    } catch {}
  });

  async function startStocktaking() {
    loading = true; error = "";
    const res = await fetch("/api/stocktaking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (data.success) {
      goto(`/app/stocktaking/${data.stocktaking.id}`);
    } else { error = data.message || "创建失败"; }
    loading = false;
  }
</script>

<div class="max-w-2xl mx-auto">
  <div class="flex items-center gap-4 mb-6">
    <a href="/app/stocktaking" class="text-gray-400 hover:text-gray-600">&larr; 返回</a>
    <h2 class="text-2xl font-bold">新建盘点</h2>
  </div>

  <div class="card">
    {#if error}
      <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>
    {/if}
    <div class="bg-blue-50 text-blue-700 text-sm px-4 py-3 rounded-lg mb-4">
      系统将自动对所有在库刀具创建盘点项，共 <strong>{stats.totalTools || 0}</strong> 把刀具。
    </div>
    <div class="mb-4">
      <label class="label">备注（可选）</label>
      <textarea class="input" rows="3" bind:value={notes} placeholder="盘点说明"></textarea>
    </div>
    <button class="btn-primary" on:click={startStocktaking} disabled={loading}>
      {loading ? "创建中..." : "开始盘点"}
    </button>
  </div>
</div>
