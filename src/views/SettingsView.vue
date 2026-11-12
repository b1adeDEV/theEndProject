<script setup lang="ts">
import { ref } from 'vue'
import { useInventoryStore } from '../stores/inventory'
const store = useInventoryStore()
const columns = ref(store.gridColumns)
const rows = ref(store.gridRows)
function applyGrid() { store.setGrid(columns.value, rows.value) }
</script>
<template><section class="page"><p class="eyebrow">SYSTEM / 03</p><h1>SETTINGS</h1><div class="panel settings"><label>INTERFACE THEME<select><option>NEON PURPLE</option></select></label><div class="grid-settings"><label>COLUMNS<input v-model.number="columns" type="number" min="4" max="15"></label><label>ROWS<input v-model.number="rows" type="number" min="3" max="10"></label></div><p class="muted">Изменение размера сетки сбрасывает инвентарь и масштабирует клетки.</p><button @click="applyGrid">APPLY GRID {{ columns }} × {{ rows }}</button><button @click="store.reset">RESET INVENTORY</button></div></section></template>
