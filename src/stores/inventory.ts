import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { items as initial } from '../data/items'
import type { EquipmentSlot, InventoryItem, ItemType } from '../types/inventory'
import { inventoryApi, type InventoryStatePayload } from '../api'

const defaultPositions = () => ({ ak: 0, ammo: 2, med: 4, food: 6, armor: 8, wood: 12, tool: 14 })

const equipmentRules: Record<EquipmentSlot, ItemType[]> = {
  head: ['armor'],
  body: ['armor'],
  armor: ['armor'],
  weapon: ['weapon'],
  backpack: ['misc']
}

export const useInventoryStore = defineStore('inventory', () => {
  const items = ref<InventoryItem[]>(structuredClone(initial))
  const positions = ref<Record<string, number>>(defaultPositions())
  const equipment = ref<Record<EquipmentSlot, string | null>>({ head: null, body: null, armor: null, weapon: null, backpack: null })
  const filter = ref<'all' | ItemType>('all')
  const sort = ref('default')
  const sortDirection = ref<'asc' | 'desc'>('asc')
  const selected = ref<InventoryItem | null>(null)
  const gridColumns = ref(10)
  const gridRows = ref(6)
  const apiReady = ref(false)
  let restoringFromApi = false
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  // Load persisted state from the Python API before syncing changes back.
  void inventoryApi.getState().then((state) => {
    restoringFromApi = true
    if (state.items?.length) items.value = state.items
    if (state.positions) positions.value = state.positions
    if (state.equipment) equipment.value = state.equipment as Record<EquipmentSlot, string | null>
    if (state.gridColumns) gridColumns.value = state.gridColumns
    if (state.gridRows) gridRows.value = state.gridRows
    apiReady.value = true
    queueMicrotask(() => { restoringFromApi = false })
  }).catch((error) => {
    console.error('Could not load inventory from Python backend:', error)
    apiReady.value = true
  })

  watch([items, positions, equipment, gridColumns, gridRows], () => {
    if (!apiReady.value || restoringFromApi) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const payload: InventoryStatePayload = {
        items: items.value, positions: positions.value, equipment: equipment.value,
        gridColumns: gridColumns.value, gridRows: gridRows.value,
      }
      void inventoryApi.saveState(payload).catch((error) => console.error('Could not save inventory to Python backend:', error))
    }, 250)
  }, { deep: true })

  function applyServerState(state: InventoryStatePayload) {
    if (saveTimer) clearTimeout(saveTimer)
    restoringFromApi = true
    items.value = state.items
    positions.value = state.positions
    equipment.value = state.equipment as Record<EquipmentSlot, string | null>
    gridColumns.value = state.gridColumns
    gridRows.value = state.gridRows
    queueMicrotask(() => { restoringFromApi = false })
  }

  async function syncBeforeCraft() {
    if (saveTimer) clearTimeout(saveTimer)
    await inventoryApi.saveState({ items: items.value, positions: positions.value, equipment: equipment.value, gridColumns: gridColumns.value, gridRows: gridRows.value })
  }

  const capacity = computed(() => gridColumns.value * gridRows.value)

  const filtered = computed(() => {
    const result = items.value.filter(item => filter.value === 'all' || item.type === filter.value)
    const direction = sortDirection.value === 'asc' ? 1 : -1

    if (sort.value === 'name') result.sort((a, b) => direction * a.name.localeCompare(b.name))
    if (sort.value === 'quantity') result.sort((a, b) => direction * (a.quantity - b.quantity))
    if (sort.value === 'weight') result.sort((a, b) => direction * ((a.weight ?? 0) - (b.weight ?? 0)))
    if (sort.value === 'rarity') result.sort((a, b) => direction * a.rarity.localeCompare(b.rarity))
    if (sort.value === 'type') result.sort((a, b) => direction * a.type.localeCompare(b.type))

    return result
  })

  function arrangeItems() {
    const ordered = [...filtered.value]
    const occupied = new Set<number>()

    ordered.forEach((item, index) => {
      if (index < capacity.value) {
        positions.value[item.id] = index
        occupied.add(index)
      }
    })
  }

  watch([sort, sortDirection, filter, gridColumns, gridRows], arrangeItems)

  function firstFreeSlot() {
    for (let slot = 0; slot < capacity.value; slot++) {
      if (!Object.values(positions.value).includes(slot)) return slot
    }
    return -1
  }

  function add(item: InventoryItem) {
    const slot = firstFreeSlot()
    if (slot < 0) return false

    const copy = { ...item, id: `${item.templateId}-${Date.now()}` }
    items.value.push(copy)
    positions.value[copy.id] = slot
    return true
  }

  function remove(id: string) {
    items.value = items.value.filter(item => item.id !== id)
    delete positions.value[id]

    Object.keys(equipment.value).forEach(slot => {
      if (equipment.value[slot as EquipmentSlot] === id) {
        equipment.value[slot as EquipmentSlot] = null
      }
    })
  }

  function move(id: string, target: number) {
    if (target < 0 || target >= capacity.value) return

    const other = Object.entries(positions.value).find(([key, slot]) => slot === target && key !== id)?.[0]
    const current = positions.value[id]

    positions.value[id] = target
    if (other && current !== undefined) positions.value[other] = current
  }

  function canEquip(item: InventoryItem, slot: EquipmentSlot) {
    if (!equipmentRules[slot].includes(item.type)) return false

    const alreadyEquipped = Object.entries(equipment.value).some(([equippedSlot, itemId]) => {
      return equippedSlot !== slot && itemId === item.id
    })

    if (alreadyEquipped) return false

    if (slot === 'head') {
      return item.templateId === 'helmet' || item.templateId === 'armor'
    }

    return true
  }

  function equip(id: string, slot: EquipmentSlot) {
    const item = items.value.find(entry => entry.id === id)
    if (!item || !canEquip(item, slot)) return false

    equipment.value[slot] = id
    return true
  }

  function unequip(slot: EquipmentSlot) {
    equipment.value[slot] = null
  }

  function setGrid(columns: number, rows: number) {
    gridColumns.value = columns
    gridRows.value = rows
    reset()
  }

  function reset() {
    items.value = structuredClone(initial)
    positions.value = defaultPositions()
    equipment.value = { head: null, body: null, armor: null, weapon: null, backpack: null }
    selected.value = null
  }

  return {
    items,
    positions,
    equipment,
    filter,
    sort,
    sortDirection,
    selected,
    filtered,
    gridColumns,
    gridRows,
    capacity,
    add,
    remove,
    move,
    canEquip,
    equip,
    unequip,
    setGrid,
    reset,
    arrangeItems,
    applyServerState,
    syncBeforeCraft
  }
})
