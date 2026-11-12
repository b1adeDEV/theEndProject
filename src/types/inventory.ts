export type ItemType = 'weapon' | 'armor' | 'ammo' | 'food' | 'medical' | 'resource' | 'misc'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type EquipmentSlot = 'head' | 'body' | 'armor' | 'weapon' | 'backpack'

export interface InventoryItem {
  id: string
  templateId: string
  name: string
  type: ItemType
  rarity: Rarity
  width: number
  height: number
  quantity: number
  maxStack: number
  icon: string
  description: string
  weight: number
}