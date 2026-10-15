<script setup lang="ts">
import { ref } from 'vue'
import { useInventoryStore } from '../stores/inventory'
import type { ItemType, Rarity } from '../types/inventory'

const store = useInventoryStore()
const name = ref('')
const icon = ref('📦')
const type = ref<ItemType>('misc')
const rarity = ref<Rarity>('common')
const quantity = ref(1)
const width = ref(1)
const height = ref(1)

function addItem() {
  if (!name.value.trim()) return
  store.add({ id: '', templateId: name.value.toLowerCase().replaceAll(' ', '-'), name: name.value, icon: icon.value, type: type.value, rarity: rarity.value, quantity: quantity.value, maxStack: quantity.value, width: width.value, height: height.value, description: 'Custom item', weight: 1 })
  name.value = ''
}
</script>

<template><section class="page"><p class="eyebrow">ADMIN / 04</p><h1>ADD ITEMS</h1><div class="panel form"><label>NAME<input v-model="name" placeholder="Item name" /></label><label>ICON<input v-model="icon" maxlength="2" /></label><label>TYPE<select v-model="type"><option value="weapon">Weapon</option><option value="armor">Armor</option><option value="ammo">Ammo</option><option value="food">Food</option><option value="medical">Medical</option><option value="resource">Resource</option><option value="misc">Misc</option></select></label><label>RARITY<select v-model="rarity"><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option><option value="epic">Epic</option><option value="legendary">Legendary</option></select></label><label>QUANTITY<input v-model.number="quantity" type="number" min="1" /></label><div class="form-row"><label>WIDTH<input v-model.number="width" type="number" min="1" max="4" /></label><label>HEIGHT<input v-model.number="height" type="number" min="1" max="4" /></label></div><button @click="addItem">ADD TO INVENTORY</button></div></section></template>