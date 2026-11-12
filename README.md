# B1ADE DEV Inventory — Vue + FastAPI

## Requirements
- Node.js 18+
- Python 3.10+

## Run frontend and backend together (Windows)
```powershell
npm install
py -m pip install -r backend/requirements.txt
npm run dev:all
```
Frontend: http://127.0.0.1:5173  
Backend API: http://127.0.0.1:8000  
Swagger docs: http://127.0.0.1:8000/docs

## Working API endpoints
- `GET /api/health` — server health
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — login, returns signed token
- `GET /api/auth/me` — current profile (Bearer token)
- `POST /api/auth/logout` — logout acknowledgement (client clears token)
- `GET /api/state`, `PUT /api/state` — inventory state load/save
- `GET /api/stats` — inventory analytics
- `GET /api/items/search?q=...` — search current inventory
- `GET /api/inventory/export` — export current state as JSON
- `POST /api/inventory/backup` — create a server-side backup

Accounts are stored in `backend/data/users.json`; passwords are stored as PBKDF2 hashes, not plaintext. Inventory state is stored in `backend/data/inventory.json`. For production, set `INVENTORY_TOKEN_SECRET` to a long random secret and use a database/HTTPS. The development token secret is not suitable for public deployment.
