<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";

  const dispatch = createEventDispatcher();

  export let value: string = "";
  export let placeholder: string = "扫码或手动输入...";
  export let disabled: boolean = false;
  export let autofocus: boolean = false;

  let inputEl: HTMLInputElement;
  let inputTimer: ReturnType<typeof setTimeout> | null = null;
  let isScanning = false;

  // 扫码枪输入检测：连续快速输入（<50ms间隔）视为扫码
  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    dispatch("input", value);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      if (inputTimer) {
        clearTimeout(inputTimer);
        inputTimer = null;
      }
      // 短暂延迟确保值已更新
      setTimeout(() => {
        dispatch("scan", value);
        dispatch("submit", value);
      }, 10);
    }
  }

  export function focus() {
    inputEl?.focus();
  }

  export function clear() {
    value = "";
    if (inputEl) inputEl.value = "";
  }

  onMount(() => {
    if (autofocus) {
      setTimeout(() => inputEl?.focus(), 100);
    }
  });

  onDestroy(() => {
    if (inputTimer) clearTimeout(inputTimer);
  });
</script>

<div class="relative">
  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  </div>
  <input
    bind:this={inputEl}
    type="text"
    {placeholder}
    {disabled}
    class="input pl-10"
    value={value}
    on:input={handleInput}
    on:keydown={handleKeydown}
  />
</div>
