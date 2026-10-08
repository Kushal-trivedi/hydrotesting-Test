from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.asset import (
    AssetCreate, AssetUpdate, AssetResponse, AssetDetailResponse
)
from app.schemas.site import SiteResponse
from app.schemas.hydrotest import HydrotestResponse
from app.services.asset_service import AssetService
from app.models.asset import Asset
from app.models.site import Site

router = APIRouter(prefix="/assets", tags=["Assets"])

@router.get("", response_model=List[AssetResponse])
def get_assets(
    search: Optional[str] = Query(None, description="Search by Asset ID, Serial No, Vehicle No, Cylinder No"),
    site_id: Optional[int] = Query(None, description="Filter by Site ID"),
    asset_type: Optional[str] = Query(None, description="Filter by Asset Type"),
    operational_status: Optional[str] = Query(None, description="ACTIVE, INACTIVE, RETIRED"),
    compliance_status: Optional[str] = Query(None, description="VALID, DUE_SOON, OVERDUE, FAILED, PENDING"),
    due_from: Optional[date] = Query(None, description="Due date from"),
    due_to: Optional[date] = Query(None, description="Due date to"),
    sort_by: str = Query("next_due_date", pattern="^(next_due_date|asset_id|created_at)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    results = AssetService.list_assets(
        db=db,
        search=search,
        site_id=site_id,
        asset_type=asset_type,
        operational_status=operational_status,
        compliance_status=compliance_status,
        due_from=due_from,
        due_to=due_to,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return results

@router.post("", response_model=AssetResponse, status_code=201)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    try:
        new_asset = AssetService.create_asset(db=db, obj_in=payload)
        enriched = AssetService.enrich_asset_response(new_asset)
        return enriched
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.get("/{asset_id}", response_model=AssetDetailResponse)
def get_asset_detail(asset_id: int, db: Session = Depends(get_db)):
    asset = AssetService.get_asset_by_id(db=db, asset_id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset with ID {asset_id} not found.")
    
    enriched = AssetService.enrich_asset_response(asset)
    
    # Format site
    site_dto = None
    if asset.site:
        site_dto = SiteResponse(
            id=asset.site.id,
            code=asset.site.code,
            name=asset.site.name,
            city=asset.site.city,
            state=asset.site.state,
            created_at=asset.site.created_at,
            updated_at=asset.site.updated_at,
            asset_count=len(asset.site.assets)
        )

    # Format hydrotests list
    test_dtos = [
        HydrotestResponse.model_validate(t)
        for t in asset.hydrotests
    ]

    return AssetDetailResponse(
        **enriched,
        site=site_dto,
        hydrotests=test_dtos
    )

@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: int, payload: AssetUpdate, db: Session = Depends(get_db)):
    asset = AssetService.get_asset_by_id(db=db, asset_id=asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset with ID {asset_id} not found.")
    
    try:
        updated = AssetService.update_asset(db=db, asset=asset, obj_in=payload)
        return AssetService.enrich_asset_response(updated)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset with ID {asset_id} not found.")
    
    db.delete(asset)
    db.commit()
    return None
