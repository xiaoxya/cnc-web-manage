<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import { Html5Qrcode } from "html5-qrcode";

  const dispatch = createEventDispatcher();

  export let value: string = "";
  export let placeholder: string = "扫码或手动输入...";
  export let disabled: boolean = false;
  export let autofocus: boolean = false;

  let inputEl: HTMLInputElement;
  let inputTimer: ReturnType<typeof setTimeout> | null = null;
  let cameraScanning = false;
  let scannerEl: HTMLDivElement;
  let html5Scanner: Html5Qrcode | null = null;

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
      setTimeout(() => {
        dispatch("scan", value);
        dispatch("submit", value);
      }, 10);
    }
  }

  async function startCamera() {
    try {
      cameraScanning = true;
      html5Scanner = new Html5Qrcode("camera-scanner");

      await html5Scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        onScanSuccess,
        onScanFailure
      );
    } catch (err) {
      console.error("Camera start error:", err);
      cameraScanning = false;
      alert("无法启动摄像头，请检查权限设置");
    }
  }

  function onScanSuccess(decodedText: string) {
    value = decodedText;
    dispatch("input", decodedText);
    dispatch("scan", decodedText);
    dispatch("submit", decodedText);
    stopCamera();
  }

  function onScanFailure(err: string) {
    // Ignore - scanning continues
  }

  async function stopCamera() {
    if (html5Scanner) {
      try {
        await html5Scanner.stop();
        html5Scanner.clear();
      } catch {}
      html5Scanner = null;
    }
    cameraScanning = false;
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
    if (cameraScanning) stopCamera();
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
    class="input pl-10 pr-10"
    value={value}
    on:input={handleInput}
    on:keydown={handleKeydown}
  />
  <!-- Camera button -->
  {#if !cameraScanning}
    <button
      type="button"
      on:click={startCamera}
      class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
      title="扫码枪扫描"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    </button>
  {:else}
    <button
      type="button"
      on:click={stopCamera}
      class="absolute inset-y-0 right-0 pr-3 flex items-center text-red-500 hover:text-red-700 transition-colors"
      title="关闭摄像头"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  {/if}
</div>

{#if cameraScanning}
  <div id="camera-scanner" bind:this={scannerEl} class="mt-2 rounded-lg overflow-hidden border border-gray-200"></div>
{/if}