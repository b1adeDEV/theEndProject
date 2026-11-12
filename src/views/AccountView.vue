<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { clearToken, getToken, inventoryApi, type AuthUser } from '../api'
import type { InventoryItem } from '../types/inventory'

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const user = ref<AuthUser | null>(null)
const busy = ref(false)
const message = ref('')
const error = ref('')
const stats = ref<{ itemCount: number; totalQuantity: number; totalWeight: number; uniqueTypes: number; capacity: number } | null>(null)
const query = ref('')
const results = ref<InventoryItem[]>([])
const searchCount = ref<number | null>(null)
const backupInfo = ref('')
const loggedIn = computed(() => !!user.value && !!getToken())

async function loadAccount() {
  if (!getToken()) return
  try { user.value = await inventoryApi.me() } catch { clearToken(); user.value = null }
}
async function submitAuth() {
  error.value = ''; message.value = ''; busy.value = true
  try {
    const result = mode.value === 'register'
      ? await inventoryApi.register(username.value.trim(), password.value)
      : await inventoryApi.login(username.value.trim(), password.value)
    localStorage.setItem('inventory_auth_token', result.token)
    user.value = result.user
    password.value = ''
    message.value = mode.value === 'register' ? 'Аккаунт создан. Ты вошёл в систему.' : 'Авторизация успешна.'
    await loadTools()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Не удалось выполнить запрос' }
  finally { busy.value = false }
}
async function logout() {
  try { await inventoryApi.logout() } catch { /* token may already have expired */ }
  clearToken(); user.value = null; message.value = 'Ты вышел из аккаунта.'; error.value = ''
}
async function loadTools() {
  try { stats.value = await inventoryApi.stats() } catch (e) { error.value = e instanceof Error ? e.message : 'Ошибка статистики' }
}
async function search() {
  error.value = ''; searchCount.value = null
  if (!query.value.trim()) { results.value = []; return }
  try { const data = await inventoryApi.search(query.value.trim()); results.value = data.items; searchCount.value = data.count }
  catch (e) { error.value = e instanceof Error ? e.message : 'Ошибка поиска' }
}
async function createBackup() {
  error.value = ''; backupInfo.value = ''
  try { const result = await inventoryApi.backup(); backupInfo.value = `Резервная копия создана: ${result.file} · предметов: ${result.items}` }
  catch (e) { error.value = e instanceof Error ? e.message : 'Не удалось создать копию' }
}
async function exportJson() {
  error.value = ''
  try {
    const payload = await inventoryApi.exportInventory()
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'inventory-export.json'; link.click(); URL.revokeObjectURL(url)
  } catch (e) { error.value = e instanceof Error ? e.message : 'Не удалось экспортировать данные' }
}
onMounted(async () => { await loadAccount(); await loadTools() })
</script>

<template>
  <section class="page account-page">
    <p class="eyebrow">USER SERVICES / API HUB</p>
    <h1>ACCOUNT & TOOLS</h1>
    <p class="muted intro">Реальные запросы к Python API: авторизация, профиль, статистика, поиск и резервное копирование.</p>
    <p v-if="message" class="notice success">{{ message }}</p>
    <p v-if="error" class="notice error">{{ error }}</p>
    <div class="account-grid">
      <section class="panel">
        <div class="panel-title">{{ loggedIn ? 'YOUR PROFILE' : 'AUTHENTICATION' }} <span>POST /auth</span></div>
        <template v-if="loggedIn">
          <div class="profile-avatar">{{ user?.username.slice(0, 1).toUpperCase() }}</div>
          <h2 class="profile-name">{{ user?.username }}</h2>
          <p class="muted">Аккаунт создан: {{ user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' }}</p>
          <div class="profile-actions"><button @click="loadAccount">REFRESH PROFILE · GET /auth/me</button><button class="secondary" @click="logout">LOG OUT · POST /auth/logout</button></div>
        </template>
        <template v-else>
          <div class="auth-tabs"><button :class="{ active: mode === 'login' }" @click="mode = 'login'; error = ''">LOGIN</button><button :class="{ active: mode === 'register' }" @click="mode = 'register'; error = ''">CREATE ACCOUNT</button></div>
          <form class="form auth-form" @submit.prevent="submitAuth">
            <label>USERNAME<input v-model="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_-]+" autocomplete="username" placeholder="e.g. blade_dev"></label>
            <label>PASSWORD<input v-model="password" required minlength="8" maxlength="128" type="password" autocomplete="current-password" placeholder="At least 8 characters"></label>
            <p class="muted tiny">Логин: 3–24 символа, латиница/цифры/_/-. Пароль от 8 символов.</p>
            <button :disabled="busy">{{ busy ? 'PLEASE WAIT…' : mode === 'login' ? 'SIGN IN →' : 'CREATE ACCOUNT →' }}</button>
          </form>
          <p class="muted tiny">Пароли хранятся в виде PBKDF2-хеша, сессия использует подписанный токен.</p>
        </template>
      </section>
      <section class="panel">
        <div class="panel-title">LIVE INVENTORY ANALYTICS <span>GET /api/stats</span></div>
        <div v-if="stats" class="metric-grid">
          <div class="metric"><strong>{{ stats.itemCount }}</strong><span>ITEMS</span></div>
          <div class="metric"><strong>{{ stats.totalQuantity }}</strong><span>TOTAL UNITS</span></div>
          <div class="metric"><strong>{{ stats.totalWeight }}</strong><span>TOTAL WEIGHT</span></div>
          <div class="metric"><strong>{{ stats.uniqueTypes }}</strong><span>ITEM TYPES</span></div>
        </div>
        <p v-else class="muted">Loading API analytics…</p>
        <div class="capacity-line"><span>GRID CAPACITY</span><b>{{ stats ? `${stats.itemCount} / ${stats.capacity}` : '—' }}</b></div>
        <div class="bar"><i :style="{ width: `${stats ? Math.min(100, stats.itemCount / Math.max(1, stats.capacity) * 100) : 0}%` }"></i></div>
        <button class="wide-action" @click="loadTools">↻ REFRESH ANALYTICS</button>
      </section>
    </div>
    <div class="panel tools-panel">
      <div class="panel-title">ITEM SEARCH <span>GET /api/items/search?q=...</span></div>
      <form class="search-row" @submit.prevent="search"><input v-model="query" placeholder="Search by name, type or description…" minlength="1"><button>SEARCH ↗</button></form>
      <p v-if="searchCount !== null" class="muted">Found {{ searchCount }} result(s)</p>
      <div v-if="results.length" class="search-results"><div v-for="item in results" :key="item.id" class="search-result"><strong>{{ item.icon }} {{ item.name }}</strong><span>{{ item.type }} · {{ item.rarity }} · x{{ item.quantity }}</span></div></div>
      <p v-else-if="searchCount === 0" class="muted">Nothing found in current inventory.</p>
    </div>
    <div class="panel tools-panel">
      <div class="panel-title">DATA UTILITIES <span>BACKUP / EXPORT</span></div>
      <p class="muted">Резервная копия сохраняется на стороне Python-сервера. Экспорт скачивает текущий инвентарь в JSON.</p>
      <div class="utility-actions"><button @click="createBackup">CREATE SERVER BACKUP · POST</button><button class="secondary" @click="exportJson">EXPORT JSON · GET</button></div>
      <p v-if="backupInfo" class="notice success">{{ backupInfo }}</p>
    </div>
  </section>
</template>
