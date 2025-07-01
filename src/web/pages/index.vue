<template>
   <div>{{ res }}</div>
</template>

<script setup lang="ts">
const db = useNuxtApp().$db

const res = await db.execute('select * from pg_namespace')
</script>
