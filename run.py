import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

import uvicorn
from app.database import SessionLocal, engine, Base, migrate_schema
from app.core.seeds import seed_permanent_accounts

if __name__ == "__main__":
    print("=" * 75)
    print(" HydroSafe Compliance Operating System")
    print(" Web UI & App:     http://localhost:8000")
    print(" Interactive Docs: http://localhost:8000/docs")
    print("-" * 75)
    print(" PERMANENT ACCOUNTS:")
    print("   [+] Admin:    admin@hydrosafe.com    /  Admin@HydroSafe2026")
    print("   [+] Operator: operator@hydrosafe.com /  Operator@2026")
    print("=" * 75)
    
    # Ensure tables exist and permanent seeds are verified
    Base.metadata.create_all(bind=engine)
    migrate_schema(engine)
    db = SessionLocal()
    try:
        seed_permanent_accounts(db)
    finally:
        db.close()

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
