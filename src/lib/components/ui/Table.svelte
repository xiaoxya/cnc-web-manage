<script lang="ts">
  export let headers: string[] = [];
</script>

<div class="overflow-x-auto">
  <table class="min-w-full divide-y divide-gray-200">
    <thead class="bg-gray-50">
      <tr>
        {#each headers as header}
          <th class="table-header">{header}</th>
        {/each}
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      <slot />
    </tbody>
  </table>
</div>
