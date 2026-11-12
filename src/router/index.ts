import { createRouter, createWebHistory } from 'vue-router'
import InventoryView from '../views/InventoryView.vue'
import CharacterView from '../views/CharacterView.vue'
import AddItemsView from '../views/AddItemsView.vue'
import SettingsView from '../views/SettingsView.vue'
import CraftingView from '../views/CraftingView.vue'
import AccountView from '../views/AccountView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/inventory' },
    { path: '/inventory', component: InventoryView },
    { path: '/crafting', component: CraftingView },
    { path: '/character', component: CharacterView },
    { path: '/add', component: AddItemsView },
    { path: '/settings', component: SettingsView },
    { path: '/account', component: AccountView }
  ]
})
