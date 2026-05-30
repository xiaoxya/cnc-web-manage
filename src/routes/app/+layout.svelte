<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let user: { id: number; username: string; displayName: string; role: string } | null = null;
  let sidebarOpen = true;
  let dropdownOpen = false;

  onMount(async () => {
    const data = await loadData();
    if (data?.user) user = data.user;
  });

  async function loadData() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  $: isActive = (path: string) => $page.url.pathname.startsWith(path);

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }
</script>

<div class="min-h-screen flex">
  <!-- Sidebar -->
  <aside class="bg-gray-900 text-white {sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-200 flex flex-col flex-shrink-0">
    <!-- Logo -->
    <div class="h-16 flex items-center {sidebarOpen ? 'px-6' : 'justify-center'} border-b border-gray-700">
      {#if sidebarOpen}
        <h1 class="font-bold text-lg">CNC 刀具管理</h1>
      {:else}
        <span class="text-xl">🔧</span>
      {/if}
    </div>

    <!-- Nav -->
    <nav class="flex-1 py-4 space-y-1 px-2">
      <a href="/app" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm {isActive('/app') && !isActive('/app/tools') && !isActive('/app/maintenance') && !isActive('/app/stocktaking') && !isActive('/app/settings') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">
        <span class="text-lg">📊</span>
        {#if sidebarOpen}<span>仪表盘</span>{/if}
      </a>
      <a href="/app/tools" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm {isActive('/app/tools') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">
        <span class="text-lg">🔧</span>
        {#if sidebarOpen}<span>刀具管理</span>{/if}
      </a>
      <a href="/app/maintenance" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm {isActive('/app/maintenance') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">
        <span class="text-lg">🔨</span>
        {#if sidebarOpen}<span>刀具维修</span>{/if}
      </a>
      <a href="/app/stocktaking" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm {isActive('/app/stocktaking') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">
        <span class="text-lg">📋</span>
        {#if sidebarOpen}<span>刀具盘点</span>{/if}
      </a>
      {#if user?.role === "ADMIN"}
        <a href="/app/settings" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm {isActive('/app/settings') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">
          <span class="text-lg">⚙️</span>
          {#if sidebarOpen}<span>系统设置</span>{/if}
        </a>
      {/if}
    </nav>

    <!-- Toggle -->
    <button on:click={toggleSidebar} class="p-4 border-t border-gray-700 text-gray-400 hover:text-white text-sm flex items-center gap-3">
      <span>{sidebarOpen ? "◀" : "▶"}</span>
      {#if sidebarOpen}<span>收起侧边栏</span>{/if}
    </button>
  </aside>

  <!-- Main content -->
  <div class="flex-1 flex flex-col min-w-0">
    <!-- Top bar -->
    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-4">
      {#if user}
        <div class="relative">
          <button on:click={() => dropdownOpen = !dropdownOpen} class="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
            <span class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
              {user.displayName?.charAt(0) || "U"}
            </span>
            <span>{user.displayName}</span>
            <span class="text-xs text-gray-400">({user.role === "ADMIN" ? "管理员" : "操作员"})</span>
          </button>
          {#if dropdownOpen}
            <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50" on:click|outclick={() => dropdownOpen = false}>
              <button on:click={logout} class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">退出登录</button>
            </div>
          {/if}
        </div>
      {/if}
    </header>

    <!-- Page content -->
    <main class="flex-1 p-6 overflow-auto">
      <slot />
    </main>
  </div>
</div>
