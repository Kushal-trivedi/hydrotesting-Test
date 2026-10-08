from fastapi import APIRouter
from app.api.routes_sites import router as sites_router
from app.api.routes_assets import router as assets_router
from app.api.routes_hydrotests import router as hydrotests_router
from app.api.routes_vehicles import router as vehicles_router
from app.api.routes_dashboard import router as dashboard_router

api_router = APIRouter()

api_router.include_router(dashboard_router)
api_router.include_router(assets_router)
api_router.include_router(hydrotests_router)
api_router.include_router(vehicles_router)
api_router.include_router(sites_router)
