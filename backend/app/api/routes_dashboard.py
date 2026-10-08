from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.asset import Asset
from app.models.site import Site
from app.schemas.dashboard import (
    DashboardResponse, ComplianceMetrics, PriorityActionItem, SiteStat
)
from app.services.asset_service import AssetService
from app.services.compliance_engine import ComplianceEngine

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardResponse)
def get_dashboard_summary(
    site_id: Optional[int] = Query(None, description="Filter dashboard by specific site"),
    db: Session = Depends(get_db)
):
    today = date.today()
    
    # 1. Fetch assets
    query = db.query(Asset).options(
        joinedload(Asset.site),
        joinedload(Asset.hydrotests)
    )
    if site_id:
        query = query.filter(Asset.site_id == site_id)
        
    assets = query.all()

    # 2. Compute dynamic metrics & action queues
    total_assets = len(assets)
    counts = {
        "VALID": 0,
        "DUE_SOON": 0,
        "OVERDUE": 0,
        "FAILED": 0,
        "PENDING": 0
    }

    overdue_items = []
    due_soon_items = []

    for a in assets:
        enriched = AssetService.enrich_asset_response(a, current_date=today)
        st = enriched["compliance_status"]
        if st in counts:
            counts[st] += 1
        
        days_rem = enriched["days_remaining"]
        urgency = ComplianceEngine.get_urgency_level(st, days_rem)
        
        # Build action queue item
        action_item = PriorityActionItem(
            asset_id_str=a.asset_id,
            asset_db_id=a.id,
            site_name=a.site.name if a.site else "Unknown Site",
            asset_type=a.asset_type,
            vehicle_number=a.vehicle_number,
            cylinder_number=a.cylinder_number,
            compliance_status=st,
            next_due_date=str(enriched["next_due_date"]) if enriched["next_due_date"] else None,
            days_diff=days_rem,
            urgency_level=urgency,
            recommended_action="RECORD_HYDROTEST" if st in ["OVERDUE", "FAILED", "PENDING"] else "SCHEDULE_TEST"
        )

        if st in ["OVERDUE", "FAILED"]:
            overdue_items.append(action_item)
        elif st == "DUE_SOON":
            due_soon_items.append(action_item)

    # Sort Overdue Queue: Most severely overdue first
    overdue_items.sort(key=lambda x: (x.days_diff if x.days_diff is not None else 999))
    # Sort Due Soon Queue: Earliest due date first
    due_soon_items.sort(key=lambda x: (x.days_diff if x.days_diff is not None else 999))

    comp_rate = 0.0
    if total_assets > 0:
        comp_rate = round((counts["VALID"] / total_assets) * 100, 1)

    metrics = ComplianceMetrics(
        total_assets=total_assets,
        valid=counts["VALID"],
        due_soon=counts["DUE_SOON"],
        overdue=counts["OVERDUE"],
        failed=counts["FAILED"],
        pending=counts["PENDING"],
        compliance_percentage=comp_rate
    )

    # 3. Calculate breakdown by Site
    all_sites = db.query(Site).options(joinedload(Site.assets)).all()
    site_breakdowns = []
    for s in all_sites:
        s_counts = {"VALID": 0, "DUE_SOON": 0, "OVERDUE": 0, "FAILED": 0, "PENDING": 0}
        for sa in s.assets:
            sa_enriched = AssetService.enrich_asset_response(sa, current_date=today)
            c_st = sa_enriched["compliance_status"]
            if c_st in s_counts:
                s_counts[c_st] += 1
        
        site_breakdowns.append(SiteStat(
            site_id=s.id,
            site_code=s.code,
            site_name=s.name,
            total_assets=len(s.assets),
            valid=s_counts["VALID"],
            due_soon=s_counts["DUE_SOON"],
            overdue=s_counts["OVERDUE"],
            failed=s_counts["FAILED"],
            pending=s_counts["PENDING"]
        ))

    return DashboardResponse(
        metrics=metrics,
        overdue_queue=overdue_items,
        due_soon_queue=due_soon_items,
        site_breakdowns=site_breakdowns
    )
