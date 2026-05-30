<script lang="ts">
  import Button from "./Button.svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  export let title: string = "";
  export let show: boolean = false;
  export let confirmText: string = "确认";
  export let cancelText: string = "取消";
  export let showConfirm: boolean = true;
  export let showCancel: boolean = true;
  export let loading: boolean = false;
  export let variant: "primary" | "danger" = "primary";

  function handleClose() {
    dispatch("close");
  }

  function handleConfirm() {
    dispatch("confirm");
  }
</script>

{#if show}
  <div class="modal-overlay" on:click|self={handleClose}>
    <div class="modal-content">
      {#if title}
        <h3 class="text-lg font-semibold mb-4">{title}</h3>
      {/if}
      <div class="mb-6">
        <slot />
      </div>
      <div class="flex justify-end gap-3">
        {#if showCancel}
          <Button variant="secondary" on:click={handleClose}>{cancelText}</Button>
        {/if}
        {#if showConfirm}
          <Button {variant} {disabled: loading} on:click={handleConfirm}>
            {loading ? "处理中..." : confirmText}
          </Button>
        {/if}
      </div>
    </div>
  </div>
{/if}
