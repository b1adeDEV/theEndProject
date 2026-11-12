from pathlib import Path
from threading import Lock
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json, hashlib, hmac, secrets, base64, os

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATA_FILE = DATA_DIR / "inventory.json"
USERS_FILE = DATA_DIR / "users.json"
TOKEN_SECRET = os.getenv("INVENTORY_TOKEN_SECRET", "dev-only-change-this-secret")
lock = Lock()
app = FastAPI(title="Inventory API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DEFAULT_STATE = {"items": [], "positions": {}, "equipment": {"head": None, "body": None, "armor": None, "weapon": None, "backpack": None}, "gridColumns": 10, "gridRows": 6}
class InventoryState(BaseModel):
    items: list[dict] = Field(default_factory=list)
    positions: dict[str, int] = Field(default_factory=dict)
    equipment: dict[str, str | None] = Field(default_factory=lambda: DEFAULT_STATE["equipment"].copy())
    gridColumns: int = 10
    gridRows: int = 6
class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=24, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(min_length=8, max_length=128)

def read_json(path, fallback):
    try: return json.loads(path.read_text(encoding="utf-8")) if path.exists() else fallback
    except (OSError, json.JSONDecodeError): return fallback

def users(): return read_json(USERS_FILE, {})
def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 180000).hex()
    return {"salt": salt, "hash": digest}
def issue_token(username):
    expiry = int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())
    payload = base64.urlsafe_b64encode(f"{username}:{expiry}".encode()).decode().rstrip("=")
    signature = hmac.new(TOKEN_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"
def current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    token = authorization[7:]
    try:
        payload, signature = token.rsplit(".", 1)
        expected = hmac.new(TOKEN_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected): raise ValueError()
        decoded = base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)).decode()
        username, expiry = decoded.rsplit(":", 1)
        if int(expiry) < int(datetime.now(timezone.utc).timestamp()) or username not in users(): raise ValueError()
        return username
    except Exception:
        raise HTTPException(status_code=401, detail="Токен недействителен или истёк")

def read_state(): return read_json(DATA_FILE, DEFAULT_STATE.copy())
@app.get("/api/health")
def health(): return {"status": "ok", "service": "inventory-backend", "time": datetime.now(timezone.utc).isoformat()}
@app.post("/api/auth/register")
def register(credentials: Credentials):
    username = credentials.username.lower()
    with lock:
        data = users()
        if username in data: raise HTTPException(status_code=409, detail="Такой пользователь уже существует")
        data[username] = {"password": password_hash(credentials.password), "createdAt": datetime.now(timezone.utc).isoformat()}
        USERS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"token": issue_token(username), "user": {"username": username, "createdAt": data[username]["createdAt"]}}
@app.post("/api/auth/login")
def login(credentials: Credentials):
    username = credentials.username.lower(); record = users().get(username)
    if not record: raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    candidate = password_hash(credentials.password, record["password"]["salt"])["hash"]
    if not hmac.compare_digest(candidate, record["password"]["hash"]): raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    return {"token": issue_token(username), "user": {"username": username, "createdAt": record["createdAt"]}}
@app.get("/api/auth/me")
def me(username: str = Depends(current_user)):
    record = users()[username]
    return {"username": username, "createdAt": record["createdAt"]}
@app.post("/api/auth/logout")
def logout(username: str = Depends(current_user)): return {"ok": True, "message": "Удалите токен на клиенте, чтобы завершить сессию"}
@app.get("/api/state")
def get_state():
    with lock: return read_state()
@app.put("/api/state")
def save_state(state: InventoryState):
    data = state.model_dump()
    if not 4 <= data["gridColumns"] <= 15 or not 3 <= data["gridRows"] <= 10: raise HTTPException(status_code=422, detail="Размер сетки вне допустимых границ")
    with lock: DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "savedAt": datetime.now(timezone.utc).isoformat()}
@app.get("/api/stats")
def stats():
    state = read_state(); items = state.get("items", [])
    return {"itemCount": len(items), "totalQuantity": sum(int(i.get("quantity", 0)) for i in items), "totalWeight": round(sum(float(i.get("weight", 0))*int(i.get("quantity", 1)) for i in items), 2), "uniqueTypes": len({i.get("type") for i in items}), "capacity": state.get("gridColumns", 10)*state.get("gridRows", 6)}
@app.get("/api/items/search")
def search_items(q: str = Query(min_length=1, max_length=80)):
    items = read_state().get("items", []); query = q.casefold()
    results = [item for item in items if query in str(item.get("name", "")).casefold() or query in str(item.get("type", "")).casefold() or query in str(item.get("description", "")).casefold()]
    return {"query": q, "count": len(results), "items": results[:50]}
