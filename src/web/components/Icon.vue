<template>
   <component data-name="icon" :is="icon" class="text-primary stroke-[1.5]" />
</template>

<script lang="ts" setup>
import { defineAsyncComponent } from 'vue'

type Props = {
   name: string
}
const props = defineProps<Props>()

const icon = defineAsyncComponent(() => import(`../assets/svg/${props.name}.svg`))
</script>
