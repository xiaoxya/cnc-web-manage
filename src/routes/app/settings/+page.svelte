<script lang="ts">
  import { onMount } from "svelte";
  import Modal from "$lib/components/ui/Modal.svelte";

  let activeTab: "categories" | "locations" | "users" = "categories";

  // Categories
  let categories: any[] = [];
  let catForm: any = { code: "", name: "", description: "" };
  let catEditMode = false;
  let catModal = false;

  // Locations
  let locations: any[] = [];
  let locForm: any = { code: "", name: "", description: "" };
  let locEditMode = false;
  let locModal = false;

  // Users
  let users: any[] = [];
  let userForm: any = { username: "", password: "", displayName: "", role: "OPERATOR", active: true };
  let userEditMode = false;
  let userModal = false;
  let userError = "";

  onMount(() => { loadAll(); });

  async function loadAll() {
    await Promise.all([loadCategories(), loadLocations(), loadUsers()]);
  }

  async function loadCategories() {
    const res = await fetch("/api/categories");
    if (res.ok) categories = await res.json();
  }

  async function loadLocations() {
    const res = await fetch("/api/locations");
    if (res.ok) locations = await res.json();
  }

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) users = await res.json();
  }

  // Category CRUD
  function openCatAdd() { catForm = { code: "", name: "", description: "" }; catEditMode = false; catModal = true; }
  function openCatEdit(c: any) { catForm = { ...c }; catEditMode = true; catModal = true; }

  async function saveCat() {
    const url = "/api/categories";
    const method = catEditMode ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(catForm) });
    const data = await res.json();
    if (data.success) { catModal = false; loadCategories(); }
  }

  async function deleteCat(id: number) {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    loadCategories();
  }

  // Location CRUD
  function openLocAdd() { locForm = { code: "", name: "", description: "" }; locEditMode = false; locModal = true; }
  function openLocEdit(l: any) { locForm = { ...l }; locEditMode = true; locModal = true; }

  async function saveLoc() {
    const method = locEditMode ? "PUT" : "POST";
    const res = await fetch("/api/locations", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(locForm) });
    const data = await res.json();
    if (data.success) { locModal = false; loadLocations(); }
  }

  async function deleteLoc(id: number) {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/locations?id=${id}`, { method: "DELETE" });
    loadLocations();
  }

  // User CRUD
  function openUserAdd() { userForm = { username: "", password: "", displayName: "", role: "OPERATOR", active: true }; userEditMode = false; userModal = true; userError = ""; }
  function openUserEdit(u: any) { userForm = { ...u, password: "" }; userEditMode = true; userModal = true; userError = ""; }

  async function saveUser() {
    userError = "";
    if (!userForm.username) { userError = "用户名不能为空"; return; }
    if (!userEditMode && (!userForm.password || userForm.password.length < 6)) { userError = "密码至少6位"; return; }
    const method = userEditMode ? "PUT" : "POST";
    const res = await fetch("/api/users", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(userForm) });
    const data = await res.json();
    if (data.success) { userModal = false; loadUsers(); }
    else { userError = data.message || "操作失败"; }
  }

  async function deleteUser(id: number) {
    if (!confirm("确定删除此用户？")) return;
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    loadUsers();
  }
</script>

<h2 class="text-2xl font-bold mb-6">系统设置</h2>

<!-- Tabs -->
<div class="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
  <button class="px-4 py-2 text-sm rounded-md {activeTab === 'categories' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}" on:click={() => activeTab = "categories"}>分类管理</button>
  <button class="px-4 py-2 text-sm rounded-md {activeTab === 'locations' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}" on:click={() => activeTab = "locations"}>库位管理</button>
  <button class="px-4 py-2 text-sm rounded-md {activeTab === 'users' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}" on:click={() => activeTab = "users"}>用户管理</button>
</div>

<!-- Categories Tab -->
{#if activeTab === "categories"}
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">刀具分类</h3>
      <button class="btn-primary btn-sm" on:click={openCatAdd}>+ 新增分类</button>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">编码前缀</th>
            <th class="table-header">名称</th>
            <th class="table-header">描述</th>
            <th class="table-header">当前序号</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each categories as cat}
            <tr>
              <td class="table-cell font-mono font-bold">{cat.code}</td>
              <td class="table-cell">{cat.name}</td>
              <td class="table-cell text-gray-500">{cat.description || "—"}</td>
              <td class="table-cell">{cat.counter}</td>
              <td class="table-cell">
                <button class="text-blue-600 hover:text-blue-800 mr-2" on:click={() => openCatEdit(cat)}>编辑</button>
                <button class="text-red-600 hover:text-red-800" on:click={() => deleteCat(cat.id)}>删除</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<!-- Locations Tab -->
{#if activeTab === "locations"}
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">库位管理</h3>
      <button class="btn-primary btn-sm" on:click={openLocAdd}>+ 新增库位</button>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">编码</th>
            <th class="table-header">名称</th>
            <th class="table-header">描述</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each locations as loc}
            <tr>
              <td class="table-cell font-mono">{loc.code}</td>
              <td class="table-cell">{loc.name}</td>
              <td class="table-cell text-gray-500">{loc.description || "—"}</td>
              <td class="table-cell">
                <button class="text-blue-600 hover:text-blue-800 mr-2" on:click={() => openLocEdit(loc)}>编辑</button>
                <button class="text-red-600 hover:text-red-800" on:click={() => deleteLoc(loc.id)}>删除</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<!-- Users Tab -->
{#if activeTab === "users"}
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">用户管理</h3>
      <button class="btn-primary btn-sm" on:click={openUserAdd}>+ 新增用户</button>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">用户名</th>
            <th class="table-header">显示名</th>
            <th class="table-header">角色</th>
            <th class="table-header">状态</th>
            <th class="table-header">创建时间</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each users as user}
            <tr>
              <td class="table-cell font-mono">{user.username}</td>
              <td class="table-cell">{user.displayName}</td>
              <td class="table-cell">
                <span class="badge {user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}">
                  {user.role === "ADMIN" ? "管理员" : "操作员"}
                </span>
              </td>
              <td class="table-cell">
                <span class="badge {user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  {user.active ? "启用" : "禁用"}
                </span>
              </td>
              <td class="table-cell text-gray-500">{new Date(user.createdAt).toLocaleDateString("zh-CN")}</td>
              <td class="table-cell">
                <button class="text-blue-600 hover:text-blue-800 mr-2" on:click={() => openUserEdit(user)}>编辑</button>
                <button class="text-red-600 hover:text-red-800" on:click={() => deleteUser(user.id)}>删除</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<!-- Category Modal -->
<Modal title={catEditMode ? "编辑分类" : "新增分类"} bind:show={catModal} confirmText="保存" on:confirm={saveCat} on:close={() => catModal = false}>
  <div class="space-y-3">
    <div>
      <label class="label">编码前缀 <span class="text-red-500">*</span></label>
      <input class="input" bind:value={catForm.code} placeholder="如 LAT, MIL" maxlength="10" />
    </div>
    <div>
      <label class="label">名称 <span class="text-red-500">*</span></label>
      <input class="input" bind:value={catForm.name} placeholder="如 车刀" />
    </div>
    <div>
      <label class="label">描述</label>
      <input class="input" bind:value={catForm.description} placeholder="可选描述" />
    </div>
  </div>
</Modal>

<!-- Location Modal -->
<Modal title={locEditMode ? "编辑库位" : "新增库位"} bind:show={locModal} confirmText="保存" on:confirm={saveLoc} on:close={() => locModal = false}>
  <div class="space-y-3">
    <div>
      <label class="label">编码 <span class="text-red-500">*</span></label>
      <input class="input" bind:value={locForm.code} placeholder="如 A-01-01" />
    </div>
    <div>
      <label class="label">名称 <span class="text-red-500">*</span></label>
      <input class="input" bind:value={locForm.name} placeholder="如 A货架第1层第1格" />
    </div>
    <div>
      <label class="label">描述</label>
      <input class="input" bind:value={locForm.description} placeholder="可选描述" />
    </div>
  </div>
</Modal>

<!-- User Modal -->
<Modal title={userEditMode ? "编辑用户" : "新增用户"} bind:show={userModal} confirmText="保存" on:confirm={saveUser} on:close={() => userModal = false}>
  {#if userError}
    <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-3">{userError}</div>
  {/if}
  <div class="space-y-3">
    <div>
      <label class="label">用户名 <span class="text-red-500">*</span></label>
      <input class="input" bind:value={userForm.username} placeholder="登录用" disabled={userEditMode} />
    </div>
    <div>
      <label class="label">密码 {#if !userEditMode}<span class="text-red-500">*</span>{/if}</label>
      <input type="password" class="input" bind:value={userForm.password} placeholder={userEditMode ? "留空不改密码" : "至少6位"} />
    </div>
    <div>
      <label class="label">显示名 <span class="text-red-500">*</span></label>
      <input class="input" bind:value={userForm.displayName} />
    </div>
    <div>
      <label class="label">角色</label>
      <select class="input" bind:value={userForm.role}>
        <option value="OPERATOR">操作员</option>
        <option value="ADMIN">管理员</option>
      </select>
    </div>
    <div>
      <label class="flex items-center gap-2">
        <input type="checkbox" bind:checked={userForm.active} />
        <span class="text-sm">启用</span>
      </label>
    </div>
  </div>
</Modal>
