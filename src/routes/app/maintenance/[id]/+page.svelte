<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import Modal from "$lib/components/ui/Modal.svelte";

  let record: any = null;
  let loading = true;
  let showCompleteModal = false;
  let completeForm = { cost: null as number | null, notes: "" };
  let completeLoading = false;

  $: id = $page.params.id;

  onMount(async () => {
    const res = await fetch(`/api/maintenance/${id}`);
    if (res.ok) record = await res.json();
    loading = false;
  });

  async function completeMaintenance() {
    completeLoading = true;
    const res = await fetch(`/api/maintenance/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(completeForm),
    });
    const data = await res.json();
    if (data.success) {
      showCompleteModal = false;
      goto("/app/maintenance");
    }
    completeLoading = false;
  }

  function fmt(d: string) { return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
</script>

<div class="flex items-center gap-4 mb-6">
  <a href="/app/maintenance" class="text-gray-400 hover:text-gray-600">&larr; 返回</a>
  <h2 class="text-2xl font-bold">维修详情</h2>
</div>

{#if loading}
  <div class="text-center py-12 text-gray-400">加载中...</div>
{:else if !record}
  <div class="text-center py-12 text-gray-400">记录不存在</div>
{:else}
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="card">
      <h3 class="text-lg font-semibold mb-4">维修信息</h3>
      <div class="space-y-3 text-sm">
        <div class="flex justify-between"><span class="text-gray-500">刀具编码</span><span class="font-mono">{record.tool?.toolCode || "—"}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">刀具名称</span><span>{record.tool?.name || "—"}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">状态</span>
          <span class="badge {record.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
            {record.status === "COMPLETED" ? "已完成" : "维修中"}
          </span>
        </div>
        <div class="flex justify-between"><span class="text-gray-500">报修时间</span><span>{fmt(record.createdAt)}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">报修人</span><span>{record.reporter?.displayName || "—"}</span></div>
        {#if record.completedAt}
          <div class="flex justify-between"><span class="text-gray-500">完成时间</span><span>{fmt(record.completedAt)}</span></div>
        {/if}
        {#if record.cost}
          <div class="flex justify-between"><span class="text-gray-500">维修费用</span><span>¥{Number(record.cost).toFixed(2)}</span></div>
        {/if}
      </div>
    </div>

    <div class="card">
      <h3 class="text-lg font-semibold mb-4">故障描述</h3>
      <p class="text-sm text-gray-700 whitespace-pre-wrap">{record.description}</p>
      {#if record.notes}
        <h4 class="text-sm font-medium text-gray-500 mt-4 mb-1">备注</h4>
        <p class="text-sm text-gray-700">{record.notes}</p>
      {/if}
    </div>
  </div>

  {#if record.status === "IN_MAINTENANCE"}
    <div class="mt-6">
      <button class="btn-success" on:click={() => showCompleteModal = true}>标记为维修完成</button>
    </div>
  {/if}

  <Modal title="维修完成" bind:show={showCompleteModal} confirmText="确认完成" on:confirm={completeMaintenance} {completeLoading} on:close={() => showCompleteModal = false}>
    <div class="space-y-3">
      <div>
        <label class="label">维修费用</label>
        <input type="number" class="input" bind:value={completeForm.cost} min="0" step="0.01" placeholder="0.00" />
      </div>
      <div>
        <label class="label">备注</label>
        <textarea class="input" rows="3" bind:value={completeForm.notes} placeholder="维修结果说明"></textarea>
      </div>
    </div>
  </Modal>
{/if}
