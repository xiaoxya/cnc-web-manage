<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let loading = false;
  let error = "";
  let factories: any[] = [];
  let selectedFactoryId: number | null = null;
  let inUseCount = 0;
  let inUseLoading = false;

  onMount(async () => {
    try {
      const r = await fetch("/api/factories");
      if (r.ok) factories = await r.json();
    } catch {}
  });

  async function loadInUseCount() {
    if (!selectedFactoryId) { inUseCount = 0; return; }
    inUseLoading = true;
    try {
      const res = await fetch("/api/stocktaking/in-use?factoryId=" + selectedFactoryId);
      if (res.ok) {
        const data = await res.json();
        inUseCount = data.length;
      }
    } catch {}
    inUseLoading = false;
  }

  $: if (selectedFactoryId) loadInUseCount();

  async function startStocktaking() {
    if (!selectedFactoryId) { error = "请选择目标工厂"; return; }
    if (inUseCount === 0) { error = "该工厂没有在用刀具"; return; }
    loading = true; error = "";
    const res = await fetch("/api/stocktaking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factoryId: selectedFactoryId }),
    });
    const data = await res.json();
    if (data.success) {
      goto("/app/stocktaking/" + data.stocktaking.id);
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

    <div class="bg-blue-50 text-blue-700 text-sm px-3 py-3 rounded-lg mb-4">
      本盘点针对工厂在用刀具，扫码输入条码进行盘点。
    </div>

    <div class="mb-4">
      <label class="label">目标工厂 <span class="text-red-500">*</span></label>
      <select class="input" bind:value={selectedFactoryId}>
        <option value={null}>请选择工厂</option>
        {#each factories as f}
          <option value={f.id}>{f.code} - {f.name}</option>
        {/each}
      </select>
    </div>

    {#if inUseLoading}
      <div class="text-sm text-gray-500 mb-4">正在加载在用刀具...</div>
    {:else if selectedFactoryId && inUseCount > 0}
      <div class="bg-green-50 text-green-700 text-sm px-3 py-3 rounded-lg mb-4">
        该工厂共有 <strong>{inUseCount}</strong> 把在用刀具参与盘点。
      </div>
    {/if}

    <button class="btn-primary" on:click={startStocktaking} disabled={loading || !selectedFactoryId || inUseCount === 0}>
      {loading ? "创建中..." : "开始盘点"}
    </button>
  </div>
</div>