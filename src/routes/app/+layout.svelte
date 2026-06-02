<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let sidebarOpen = true;
  let dropdownOpen = false;
  let mobileSidebarOpen = false;

  const user = $page.data.user ?? null;

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
  }

  function closeDropdown() {
    dropdownOpen = false;
  }

  function toggleMobileSidebar() {
    mobileSidebarOpen = !mobileSidebarOpen;
  }

  function closeMobileSidebar() {
    mobileSidebarOpen = false;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  $: isActive = (path: string) => $page.url.pathname.startsWith(path);
</script>

<div class="min-h-screen flex">
  {#if mobileSidebarOpen}
    <div class="fixed inset-0 bg-black/50 z-40 md:hidden" on:click={closeMobileSidebar}></div>
  {/if}

  <aside class="bg-gray-900 text-white hidden md:flex flex-col flex-shrink-0 {sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-200">
    <div class="h-16 flex items-center {sidebarOpen ? 'px-6' : 'justify-center'} border-b border-gray-700">
      {#if sidebarOpen}
        <h1 class="font-bold text-lg">CNC刀具管理</h1>
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

  <aside class="bg-gray-900 text-white fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 md:hidden {mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}">
    <div class="h-16 flex items-center justify-between px-6 border-b border-gray-700">
      <h1 class="font-bold text-lg">CNC刀具管理</h1>
      <button on:click={closeMobileSidebar} class="text-gray-400 hover:text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
    <nav class="flex-1 py-4 space-y-1 px-2">
      <a href="/app" on:click={closeMobileSidebar} class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm {isActive('/app') && !isActive('/app/tools') && !isActive('/app/maintenance') && !isActive('/app/stocktaking') && !isActive('/app/settings') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">
        <span class="text-lg">📊</span>
        <span>仪表盘</span>
      </a>
      <a href="/app/tools" on:click={closeMobileSidebar} class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm {isActive('/app/tools') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">
        <span class="text-lg">🔧</span>
        <span>刀具管理</span>
      </a>
      <a href="/app/maintenance" on:click={closeMobileSidebar} class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm {isActive('/app/maintenance') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">
        <span class="text-lg">🔨</span>
        <span>刀具维修</span>
      </a>
      <a href="/app/stocktaking" on:click={closeMobileSidebar} class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm {isActive('/app/stocktaking') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">
        <span class="text-lg">📋</span>
        <span>刀具盘点</span>
      </a>
      {#if user?.role === "ADMIN"}
        <a href="/app/settings" on:click={closeMobileSidebar} class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm {isActive('/app/settings') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}">
          <span class="text-lg">⚙️</span>
          <span>系统设置</span>
        </a>
      {/if}
    </nav>
    <div class="p-4 border-t border-gray-700 text-sm text-gray-400">
      <button on:click={() => { closeMobileSidebar(); logout(); }} class="flex items-center gap-3 hover:text-white">
        <span>🚪</span>
        <span>退出登录</span>
      </button>
    </div>
  </aside>

  <div class="flex-1 flex flex-col min-w-0">
    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 gap-4">
      <button on:click={toggleMobileSidebar} class="md:hidden text-gray-600 hover:text-gray-900">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div class="flex items-center gap-4 ml-auto">
        {#if user}
          <div class="relative">
            <button on:click={toggleDropdown} class="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
              <span class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                {user.displayName?.charAt(0) || "U"}
              </span>
              <span class="hidden sm:inline">{user.displayName}</span>
              <span class="text-xs text-gray-400">({user.role === "ADMIN" ? "管理员" : "操作员"})</span>
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
      </div>
    </header>

    <main class="flex-1 p-4 md:p-6 overflow-x-auto">
      <slot />
    </main>
  </div>
</div>