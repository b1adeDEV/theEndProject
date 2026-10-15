<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useInventoryStore } from '../stores/inventory'

const store = useInventoryStore()
const types = [['all', 'ALL'], ['weapon', 'WEAPONS'], ['food', 'FOOD'], ['medical', 'MEDICAL'], ['resource', 'RESOURCES'], ['ammo', 'AMMO'], ['armor', 'ARMOR']]
const dragged = ref<string | null>(null)

function dragStart(id: string) { dragged.value = id }
function drop(slot: number) { if (dragged.value) store.move(dragged.value, slot); dragged.value = null }
function key(event: KeyboardEvent) {
  if (event.key.toLowerCase() === 'r') store.sort = store.sort === 'default' ? 'name' : 'default'
  if (event.key === 'Escape') store.selected = null
  if (event.key.toLowerCase() === 'i') window.location.hash = '#/inventory'
}
onMounted(() => window.addEventListener('keydown', key))
onUnmounted(() => window.removeEventListener('keydown', key))
watch([() => store.sort, () => store.sortDirection, () => store.filter], () => store.arrangeItems())
</script>

<template>
  <section class="page">
    <div class="heading">
      <div><p class="eyebrow">STORAGE / 01</p><h1>INVENTORY</h1></div>
      <div class="capacity">CAPACITY <b>{{ store.items.length }} / {{ store.capacity }}</b><div class="bar"><i :style="{ width: `${Math.min(store.items.length / store.capacity * 100, 100)}%` }" /></div></div>
    </div>

    <div class="toolbar">
      <button v-for="type in types" :key="type[0]" :class="{ active: store.filter === type[0] }" @click="store.filter = type[0] as any">{{ type[1] }}</button>
      <select v-model="store.sort"><option value="default">SORT: DEFAULT</option><option value="name">SORT: NAME</option><option value="quantity">SORT: QUANTITY</option><option value="weight">SORT: WEIGHT</option><option value="rarity">SORT: RARITY</option><option value="type">SORT: TYPE</option></select>
      <button @click="store.sortDirection = store.sortDirection === 'asc' ? 'desc' : 'asc'">{{ store.sortDirection === 'asc' ? '↑ ASC' : '↓ DESC' }}</button>
    </div>

    <div class="layout">
      <div class="panel inventory">
        <div class="panel-title">BACKPACK <span>{{ store.gridColumns }} × {{ store.gridRows }}</span></div>
        <div class="grid" :style="{ gridTemplateColumns: `repeat(${store.gridColumns}, minmax(0, 1fr))` }">
          <div v-for="slot in store.capacity" :key="slot" class="slot" @dragover.prevent @drop="drop(slot - 1)">
            <div v-for="item in store.filtered.filter(entry => store.positions[entry.id] === slot - 1)" :key="item.id" class="item" draggable="true" @dragstart="dragStart(item.id)" @dragend="dragged = null" @click="store.selected = item">
              <strong>{{ item.icon }}</strong><span>{{ item.name }}</span><em v-if="item.quantity > 1">{{ item.quantity }}</em>
            </div>
          </div>
        </div>
      </div>
      <aside class="panel details"><div class="panel-title">INSPECT</div><template v-if="store.selected"><div class="inspect-icon">{{ store.selected.icon }}</div><h2>{{ store.selected.name }}</h2><p class="rarity" :class="store.selected.rarity">{{ store.selected.rarity.toUpperCase() }}</p><p>{{ store.selected.description }}</p><div class="stats"><span>TYPE <b>{{ store.selected.type }}</b></span><span>WEIGHT <b>{{ store.selected.weight }} kg</b></span><span>QUANTITY <b>{{ store.selected.quantity }}</b></span></div><button class="danger" @click="store.remove(store.selected!.id); store.selected = null">DISCARD ITEM</button></template><p v-else class="muted">Select an item to inspect its details.</p></aside>
    </div>
  </section>
</template>
