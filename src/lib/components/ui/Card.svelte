<script lang="ts">
  let className: string = "";
  export { className as class };
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 {className}">
  <slot />
</div>
