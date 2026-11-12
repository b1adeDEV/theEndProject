<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { inventoryApi, type CraftRecipe } from '../api'
import { useInventoryStore } from '../stores/inventory'

const store = useInventoryStore()
const recipes = ref<CraftRecipe[]>([])
const selectedId = ref('')
const amount = ref(1)
const loading = ref(false)
const error = ref('')
const success = ref('')
const recipe = computed(() => recipes.value.find(r => r.id === selectedId.value))
const resources = computed(() => {
  const totals: Record<string, number> = {}
  for (const item of store.items) totals[item.templateId] = (totals[item.templateId] || 0) + item.quantity
  return totals
})
const resourceNames: Record<string, string> = { wood: 'Дерево', food: 'Рацион', med: 'Аптечка', tool: 'Набор инструментов' }
const canCraft = computed(() => !!recipe.value && Object.entries(recipe.value.ingredients).every(([id, count]) => (resources.value[id] || 0) >= count * amount.value))
const maxCraftable = computed(() => recipe.value ? Math.min(10, ...Object.entries(recipe.value.ingredients).map(([id, count]) => Math.floor((resources.value[id] || 0) / count))) : 0)

onMounted(async () => {
  try {
    const response = await inventoryApi.craftingRecipes()
    recipes.value = response.recipes
    selectedId.value = recipes.value[0]?.id || ''
  } catch (e) { error.value = e instanceof Error ? e.message : 'Не удалось загрузить рецепты' }
})
async function craft() {
  if (!recipe.value || !canCraft.value || loading.value) return
  error.value = ''; success.value = ''; loading.value = true
  try {
    await store.syncBeforeCraft()
    const result = await inventoryApi.craft(recipe.value.id, amount.value)
    store.applyServerState(result.state)
    success.value = `Создано: ${recipe.value.name} × ${amount.value}. Предмет добавлен в инвентарь!`
  } catch (e) { error.value = e instanceof Error ? e.message : 'Ошибка крафта' }
  finally { loading.value = false }
}
</script>

<template>
  <section class="page crafting-page">
    <div class="heading"><div><p class="eyebrow">SURVIVAL / WORKBENCH / 02</p><h1>CRAFTING <span class="craft-accent">STATION</span></h1><p class="craft-subtitle">Собирай ресурсы. Создавай снаряжение. Выживай.</p></div><div class="craft-counter">AVAILABLE RECIPES <strong>{{ recipes.length.toString().padStart(2, '0') }}</strong></div></div>
    <div v-if="error" class="craft-alert error" role="alert">{{ error }}</div>
    <div v-if="success" class="craft-alert success" role="status">{{ success }}</div>
    <div class="craft-layout">
      <div class="panel craft-recipes"><div class="panel-title">BLUEPRINTS <span>SELECT RECIPE</span></div><div class="recipe-list"><button v-for="r in recipes" :key="r.id" class="recipe-card" :class="{ chosen: selectedId === r.id }" @click="selectedId = r.id; amount = 1; error = ''; success = ''"><span class="recipe-icon">{{ r.icon }}</span><span class="recipe-meta"><strong>{{ r.name }}</strong><small>{{ r.rarity.toUpperCase() }} · {{ r.type.toUpperCase() }}</small></span><span class="recipe-arrow">›</span></button></div></div>
      <div class="panel craft-workbench" v-if="recipe"><div class="panel-title">WORKBENCH <span>RECIPE #{{ recipes.findIndex(r => r.id === recipe?.id) + 1 }}</span></div><div class="craft-hero"><div class="craft-hero-icon">{{ recipe.icon }}</div><div><span class="craft-tag">{{ recipe.rarity.toUpperCase() }} ITEM</span><h2>{{ recipe.name }}</h2><p>{{ recipe.description }}</p><small>{{ recipe.weight }} KG / UNIT · MAX STACK {{ recipe.maxStack }}</small></div></div><div class="craft-section-title">REQUIRED MATERIALS <span>{{ Object.keys(recipe.ingredients).length }} TYPES</span></div><div class="ingredients"><div v-for="(count, id) in recipe.ingredients" :key="id" class="ingredient"><div><strong>{{ resourceNames[String(id)] || id }}</strong><small>В инвентаре: {{ resources[String(id)] || 0 }}</small></div><b :class="{ insufficient: (resources[String(id)] || 0) < count * amount }">{{ resources[String(id)] || 0 }} / {{ count * amount }}</b></div></div><div class="craft-actions"><div class="craft-amount"><label for="craft-amount">КОЛИЧЕСТВО</label><div><button :disabled="amount <= 1" @click="amount--">−</button><strong>{{ amount }}</strong><button :disabled="amount >= 10" @click="amount++">+</button></div></div><button class="craft-button" :disabled="!canCraft || loading" @click="craft">{{ loading ? 'СОЗДАНИЕ...' : '⚒ СОЗДАТЬ ПРЕДМЕТ' }}</button></div><p class="craft-hint">{{ canCraft ? `Доступно для создания: ${maxCraftable}` : 'Недостаточно ресурсов для выбранного количества' }}</p></div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.crafting-page { --craft-purple:#a78bfa; color:#e9e6f4; }
