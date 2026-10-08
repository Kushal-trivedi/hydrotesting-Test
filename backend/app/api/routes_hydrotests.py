import json
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.asset import Asset
from app.models.hydrotest import HydrotestRecord
from app.models.document import Document
from app.models.audit import AuditLog
from app.schemas.hydrotest import (
    HydrotestCreate, HydrotestUpdate, HydrotestResponse, CertificateVerificationResult
)
from app.services.hydrotest_service import ExternalHydrotestService

router = APIRouter(prefix="/hydrotests", tags=["Hydrotests"])

@router.post("", response_model=HydrotestResponse, status_code=201)
def record_hydrotest(payload: HydrotestCreate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset with ID {payload.asset_id} does not exist.")

    data = payload.model_dump()
    if not data.get("cylinder_number") and asset.cylinder_number:
        data["cylinder_number"] = asset.cylinder_number

    new_test = HydrotestRecord(**data)
    db.add(new_test)
    db.commit()
    db.refresh(new_test)

    # Audit log
    audit = AuditLog(
        entity_type="HYDROTEST",
        entity_id=new_test.id,
        action="CREATE",
        changes=json.dumps({
            "asset_id": asset.asset_id,
            "test_date": str(new_test.test_date),
            "result": new_test.result,
            "certificate_number": new_test.certificate_number
        })
    )
    db.add(audit)
    db.commit()

    return new_test

@router.get("/{hydrotest_id}", response_model=HydrotestResponse)
def get_hydrotest(hydrotest_id: int, db: Session = Depends(get_db)):
    record = db.query(HydrotestRecord).filter(HydrotestRecord.id == hydrotest_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Hydrotest record {hydrotest_id} not found.")
    return record

@router.put("/{hydrotest_id}", response_model=HydrotestResponse)
def update_hydrotest(hydrotest_id: int, payload: HydrotestUpdate, db: Session = Depends(get_db)):
    record = db.query(HydrotestRecord).filter(HydrotestRecord.id == hydrotest_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Hydrotest record {hydrotest_id} not found.")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(record, k, v)

    db.commit()
    db.refresh(record)
    return record

@router.post("/{hydrotest_id}/verify", response_model=CertificateVerificationResult)
def verify_certificate(hydrotest_id: int, db: Session = Depends(get_db)):
    """Verifies hydrotest certificate against authorized external registry."""
    record = db.query(HydrotestRecord).filter(HydrotestRecord.id == hydrotest_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Hydrotest record {hydrotest_id} not found.")

    # Call external verification service
    res = ExternalHydrotestService.verify_certificate(
        certificate_number=record.certificate_number,
        cylinder_number=record.cylinder_number or (record.asset.cylinder_number if record.asset else None),
        test_date=record.test_date,
        result=record.result,
        performed_by=record.performed_by
    )
    res.hydrotest_id = record.id

    # Update database record verification status non-blockingly
    record.verification_status = res.verification_status
    record.verification_payload = json.dumps({
        "authority": res.authority_name,
        "is_match": res.is_match,
        "mismatches": res.mismatches,
        "matched_records": res.matched_records,
        "message": res.message
    })
    db.commit()

    # Audit log
    audit = AuditLog(
        entity_type="HYDROTEST",
        entity_id=record.id,
        action="VERIFICATION",
        changes=json.dumps({"status": res.verification_status, "certificate": record.certificate_number})
    )
    db.add(audit)
    db.commit()

    return res

@router.post("/{hydrotest_id}/upload-document")
async def upload_document(
    hydrotest_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Uploads inspection report / certificate document"""
    record = db.query(HydrotestRecord).filter(HydrotestRecord.id == hydrotest_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Hydrotest record {hydrotest_id} not found.")

    target_dir = settings.DOCUMENT_STORAGE_DIR
    safe_filename = f"hydrotest_{hydrotest_id}_{file.filename}"
    file_path = target_dir / safe_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = file_path.stat().st_size
    doc = Document(
        hydrotest_record_id=hydrotest_id,
        filename=safe_filename,
        original_name=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        file_path=str(file_path)
    )
    db.add(doc)
    record.report_filename = safe_filename
    db.commit()

    return {
        "success": True,
        "document_id": doc.id,
        "filename": safe_filename,
        "original_name": file.filename,
        "size_bytes": file_size
    }

@router.get("/{hydrotest_id}/document")
def get_document(hydrotest_id: int, db: Session = Depends(get_db)):
    """Downloads or views uploaded hydrotest certificate"""
    doc = db.query(Document).filter(Document.hydrotest_record_id == hydrotest_id).order_by(Document.id.desc()).first()
    if not doc:
        # Check if record has a report_filename referencing demo certificate
        rec = db.query(HydrotestRecord).filter(HydrotestRecord.id == hydrotest_id).first()
        if rec and rec.report_filename:
            path = settings.DOCUMENT_STORAGE_DIR / rec.report_filename
            if path.exists():
                return FileResponse(path, filename=rec.report_filename)
        raise HTTPException(status_code=404, detail="No certificate document found for this hydrotest.")

    path = Path(doc.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Certificate document file not found on server disk.")

    return FileResponse(path, media_type=doc.mime_type, filename=doc.original_name)
