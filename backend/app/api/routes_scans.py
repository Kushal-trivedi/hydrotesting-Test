from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.vehicle_check import VehicleCheck
from app.core.deps import get_current_user, require_role, validate_station_access
from app.services.vehicle_check_service import VehicleCheckService
from app.services.audit_service import AuditService
from app.schemas.vehicle_check import (
    VehicleCheckUploadResponse,
    VehicleCheckConfirmRequest,
    VehicleCheckConfirmResponse,
    VehicleCheckManualRequest,
    VehicleCheckSummary,
)

router = APIRouter(prefix="/scans", tags=["Vehicle Scan & Detection"])


@router.post("", response_model=VehicleCheckUploadResponse)
async def upload_scan_media(
    file: UploadFile = File(...),
    station_id: Optional[int] = Form(None),
    request: Request = None,
    current_user: User = Depends(require_role(["OPERATOR", "MANAGER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """
    Stage 1: Upload a video or photo to run plate detection, OCR, and multi-frame voting.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file uploaded.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds maximum size limit (50 MB).")

    ip = request.client.host if request and request.client else None
    return await VehicleCheckService.analyze_upload(
        db=db,
        file_bytes=content,
        filename=file.filename,
        content_type=file.content_type or "",
        user=current_user,
        station_id=station_id,
        ip_address=ip,
    )


@router.post("/{scan_id}/confirm", response_model=VehicleCheckConfirmResponse)
async def confirm_plate_scan(
    scan_id: str,
    payload: VehicleCheckConfirmRequest,
    request: Request = None,
    current_user: User = Depends(require_role(["OPERATOR", "MANAGER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """
    Stage 2: Confirm or edit plate and get final hydrotest compliance result.
    """
    if not payload.confirmed_plate.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Confirmed plate is required.")

    ip = request.client.host if request and request.client else None
    return await VehicleCheckService.confirm_plate(
        db=db,
        scan_id=scan_id,
        confirmed_plate=payload.confirmed_plate,
        user=current_user,
        ip_address=ip,
    )


@router.post("/manual", response_model=VehicleCheckConfirmResponse)
async def manual_plate_check(
    payload: VehicleCheckManualRequest,
    request: Request = None,
    current_user: User = Depends(require_role(["OPERATOR", "MANAGER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """
    Direct plate check bypassing upload.
    """
    if not payload.plate.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Plate number is required.")

    ip = request.client.host if request and request.client else None
    return await VehicleCheckService.manual_check(
        db=db,
        plate=payload.plate,
        user=current_user,
        station_id=payload.station_id,
        ip_address=ip,
    )


@router.get("", response_model=List[VehicleCheckSummary])
def get_scan_history(
    result_filter: Optional[str] = None,
    station_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns scan history scoped by role and assigned branch:
    - Operator: own scans only
    - Manager: scans from assigned branches
    - Auditor & Admin: all branches
    """
    query = db.query(VehicleCheck)

    if current_user.role == "OPERATOR":
        query = query.filter(VehicleCheck.user_id == current_user.id)
    elif current_user.role == "MANAGER":
        branch_ids = [s.id for s in current_user.stations]
        query = query.filter(VehicleCheck.station_id.in_(branch_ids))
    # Admin and Auditor see all branches

    if result_filter:
        query = query.filter(VehicleCheck.final_result == result_filter.upper())
    if station_id:
        query = query.filter(VehicleCheck.station_id == station_id)

    checks = query.order_by(VehicleCheck.created_at.desc()).offset(offset).limit(limit).all()

    summaries = []
    for c in checks:
        summaries.append(
            VehicleCheckSummary(
                id=c.id,
                user_id=c.user_id,
                user_name=c.user.full_name if c.user else None,
                station_id=c.station_id,
                station_name=c.station.name if c.station else None,
                input_type=c.input_type,
                detected_plate=c.detected_plate,
                confirmed_plate=c.confirmed_plate,
                plate_edited=c.plate_edited,
                final_result=c.final_result,
                created_at=c.created_at,
                confirmed_at=c.confirmed_at,
            )
        )
    return summaries


@router.get("/{scan_id}")
def get_scan_detail(
    scan_id: str,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns single scan detail verifying branch scoping.
    """
    check = db.query(VehicleCheck).filter(VehicleCheck.id == scan_id).first()
    if not check:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")

    # Branch scoping check
    if current_user.role == "OPERATOR" and check.user_id != current_user.id:
        ip = request.client.host if request and request.client else None
        AuditService.log(
            db, action="FORBIDDEN_SCAN_ACCESS", user_id=current_user.id, target_type="SCAN", target_id=scan_id, outcome="REJECTED", ip_address=ip
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own scans.")

    if current_user.role == "MANAGER" and check.station_id:
        branch_ids = [s.id for s in current_user.stations]
        if check.station_id not in branch_ids:
            ip = request.client.host if request and request.client else None
            AuditService.log(
                db, action="FORBIDDEN_BRANCH_SCAN_ACCESS", user_id=current_user.id, target_type="SCAN", target_id=scan_id, outcome="REJECTED", ip_address=ip
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to scans from outside your assigned branch.")

    return {
        "scan_id": check.id,
        "input_type": check.input_type,
        "detected_plate": check.detected_plate,
        "plate_confidence": check.plate_confidence,
        "confirmed_plate": check.confirmed_plate,
        "plate_edited": check.plate_edited,
        "final_result": check.final_result,
        "fuel_type": check.fuel_type,
        "asset_id": check.asset_id,
        "best_frame_url": f"/api/scans/{check.id}/frame",
        "created_at": check.created_at,
        "confirmed_at": check.confirmed_at,
    }


@router.get("/{scan_id}/frame")
def get_scan_frame(
    scan_id: str,
    db: Session = Depends(get_db),
):
    """
    Serves the private boxed best frame image.
    """
    check = db.query(VehicleCheck).filter(VehicleCheck.id == scan_id).first()
    if not check or not check.best_frame_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frame not found.")

    path = Path(check.best_frame_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frame file missing on server.")

    return FileResponse(path, media_type="image/jpeg")
