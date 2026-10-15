# Inventory Python backend

Python 3.10+ required. From the project root, install dependencies and start the API:

```bash
py -m venv backend/.venv
backend\.venv\Scripts\python -m pip install -r backend/requirements.txt
backend\.venv\Scripts\python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

API health: http://127.0.0.1:8000/api/health
State is stored in `backend/data/inventory.json`.
