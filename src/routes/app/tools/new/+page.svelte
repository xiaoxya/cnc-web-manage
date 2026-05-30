<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let loading = false;
  let error = "";
  let categories: any[] = [];
  let locations: any[] = [];
  let generatedCode = "选择分类后自动生成";

  let form = {
    name: "", specification: "", material: "", brand: "",
    categoryId: 0, locationId: null as number | null,
    quantity: 0, minQuantity: 1, unit: "把",
    price: null as number | null, notes: "",
  };

  onMount(async () => {
    const [catRes, locRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/locations"),
    ]);
    if (catRes.ok) categories = await catRes.json();
    if (locRes.ok) locations = await locRes.json();
  });

  async function handleSubmit() {
    if (!form.name) { error = "请输入刀具名称"; return; }
    if (!form.categoryId) { error = "请选择刀具分类"; return; }

    loading = true; error = "";
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        goto("/app/tools");
      } else {
        error = data.message || "创建失败";
      }
    } catch { error = "网络错误"; }
    loading = false;
  }
</script>

<div class="max-w-2xl mx-auto">
  <div class="flex items-center gap-4 mb-6">
    <a href="/app/tools" class="text-gray-400 hover:text-gray-600">&larr; 返回</a>
    <h2 class="text-2xl font-bold">新增刀具</h2>
  </div>

  <div class="card">
    {#if error}
      <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>
    {/if}

    <form on:submit|preventDefault={handleSubmit}>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="label">刀具编码</label>
          <input type="text" class="input bg-gray-50" value={generatedCode} disabled />
        </div>

        <div class="md:col-span-2">
          <label class="label">刀具名称 <span class="text-red-500">*</span></label>
          <input type="text" class="input" bind:value={form.name} placeholder="请输入刀具名称" />
        </div>

        <div>
          <label class="label">分类 <span class="text-red-500">*</span></label>
          <select class="input" bind:value={form.categoryId}>
            <option value={0}>请选择分类</option>
            {#each categories as cat}
              <option value={cat.id}>{cat.name} ({cat.code})</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="label">库位</label>
          <select class="input" bind:value={form.locationId}>
            <option value={null}>请选择库位</option>
            {#each locations as loc}
              <option value={loc.id}>{loc.code} - {loc.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="label">规格型号</label>
          <input type="text" class="input" bind:value={form.specification} placeholder="如 D20×100" />
        </div>

        <div>
          <label class="label">材质</label>
          <input type="text" class="input" bind:value={form.material} placeholder="如 硬质合金" />
        </div>

        <div>
          <label class="label">品牌</label>
          <input type="text" class="input" bind:value={form.brand} placeholder="如 山特维克" />
        </div>

        <div>
          <label class="label">库存数量</label>
          <input type="number" class="input" bind:value={form.quantity} min="0" />
        </div>

        <div>
          <label class="label">最低预警数量</label>
          <input type="number" class="input" bind:value={form.minQuantity} min="0" />
        </div>

        <div>
          <label class="label">单位</label>
          <input type="text" class="input" bind:value={form.unit} />
        </div>

        <div>
          <label class="label">单价</label>
          <input type="number" class="input" bind:value={form.price} min="0" step="0.01" placeholder="0.00" />
        </div>

        <div class="md:col-span-2">
          <label class="label">备注</label>
          <textarea class="input" rows="3" bind:value={form.notes} placeholder="可选备注信息"></textarea>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button type="submit" class="btn-primary" disabled={loading}>{loading ? "创建中..." : "创建刀具"}</button>
        <a href="/app/tools" class="btn-secondary">取消</a>
      </div>
    </form>
  </div>
</div>