.craft-accent { color:var(--craft-purple); }
.craft-subtitle { color:#9993ac; margin-top:8px; }
.craft-counter { text-align:right; font-size:11px; letter-spacing:2px; color:#9c94ae; }
.craft-counter strong { display:block; font-size:34px; color:#c4b5fd; margin-top:6px; }
.craft-layout { display:grid; grid-template-columns:minmax(260px, .9fr) minmax(360px, 1.6fr); gap:20px; margin-top:24px; }
.craft-recipes,.craft-workbench { min-width:0; }
.recipe-list { display:grid; gap:10px; padding:18px; }
.recipe-card { width:100%; border:1px solid #383047; background:#1c1825; color:#f2ecff; border-radius:10px; padding:14px; display:flex; align-items:center; text-align:left; gap:14px; cursor:pointer; transition:.2s; }
.recipe-card:hover,.recipe-card.chosen { border-color:#9c6aff; background:#2c203e; box-shadow:inset 3px 0 #a78bfa; }
.recipe-icon { font-size:30px; width:46px; text-align:center; }
.recipe-meta { display:grid; gap:6px; flex:1; }.recipe-meta strong { font-size:14px; }.recipe-meta small { font-size:10px; letter-spacing:1px; color:#aaa0bc; }.recipe-arrow { color:#a78bfa; font-size:28px; }
.craft-workbench { padding-bottom:20px; }.craft-hero { display:flex; gap:24px; align-items:center; padding:30px 25px; border-bottom:1px solid #393143; }.craft-hero-icon { display:grid; place-items:center; flex-shrink:0; width:125px; height:125px; font-size:68px; border-radius:14px; background:radial-gradient(circle,#4a3169,#1a1524 75%); border:1px solid #61417f; box-shadow:0 0 35px #8b5cf622; }.craft-hero h2 { font-size:26px; margin:12px 0; }.craft-hero p { color:#b9b0c9; margin-bottom:12px; }.craft-hero small { color:#8f85a1; }.craft-tag { font-size:10px; letter-spacing:2px; color:#c4b5fd; }
.craft-section-title { display:flex; justify-content:space-between; margin:25px 25px 14px; font-size:12px; font-weight:700; letter-spacing:1.5px; }.craft-section-title span { color:#9386a4; font-size:10px; }.ingredients { margin:0 25px; display:grid; gap:10px; }.ingredient { display:flex; justify-content:space-between; align-items:center; background:#211b2c; border:1px solid #3b304b; padding:14px; border-radius:8px; }.ingredient div { display:grid; gap:6px; }.ingredient small { color:#9b91aa; }.ingredient b { color:#86efac; }.ingredient b.insufficient { color:#fb7185; }
.craft-actions { margin:25px 25px 0; display:flex; gap:15px; align-items:end; }.craft-amount label { display:block; color:#a9a0b7; font-size:10px; letter-spacing:1px; margin-bottom:8px; }.craft-amount>div { display:flex; align-items:center; gap:15px; }.craft-amount button { width:32px; height:38px; border-radius:6px; background:#2d243d; color:white; border:1px solid #5d477b; cursor:pointer; }.craft-amount button:disabled { opacity:.4; }.craft-button { flex:1; min-height:43px; border:0; border-radius:7px; background:linear-gradient(110deg,#7c3aed,#a855f7); color:white; font-weight:800; letter-spacing:1px; cursor:pointer; }.craft-button:disabled { background:#44394f; color:#8e819b; cursor:not-allowed; }.craft-hint { margin:14px 25px 0; color:#a69bb5; font-size:12px; }.craft-alert { padding:12px 18px; margin-top:18px; border-radius:8px; }.craft-alert.error { background:#4a2030; color:#fecdd3; }.craft-alert.success { background:#173f33; color:#a7f3d0; }
@media(max-width:850px) { .craft-layout { grid-template-columns:1fr; }.craft-hero { flex-wrap:wrap; }.craft-actions { flex-wrap:wrap; }.craft-button { min-width:190px; } }
</style>
