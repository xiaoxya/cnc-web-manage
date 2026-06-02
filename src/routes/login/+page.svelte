<script lang="ts">
  import { enhance } from "$app/forms";
  import { applyAction, deserialize } from "$app/forms";

  let username = "";
  let password = "";
  let error = "";
  let loading = false;

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = "";

    const formData = new FormData();
    formData.set("username", username);
    formData.set("password", password);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/app";
      } else {
        error = data.message || "登录失败";
      }
    } catch {
      error = "网络错误";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
  <div class="card w-full max-w-sm">
    <div class="text-center mb-6">
      <h1 class="text-xl md:text-2xl font-bold text-gray-900">CNC 刀具管理系统</h1>
      <p class="text-sm text-gray-500 mt-1">请登录以继续</p>
    </div>

    <form on:submit={handleSubmit}>
      {#if error}
        <div class="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>
      {/if}

      <div class="mb-4">
        <label class="label" for="username">用户名</label>
        <input id="username" type="text" class="input" bind:value={username} placeholder="请输入用户名" required />
      </div>

      <div class="mb-6">
        <label class="label" for="password">密码</label>
        <input id="password" type="password" class="input" bind:value={password} placeholder="请输入密码" required />
      </div>

      <button type="submit" class="btn-primary w-full py-3 text-base" disabled={loading}>
        {loading ? "登录中..." : "登 录"}
      </button>
    </form>
  </div>
</div>