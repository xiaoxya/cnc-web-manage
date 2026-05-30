<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  onMount(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          goto("/app");
          return;
        }
      }
    } catch {}
    goto("/login");
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-100 text-gray-400">
  跳转中...
</div>