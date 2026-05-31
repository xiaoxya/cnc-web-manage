<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let sidebarOpen = true;
  let dropdownOpen = false;

  const user = $page.data.user ?? null;

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
  }

  function closeDropdown() {
    dropdownOpen = false;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  $: isActive = (path: string) => $page.url.pathname.startsWith(path);
</script>

<div class="min-h-screen flex">
  <aside class="bg-gray-900 text-white {sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-200 flex flex-col flex-shrink-0">
    <div class="h-16 flex items-center {sidebarOpen ? 'px-6' : 'justify-center'} border-b border-gray-700">
      {#if sidebarOpen}
        <h1 class="font-bold text-lg">CNC 刀具管理</h1>
      {:else}
        <span class="text-xl">🔧</span>
      {/if}
    </div>
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
    <button on:click={() => sidebarOpen = !sidebarOpen} class="p-4 border-t border-gray-700 text-gray-400 hover:text-white text-sm flex items-center gap-3">
      <span>{sidebarOpen ? "◀" : "▶"}</span>
      {#if sidebarOpen}<span>收起侧边栏</span>{/if}
    </button>
  </aside>

  <div class="flex-1 flex flex-col min-w-0">
    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-4">
      {#if user}
        <div class="relative">
          <button on:click={toggleDropdown} class="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
            <span class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
              {user.displayName?.charAt(0) || "U"}
            </span>
            <span>{user.displayName}</span>
            <span class="text-xs text-gray-400">({user.role === "ADMIN" ? "管理员" : "操作员"})</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          {#if dropdownOpen}
            <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50" on:click|self={closeDropdown}>
              <div class="px-4 py-2 border-b border-gray-100">
                <p class="text-sm font-medium">{user.displayName}</p>
                <p class="text-xs text-gray-400">{user.username}</p>
              </div>
              <button on:click={logout} class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                退出登录
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </header>

    <main class="flex-1 p-6">
      <slot />
    </main>
  </div>
</div>