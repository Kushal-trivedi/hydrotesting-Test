from fastapi import APIRouter
from app.api.routes_sites import router as sites_router
from app.api.routes_assets import router as assets_router
from app.api.routes_hydrotests import router as hydrotests_router
from app.api.routes_vehicles import router as vehicles_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_auth import router as auth_router
from app.api.routes_admin import router as admin_router
from app.api.routes_audit import router as audit_router
from app.api.routes_scans import router as scans_router

api_router = APIRouter()

# Authentication & Access Control
api_router.include_router(auth_router)
api_router.include_router(admin_router)
api_router.include_router(audit_router)
api_router.include_router(scans_router)

# Core HydroSafe Asset & Compliance Endpoints (Preserved)
api_router.include_router(dashboard_router)
api_router.include_router(assets_router)
api_router.include_router(hydrotests_router)
api_router.include_router(vehicles_router)
api_router.include_router(sites_router)
