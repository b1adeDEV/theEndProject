<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useInventoryStore } from '../stores/inventory'
import type { EquipmentSlot, InventoryItem } from '../types/inventory'

const store = useInventoryStore()
const dragged = ref<string | null>(null)
const message = ref('')
const slots: EquipmentSlot[] = ['head', 'body', 'armor', 'weapon', 'backpack']
const labels: Record<EquipmentSlot, string> = { head: 'HEAD', body: 'BODY', armor: 'ARMOR', weapon: 'WEAPON', backpack: 'BACKPACK' }

function itemFor(slot: EquipmentSlot) { const id = store.equipment[slot]; return store.items.find(item => item.id === id) }
function availableItems(slot: EquipmentSlot) { return store.items.filter(item => store.canEquip(item, slot)) }
function equip(slot: EquipmentSlot, event: Event) { const id = (event.target as HTMLSelectElement).value; if (!id) return store.unequip(slot); if (!store.equip(id, slot)) message.value = 'Этот предмет нельзя поместить в выбранный слот.'; else message.value = '' }
function dragStart(id: string) { dragged.value = id }
function drop(slot: EquipmentSlot) { if (!dragged.value) return; message.value = store.equip(dragged.value, slot) ? '' : 'Неверный тип предмета для этого слота.'; dragged.value = null }
function key(event: KeyboardEvent) { if (event.key === 'Escape') message.value = ''; if (event.key.toLowerCase() === 'i') window.location.hash = '#/inventory' }
onMounted(() => window.addEventListener('keydown', key))
onUnmounted(() => window.removeEventListener('keydown', key))
</script>

<template>
  <section class="page">
    <p class="eyebrow">PROFILE / 02</p><h1>CHARACTER</h1>
    <div class="panel character">
      <h2>OPERATOR // NIGHT</h2><p class="muted">Перетаскивай предметы из инвентаря в подходящие зоны экипировки.</p><p v-if="message" class="equip-message">{{ message }}</p>
      <div class="character-layout">
        <div class="equipment-zone left-zone">
          <div v-for="slot in ['weapon', 'backpack'] as EquipmentSlot[]" :key="slot" class="equip" :class="{ filled: itemFor(slot) }" @dragover.prevent @drop="drop(slot)"><span>{{ labels[slot] }}</span><b>{{ itemFor(slot)?.name || 'EMPTY SLOT' }}</b><div class="equipped-icon">{{ itemFor(slot)?.icon || '＋' }}</div><select :value="store.equipment[slot] || ''" @change="equip(slot, $event)"><option value="">EMPTY SLOT</option><option v-for="item in availableItems(slot)" :key="item.id" :value="item.id">{{ item.icon }} {{ item.name }}</option></select></div>
        </div>
        <div class="operator"><div class="operator-head">◉</div><div class="operator-body">◈</div><div class="operator-arms">╲　╱</div></div>
        <div class="equipment-zone right-zone">
          <div v-for="slot in ['head', 'body', 'armor'] as EquipmentSlot[]" :key="slot" class="equip" :class="{ filled: itemFor(slot) }" @dragover.prevent @drop="drop(slot)"><span>{{ labels[slot] }}</span><b>{{ itemFor(slot)?.name || 'EMPTY SLOT' }}</b><div class="equipped-icon">{{ itemFor(slot)?.icon || '＋' }}</div><select :value="store.equipment[slot] || ''" @change="equip(slot, $event)"><option value="">EMPTY SLOT</option><option v-for="item in availableItems(slot)" :key="item.id" :value="item.id">{{ item.icon }} {{ item.name }}</option></select></div>
        </div>
      </div>
    </div>
  </section>
</template>