@app.get("/api/inventory/export")
def export_inventory(): return {"exportedAt": datetime.now(timezone.utc).isoformat(), "state": read_state()}
@app.post("/api/inventory/backup")
def backup_inventory():
    state = read_state(); backup = DATA_DIR / f"inventory-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    backup.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "file": backup.name, "items": len(state.get("items", []))}


# Crafting recipes are authoritative on the server. Clients submit only recipe IDs.
CRAFT_RECIPES = [
    {"id":"field_bandage","name":"Полевые бинты","icon":"🩹","description":"Комплект перевязочных материалов","type":"medical","rarity":"common","weight":0.2,"maxStack":20,"width":1,"height":1,"ingredients":{"wood":8,"food":1}},
    {"id":"campfire_kit","name":"Набор для костра","icon":"🔥","description":"Набор для обустройства лагеря","type":"misc","rarity":"uncommon","weight":1.5,"maxStack":10,"width":1,"height":1,"ingredients":{"wood":35}},
    {"id":"wooden_crate","name":"Деревянный ящик","icon":"📦","description":"Прочный ящик для хранения","type":"misc","rarity":"uncommon","weight":3.0,"maxStack":5,"width":2,"height":2,"ingredients":{"wood":60}},
    {"id":"repair_kit","name":"Ремонтный комплект","icon":"🔧","description":"Набор для полевого ремонта","type":"misc","rarity":"rare","weight":1.0,"maxStack":5,"width":1,"height":1,"ingredients":{"wood":25,"tool":1}},
    {"id":"survival_pack","name":"Набор выживальщика","icon":"🎒","description":"Комплект для дальнего похода","type":"misc","rarity":"epic","weight":2.0,"maxStack":3,"width":2,"height":2,"ingredients":{"wood":40,"food":2,"med":1}},
]

class CraftRequest(BaseModel):
    recipeId: str
    amount: int = Field(default=1, ge=1, le=10)

@app.get("/api/crafting/recipes")
def crafting_recipes():
    return {"recipes": CRAFT_RECIPES}

@app.post("/api/crafting/craft")
def craft_item(payload: CraftRequest):
    recipe = next((r for r in CRAFT_RECIPES if r["id"] == payload.recipeId), None)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Рецепт не найден")
    with lock:
        state = read_state()
        inventory = state.get("items", [])
        positions = state.get("positions", {})
        required = {key: value * payload.amount for key, value in recipe["ingredients"].items()}
        for template_id, count in required.items():
            available = sum(max(0, int(item.get("quantity", 0))) for item in inventory if item.get("templateId") == template_id)
            if available < count:
                raise HTTPException(status_code=409, detail=f"Недостаточно ресурсов: {template_id} (нужно {count}, есть {available})")

        # Calculate on a copy: a failed craft must not consume resources.
        new_items = [dict(item) for item in inventory]
        new_positions = dict(positions)
        for template_id, count in required.items():
            remaining = count
            for item in list(new_items):
                if item.get("templateId") != template_id or remaining == 0:
                    continue
                take = min(remaining, max(0, int(item.get("quantity", 0))))
                item["quantity"] -= take
                remaining -= take
                if item["quantity"] == 0:
                    new_items.remove(item)
                    new_positions.pop(item.get("id"), None)
                    for slot, equipped_id in state.get("equipment", {}).items():
                        if equipped_id == item.get("id"):
                            state["equipment"][slot] = None

        remaining = payload.amount
        for item in new_items:
            if item.get("templateId") == recipe["id"] and remaining:
                space = max(0, recipe["maxStack"] - int(item.get("quantity", 0)))
                taken = min(space, remaining)
                item["quantity"] += taken
                remaining -= taken
        capacity = int(state.get("gridColumns", 10)) * int(state.get("gridRows", 6))
        while remaining:
            occupied = set(new_positions.values())
            free = next((i for i in range(capacity) if i not in occupied), None)
            if free is None:
                raise HTTPException(status_code=409, detail="Нет свободных ячеек для результата крафта")
            count = min(remaining, recipe["maxStack"])
            item_id = f"crafted-{secrets.token_hex(12)}"
            new_items.append({key: value for key, value in recipe.items() if key not in ("id", "ingredients") } | {"id": item_id, "templateId": recipe["id"], "quantity": count})
            new_positions[item_id] = free
            remaining -= count
        state["items"] = new_items
        state["positions"] = new_positions
        DATA_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
        return {"ok": True, "crafted": {"recipeId": recipe["id"], "amount": payload.amount}, "state": state}
