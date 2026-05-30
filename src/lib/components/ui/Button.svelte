<script lang="ts">
  let className: string = "";
  let variant: "primary" | "secondary" | "danger" | "success" = "primary";
  let size: "sm" | "md" = "md";
  let disabled: boolean = false;
  let type: string = "button";
  export { className as class, variant, size, disabled, type };

  const variants: Record<string, string> = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
    success: "btn-success",
  };
  $: baseClass = `${variants[variant] || variants.primary} ${size === "sm" ? "btn-sm" : ""} ${className}`;
</script>

<button {type} class={baseClass} {disabled} on:click>
  <slot />
</button>
