<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  export let page: number = 1;
  export let pageSize: number = 20;
  export let total: number = 0;

  $: totalPages = Math.max(1, Math.ceil(total / pageSize));
  $: pages = getPageNumbers(page, totalPages);

  function getPageNumbers(current: number, total: number): (number | string)[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | string)[] = [];
    if (current <= 3) {
      pages.push(1, 2, 3, 4, "...", total);
    } else if (current >= total - 2) {
      pages.push(1, "...", total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, "...", current - 1, current, current + 1, "...", total);
    }
    return pages;
  }

  function goTo(p: number | string) {
    if (typeof p === "number" && p >= 1 && p <= totalPages) {
      dispatch("pageChange", p);
    }
  }
</script>

{#if totalPages > 1}
  <div class="flex items-center justify-between mt-4">
    <span class="text-sm text-gray-600">共 {total} 条，第 {page}/{totalPages} 页</span>
    <div class="flex gap-1">
      <button class="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50" disabled={page <= 1} on:click={() => goTo(page - 1)}>上一页</button>
      {#each pages as p}
        {#if p === "..."}
          <span class="px-2 py-1 text-sm text-gray-400">...</span>
        {:else}
          <button
            class="px-3 py-1 text-sm border rounded {p === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}"
            on:click={() => goTo(p)}>{p}</button>
        {/if}
      {/each}
      <button class="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50" disabled={page >= totalPages} on:click={() => goTo(page + 1)}>下一页</button>
    </div>
  </div>
{/if}
