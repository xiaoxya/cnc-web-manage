<script lang="ts">
  export let message: string = "暂无数据";
  export let icon: string = "📦";
</script>

<div class="flex flex-col items-center justify-center py-16 text-gray-400">
  <span class="text-5xl mb-4">{icon}</span>
  <p class="text-lg">{message}</p>
</div>
