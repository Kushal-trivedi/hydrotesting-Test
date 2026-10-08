from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.site import Site
from app.schemas.site import SiteResponse, SiteCreate

router = APIRouter(prefix="/sites", tags=["Sites"])

@router.get("", response_model=List[SiteResponse])
def get_sites(db: Session = Depends(get_db)):
    sites = db.query(Site).order_by(Site.name).all()
    out = []
    for s in sites:
        out.append(SiteResponse(
            id=s.id,
            code=s.code,
            name=s.name,
            city=s.city,
            state=s.state,
            created_at=s.created_at,
            updated_at=s.updated_at,
            asset_count=len(s.assets)
        ))
    return out

@router.post("", response_model=SiteResponse, status_code=201)
def create_site(payload: SiteCreate, db: Session = Depends(get_db)):
    existing = db.query(Site).filter(Site.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Site code '{payload.code}' already exists.")
    
    site = Site(**payload.model_dump())
    db.add(site)
    db.commit()
    db.refresh(site)
    return SiteResponse(
        id=site.id,
        code=site.code,
        name=site.name,
        city=site.city,
        state=site.state,
        created_at=site.created_at,
        updated_at=site.updated_at,
        asset_count=0
    )
