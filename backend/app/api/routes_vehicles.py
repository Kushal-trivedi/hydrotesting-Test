from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.asset import Asset
from app.models.audit import AuditLog
from app.schemas.verification import VehicleLookupRequest, VehicleLookupResponse
from app.schemas.asset import AssetResponse
from app.services.vehicle_service import ExternalVehicleService
from app.services.asset_service import AssetService

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

@router.post("/lookup", response_model=VehicleLookupResponse)
async def lookup_vehicle(payload: VehicleLookupRequest):
    """
    Lookup vehicle in VAHAN registry.
    Handles syntax validation, mock sandbox, and live API fallback gracefully.
    """
    return await ExternalVehicleService.lookup_vehicle(payload.vehicle_number)

@router.post("/link-to-asset/{asset_id}", response_model=AssetResponse)
async def verify_and_link_vehicle(
    asset_id: int,
    payload: VehicleLookupRequest,
    db: Session = Depends(get_db)
):
    """Verifies vehicle plate and saves verified vehicle dossier onto the asset."""
    asset = AssetService.get_asset_by_id(db=db, asset_id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found.")

    res = await ExternalVehicleService.lookup_vehicle(payload.vehicle_number)
    if not res.success or not res.data:
        raise HTTPException(status_code=400, detail=res.message)

    v = res.data
    asset.vehicle_number = v.vehicle_number
    asset.vehicle_make = v.make
    asset.vehicle_model = v.model
    asset.vehicle_fuel_type = v.fuel_type
    asset.vehicle_verified = True
    asset.vehicle_verification_date = datetime.now(timezone.utc)
    asset.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(asset)

    # Log action
    audit = AuditLog(
        entity_type="ASSET",
        entity_id=asset.id,
        action="VEHICLE_VERIFICATION",
        changes=f"Verified vehicle {v.vehicle_number} ({v.make} {v.model})"
    )
    db.add(audit)
    db.commit()

    return AssetService.enrich_asset_response(asset)
