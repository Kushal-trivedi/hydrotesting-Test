import json
from datetime import date, datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc, asc

from app.models.asset import Asset
from app.models.hydrotest import HydrotestRecord
from app.models.site import Site
from app.models.audit import AuditLog
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetDetailResponse
from app.schemas.hydrotest import HydrotestResponse
from app.schemas.site import SiteResponse
from app.services.compliance_engine import ComplianceEngine

class AssetService:
    @classmethod
    def enrich_asset_response(cls, asset: Asset, current_date: Optional[date] = None) -> Dict[str, Any]:
        """Calculates dynamic compliance state based on chronological tests."""
        latest_test = None
        if asset.hydrotests:
            # Assumed sorted desc by test_date
            latest_test = asset.hydrotests[0]

        latest_result = latest_test.result if latest_test else None
        next_due = latest_test.next_due_date if latest_test else None
        last_test_date = latest_test.test_date if latest_test else None

        compliance_status, days_rem = ComplianceEngine.calculate_status(
            latest_test_result=latest_result,
            next_due_date=next_due,
            current_date=current_date
        )

        return {
            "id": asset.id,
            "asset_id": asset.asset_id,
            "site_id": asset.site_id,
            "site_name": asset.site.name if asset.site else None,
            "site_code": asset.site.code if asset.site else None,
            "asset_type": asset.asset_type,
            "serial_number": asset.serial_number,
            "manufacturer": asset.manufacturer,
            "model": asset.model,
            "capacity_liters": asset.capacity_liters,
            "installation_date": asset.installation_date,
            "cylinder_number": asset.cylinder_number,
            "vehicle_number": asset.vehicle_number,
            "vehicle_make": asset.vehicle_make,
            "vehicle_model": asset.vehicle_model,
            "vehicle_fuel_type": asset.vehicle_fuel_type,
            "vehicle_verified": asset.vehicle_verified,
            "status": asset.status,
            "created_at": asset.created_at,
            "updated_at": asset.updated_at,
            "compliance_status": compliance_status,
            "days_remaining": days_rem,
            "next_due_date": next_due,
            "last_test_date": last_test_date,
            "last_test_result": latest_result,
            "total_tests": len(asset.hydrotests)
        }

    @classmethod
    def get_asset_by_id(cls, db: Session, asset_id: int) -> Optional[Asset]:
        return db.query(Asset).options(
            joinedload(Asset.site),
            joinedload(Asset.hydrotests)
        ).filter(Asset.id == asset_id).first()

    @classmethod
    def get_asset_by_asset_id_str(cls, db: Session, asset_id_str: str) -> Optional[Asset]:
        return db.query(Asset).filter(Asset.asset_id == asset_id_str).first()

    @classmethod
    def get_asset_by_serial(cls, db: Session, serial: str) -> Optional[Asset]:
        return db.query(Asset).filter(Asset.serial_number == serial).first()

    @classmethod
    def create_asset(cls, db: Session, obj_in: AssetCreate) -> Asset:
        # Check uniqueness
        if cls.get_asset_by_asset_id_str(db, obj_in.asset_id):
            raise ValueError(f"Asset ID '{obj_in.asset_id}' is already registered.")
        if cls.get_asset_by_serial(db, obj_in.serial_number):
            raise ValueError(f"Serial number '{obj_in.serial_number}' is already registered.")

        # Ensure site exists
        site = db.query(Site).filter(Site.id == obj_in.site_id).first()
        if not site:
            raise ValueError(f"Site ID {obj_in.site_id} does not exist.")

        asset_data = obj_in.model_dump()
        new_asset = Asset(**asset_data)
        db.add(new_asset)
        db.commit()
        db.refresh(new_asset)

        # Audit log
        audit = AuditLog(
            entity_type="ASSET",
            entity_id=new_asset.id,
            action="CREATE",
            changes=json.dumps({"asset_id": new_asset.asset_id, "serial_number": new_asset.serial_number})
        )
        db.add(audit)
        db.commit()

        return new_asset

    @classmethod
    def update_asset(cls, db: Session, asset: Asset, obj_in: AssetUpdate) -> Asset:
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # Check uniqueness if serial number is changing
        if "serial_number" in update_data and update_data["serial_number"] != asset.serial_number:
            existing = cls.get_asset_by_serial(db, update_data["serial_number"])
            if existing and existing.id != asset.id:
                raise ValueError(f"Serial number '{update_data['serial_number']}' already in use.")

        changes = {}
        for key, value in update_data.items():
            old_val = getattr(asset, key)
            if old_val != value:
                changes[key] = {"old": str(old_val), "new": str(value)}
                setattr(asset, key, value)

        asset.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(asset)

        if changes:
            audit = AuditLog(
                entity_type="ASSET",
                entity_id=asset.id,
                action="UPDATE",
                changes=json.dumps(changes)
            )
            db.add(audit)
            db.commit()

        return asset

    @classmethod
    def list_assets(
        cls,
        db: Session,
        search: Optional[str] = None,
        site_id: Optional[int] = None,
        asset_type: Optional[str] = None,
        operational_status: Optional[str] = None,
        compliance_status: Optional[str] = None,
        due_from: Optional[date] = None,
        due_to: Optional[date] = None,
        sort_by: str = "next_due_date",
        sort_order: str = "asc"
    ) -> List[Dict[str, Any]]:
        """Searches, filters and sorts assets, computing dynamic compliance state."""
        query = db.query(Asset).options(
            joinedload(Asset.site),
            joinedload(Asset.hydrotests)
        )

        # Basic database-level filters
        if site_id:
            query = query.filter(Asset.site_id == site_id)
        if asset_type and asset_type != "ALL":
            query = query.filter(Asset.asset_type == asset_type)
        if operational_status and operational_status != "ALL":
            query = query.filter(Asset.status == operational_status)

        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Asset.asset_id.ilike(s),
                    Asset.serial_number.ilike(s),
                    Asset.cylinder_number.ilike(s),
                    Asset.vehicle_number.ilike(s),
                    Asset.manufacturer.ilike(s),
                    Asset.model.ilike(s)
                )
            )

        assets = query.all()
        enriched: List[Dict[str, Any]] = [cls.enrich_asset_response(a) for a in assets]

        # Post-filter by compliance status (since compliance is dynamic)
        if compliance_status and compliance_status != "ALL":
            enriched = [a for a in enriched if a["compliance_status"] == compliance_status]

        # Post-filter by due date range
        if due_from:
            enriched = [a for a in enriched if a["next_due_date"] and a["next_due_date"] >= due_from]
        if due_to:
            enriched = [a for a in enriched if a["next_due_date"] and a["next_due_date"] <= due_to]

        # Sorting
        reverse = (sort_order.lower() == "desc")
        if sort_by == "next_due_date":
            # Sort assets with no due date to the bottom
            max_or_min_date = date.min if reverse else date.max
            enriched.sort(
                key=lambda x: (x["next_due_date"] is None, x["next_due_date"] or max_or_min_date),
                reverse=reverse
            )
        elif sort_by == "asset_id":
            enriched.sort(key=lambda x: x["asset_id"], reverse=reverse)
        elif sort_by == "created_at":
            enriched.sort(key=lambda x: x["created_at"], reverse=reverse)

        return enriched
