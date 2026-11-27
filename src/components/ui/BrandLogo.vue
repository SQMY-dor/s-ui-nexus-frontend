<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="sui-brand-logo flex-shrink-0"
    aria-hidden="true"
  >
    <rect
      x="1.5"
      y="1.5"
      width="29"
      height="29"
      rx="8"
      fill="rgb(var(--v-theme-primary))"
      fill-opacity="0.12"
      stroke="rgb(var(--v-theme-primary))"
      stroke-opacity="0.34"
      stroke-width="1.5"
    />
    <path
      d="M21 10H13C11.3431 10 10 11.3431 10 13C10 14.6569 11.3431 16 13 16H19C20.6569 16 22 17.3431 22 19C22 20.6569 20.6569 22 19 22H11"
      stroke="rgb(var(--v-theme-primary))"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx="21" cy="10" r="2.2" fill="rgb(var(--v-theme-primary))" />
    <circle cx="16" cy="16" r="2.2" fill="rgb(var(--v-theme-primary))" />
    <circle cx="11" cy="22" r="2.2" fill="rgb(var(--v-theme-primary))" />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 28,
})
</script>

<style scoped>
.sui-brand-logo {
  display: block;
}
</style>
