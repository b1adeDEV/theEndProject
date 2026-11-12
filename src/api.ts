import type { InventoryItem } from './types/inventory'
export interface InventoryStatePayload { items: InventoryItem[]; positions: Record<string, number>; equipment: Record<string, string | null>; gridColumns: number; gridRows: number }
export interface AuthUser { username: string; createdAt: string }
const API_BASE = '/api'
const TOKEN_KEY = 'inventory_auth_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) } })
  if (!response.ok) {
    let message = `API error ${response.status}`
    try { const body = await response.json(); message = body.detail || message } catch { /* ignore non-JSON error */ }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}
export const inventoryApi = {
  getState: () => request<InventoryStatePayload>('/state'),
  saveState: (state: InventoryStatePayload) => request<{ ok: boolean; savedAt?: string }>('/state', { method: 'PUT', body: JSON.stringify(state) }),
  craftingRecipes: () => request<{ recipes: CraftRecipe[] }>('/crafting/recipes'),
  craft: (recipeId: string, amount = 1) => request<{ ok: boolean; crafted: { recipeId: string; amount: number }; state: InventoryStatePayload }>('/crafting/craft', { method: 'POST', body: JSON.stringify({ recipeId, amount }) }),
  health: () => request<{ status: string; service: string; time: string }>('/health'),
  register: (username: string, password: string) => request<{ token: string; user: AuthUser }>('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) => request<{ token: string; user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request<AuthUser>('/auth/me'),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  stats: () => request<{ itemCount: number; totalQuantity: number; totalWeight: number; uniqueTypes: number; capacity: number }>('/stats'),
  search: (query: string) => request<{ query: string; count: number; items: InventoryItem[] }>(`/items/search?q=${encodeURIComponent(query)}`),
  backup: () => request<{ ok: boolean; file: string; items: number }>('/inventory/backup'),
  exportInventory: () => request<{ exportedAt: string; state: InventoryStatePayload }>('/inventory/export'),
}

export interface CraftRecipe { id: string; name: string; icon: string; description: string; type: string; rarity: string; weight: number; maxStack: number; width: number; height: number; ingredients: Record<string, number> }
