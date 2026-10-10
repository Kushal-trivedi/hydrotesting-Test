import os
import json
import uuid
from datetime import datetime, timezone, date
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
import cv2
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.vehicle_check import VehicleCheck
from app.models.asset import Asset
from app.models.site import Site
from app.models.user import User
from app.detection.video_reader import VideoReader
from app.detection.plate_detector import PlateDetector
from app.detection.plate_reader import PlateReader
from app.detection.plate_normalizer import IndianPlateNormalizer
from app.detection.frame_selector import FrameSelector
from app.services.vehicle_service import ExternalVehicleService
from app.services.compliance_engine import ComplianceEngine
from app.services.audit_service import AuditService
from app.schemas.vehicle_check import (
    VehicleCheckUploadResponse,
    VehicleCheckConfirmResponse,
    CandidatePlate,
)


class VehicleCheckService:
    @staticmethod
    def generate_scan_id() -> str:
        """Generates standard scan ID in format VC-YYYYMMDD-XXXX."""
        today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        rand_suffix = uuid.uuid4().hex[:4].upper()
        return f"VC-{today_str}-{rand_suffix}"

    @classmethod
    async def analyze_upload(
        cls,
        db: Session,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        user: User,
        station_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> VehicleCheckUploadResponse:
        """
        Stage 1: Process uploaded media, extract plate candidates, and return for operator confirmation.
        """
        scan_id = cls.generate_scan_id()
        is_video = "video" in (content_type or "").lower() or filename.lower().endswith(
            (".mp4", ".mov", ".avi", ".mkv")
        )
        input_type = "VIDEO" if is_video else "IMAGE"

        # Determine station
        assigned_stn_id = station_id
        if not assigned_stn_id and user.stations:
            assigned_stn_id = user.stations[0].id

        # Save uploaded file to private media directory
        ext = Path(filename).suffix or (".mp4" if is_video else ".jpg")
        media_filename = f"{scan_id}_input{ext}"
        media_path = settings.MEDIA_STORAGE_DIR / media_filename
        with open(media_path, "wb") as f:
            f.write(file_bytes)

        # Extract frames
        if is_video:
            frames_data = VideoReader.read_video_frames(media_path, target_fps=3.0, max_duration_seconds=60.0)
        else:
            frames_data = VideoReader.read_image_file(media_path)

        all_detections = []
        best_frame_img = None
        best_box = None

        if frames_data:
            # First frame as fallback
            best_frame_img = frames_data[0][2]

            for frame_idx, timestamp, frame_img, sharpness in frames_data:
                # 1. Direct smart plate extraction on frame (handles full-frame camera/phone captures)
                frame_cands = PlateReader.smart_extract_plates(frame_img, offset_x=0, offset_y=0)
                for cand in frame_cands:
                    if cand.get("is_valid"):
                        all_detections.append({
                            "plate": cand["plate"],
                            "raw_text": cand.get("raw_text", cand["plate"]),
                            "confidence": cand["confidence"],
                            "frame_index": frame_idx,
                            "timestamp": timestamp,
                            "frame_img": frame_img,
                            "box": cand.get("box"),
                            "sharpness": sharpness,
                        })

                # 2. Extract from detected vehicle regions and crops
                plates = PlateDetector.detect_plates(frame_img)
                for p_det in plates:
                    p_box = p_det.get("plate_box", [0, 0, 0, 0])
                    ox, oy = p_box[0], p_box[1]
                    region_cands = PlateReader.smart_extract_plates(p_det["plate_crop"], offset_x=ox, offset_y=oy)
                    for cand in region_cands:
                        if cand.get("is_valid"):
                            all_detections.append({
                                "plate": cand["plate"],
                                "raw_text": cand.get("raw_text", cand["plate"]),
                                "confidence": cand["confidence"],
                                "frame_index": frame_idx,
                                "timestamp": timestamp,
                                "frame_img": frame_img,
                                "box": cand.get("box") or p_box,
                                "sharpness": sharpness,
                            })

            # Graceful fallback: only if no valid plate syntax matched
            if not all_detections and frames_data:
                for frame_idx, timestamp, frame_img, sharpness in frames_data[:2]:
                    raw_text, ocr_conf = PlateReader.read_text(frame_img)
                    if raw_text:
                        norm_plate, is_valid, _ = IndianPlateNormalizer.normalize(raw_text)
                        if norm_plate and is_valid:
                            all_detections.append({
                                "plate": norm_plate,
                                "raw_text": raw_text,
                                "confidence": ocr_conf,
                                "frame_index": frame_idx,
                                "timestamp": timestamp,
                                "frame_img": frame_img,
                                "box": [0, 0, frame_img.shape[1], frame_img.shape[0]],
                                "sharpness": sharpness,
                            })

        # Multi-frame aggregation and voting
        candidates_raw, best_det = FrameSelector.select_best_candidates(all_detections, max_candidates=3)

        if best_det and best_det.get("frame_img") is not None:
            best_frame_img = best_det["frame_img"].copy()
            best_box = best_det.get("box")

        # Save best boxed frame for operator confirmation preview
        best_frame_filename = f"{scan_id}_frame.jpg"
        best_frame_path = settings.MEDIA_STORAGE_DIR / best_frame_filename

        if best_frame_img is not None and best_frame_img.size > 0:
            preview_img = best_frame_img.copy()
            if best_box:
                x1, y1, x2, y2 = best_box
                cv2.rectangle(preview_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.imwrite(str(best_frame_path), preview_img)
        else:
            # Create a simple placeholder image if no valid frame extracted
            placeholder = (np.zeros((480, 640, 3), dtype="uint8") + 40)
            cv2.putText(placeholder, "No plate frame detected", (100, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.imwrite(str(best_frame_path), placeholder)

        # Determine confidence level in words
        top_conf = candidates_raw[0]["confidence"] if candidates_raw else 0.0
        if top_conf >= 0.75:
            conf_level = "HIGH"
        elif top_conf >= 0.40:
            conf_level = "MEDIUM"
        else:
            conf_level = "LOW"

        candidate_objs = [
            CandidatePlate(plate=c["plate"], confidence=c["confidence"], frames=c["frames"])
            for c in candidates_raw
        ]

        # Create database record
        check_record = VehicleCheck(
            id=scan_id,
            user_id=user.id,
            station_id=assigned_stn_id,
            input_type=input_type,
            media_path=str(media_path),
            best_frame_path=str(best_frame_path),
            detected_plate=candidate_objs[0].plate if candidate_objs else None,
            plate_confidence=top_conf if candidate_objs else None,
            candidates=json.dumps([c.model_dump() for c in candidate_objs]),
            final_result="NOT_CONFIRMED",
        )
        db.add(check_record)
        db.commit()

        AuditService.log(
            db,
            action="SCAN_UPLOADED",
            user_id=user.id,
            target_type="SCAN",
            target_id=scan_id,
            outcome="SUCCESS",
            ip_address=ip_address,
            details={"candidates_count": len(candidate_objs), "confidence_level": conf_level},
        )

        return VehicleCheckUploadResponse(
            scan_id=scan_id,
            status="AWAITING_CONFIRMATION",
            confidence_level=conf_level,
            best_frame_url=f"/api/scans/{scan_id}/frame",
            candidates=candidate_objs,
        )

    @classmethod
    async def confirm_plate(
        cls,
        db: Session,
        scan_id: str,
        confirmed_plate: str,
        user: User,
        ip_address: Optional[str] = None,
    ) -> VehicleCheckConfirmResponse:
        """
        Stage 2: Confirm plate, execute VAHAN & compliance lookup, and record verdict.
        """
        check = db.query(VehicleCheck).filter(VehicleCheck.id == scan_id).first()
        if not check:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan record not found.")

        # Normalize confirmed plate
        norm_plate, is_valid, _ = IndianPlateNormalizer.normalize(confirmed_plate)
        if not norm_plate:
            norm_plate = ExternalVehicleService.normalize_plate(confirmed_plate)

        plate_edited = norm_plate != check.detected_plate
        now = datetime.now(timezone.utc)

        # 1. VAHAN lookup
        vahan_resp = await ExternalVehicleService.lookup_vehicle(norm_plate)

        vehicle_data = None
        is_cng = False
        fuel_type = "Unknown"

        if not vahan_resp.success:
            if "temporarily unavailable" in vahan_resp.message.lower() or "did not answer" in vahan_resp.message.lower():
                check.final_result = "LOOKUP_UNAVAILABLE"
                check.confirmed_plate = norm_plate
                check.plate_edited = plate_edited
                check.confirmed_at = now
                db.commit()
                return VehicleCheckConfirmResponse(
                    scan_id=scan_id,
                    plate=norm_plate,
                    plate_edited=plate_edited,
                    vehicle=None,
                    is_cng=False,
                    asset_id=None,
                    compliance_state=None,
                    next_due_date=None,
                    final_result="LOOKUP_UNAVAILABLE",
                    message="Vehicle service did not answer. Retry later; plate is kept.",
                    data_source={"vahan": "unavailable", "hydrotest": "not_checked"},
                    checked_at=now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                )

        if vahan_resp.success and vahan_resp.data:
            details = vahan_resp.data
            fuel_type = details.fuel_type or "Unknown"
            is_cng = details.is_cng
            vehicle_data = {
                "make": details.make,
                "model": details.model,
                "fuel_type": details.fuel_type,
            }

        # 2. Fuel Type Evaluation
        if not is_cng and "CNG" not in (fuel_type or "").upper():
            final_result = "NOT_APPLICABLE"
            message = "Not a CNG vehicle, hydrotest check not needed."
            check.confirmed_plate = norm_plate
            check.plate_edited = plate_edited
            check.fuel_type = fuel_type
            check.vehicle_summary = json.dumps(vehicle_data) if vehicle_data else None
            check.final_result = final_result
            check.data_source = json.dumps({"vahan": "mock", "hydrotest": "internal_register"})
            check.confirmed_at = now
            db.commit()

            AuditService.log(
                db,
                action="SCAN_VERDICT",
                user_id=user.id,
                target_type="SCAN",
                target_id=scan_id,
                outcome="SUCCESS",
                ip_address=ip_address,
                details={"result": final_result, "plate": norm_plate},
            )

            return VehicleCheckConfirmResponse(
                scan_id=scan_id,
                plate=norm_plate,
                plate_edited=plate_edited,
                vehicle=vehicle_data,
                is_cng=False,
                asset_id=None,
                compliance_state="NOT_APPLICABLE",
                next_due_date=None,
                final_result=final_result,
                message=message,
                data_source={"vahan": "mock", "hydrotest": "internal_register"},
                checked_at=now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            )

        # 3. CNG Asset Register Mapping
        assets = db.query(Asset).filter(Asset.vehicle_number == norm_plate).all()

        if not assets:
            final_result = "RECORD_NOT_FOUND"
            message = "No cylinder hydrotest record found for this vehicle. Ask the manager to register the cylinder."
            check.confirmed_plate = norm_plate
            check.plate_edited = plate_edited
            check.fuel_type = fuel_type
            check.vehicle_summary = json.dumps(vehicle_data) if vehicle_data else None
            check.final_result = final_result
            check.data_source = json.dumps({"vahan": "mock", "hydrotest": "internal_register"})
            check.confirmed_at = now
            db.commit()

            AuditService.log(
                db,
                action="SCAN_VERDICT",
                user_id=user.id,
                target_type="SCAN",
                target_id=scan_id,
                outcome="SUCCESS",
                ip_address=ip_address,
                details={"result": final_result, "plate": norm_plate},
            )

            return VehicleCheckConfirmResponse(
                scan_id=scan_id,
                plate=norm_plate,
                plate_edited=plate_edited,
                vehicle=vehicle_data,
                is_cng=True,
                asset_id=None,
                compliance_state="RECORD_NOT_FOUND",
                next_due_date=None,
                final_result=final_result,
                message=message,
                data_source={"vahan": "mock", "hydrotest": "internal_register"},
                checked_at=now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            )

        # 4. Multi-cylinder compliance resolution (Worst state rule: Failed > Overdue > Due Soon > Valid)
        # Priority order: FAILED (4), OVERDUE (3), DUE_SOON (2), VALID (1), PENDING (0)
        PRIORITY = {"FAILED": 4, "OVERDUE": 3, "DUE_SOON": 2, "VALID": 1, "PENDING": 0}

        evaluated_assets = []
        for a in assets:
            latest_test = a.hydrotests[0] if a.hydrotests else None
            res = latest_test.result if latest_test else None
            due = latest_test.next_due_date if latest_test else None
            comp_state, days = ComplianceEngine.calculate_status(res, due)
            evaluated_assets.append({
                "asset": a,
                "state": comp_state,
                "days": days,
                "due_date": due,
                "score": PRIORITY.get(comp_state, 0),
            })

        evaluated_assets.sort(key=lambda x: x["score"], reverse=True)
        chosen = evaluated_assets[0]
        final_state = chosen["state"]
        matched_asset = chosen["asset"]
        next_due_date_str = chosen["due_date"].strftime("%Y-%m-%d") if chosen["due_date"] else None
        days_rem = chosen["days"]

        # Human-readable message
        if final_state == "VALID":
            days_txt = f"{days_rem} days left" if days_rem is not None else ""
            msg = f"Hydrotest valid until {next_due_date_str} ({days_txt})."
        elif final_state == "DUE_SOON":
            msg = f"Hydrotest due in {days_rem} days. Retest required soon."
        elif final_state == "OVERDUE":
            overdue_days = abs(days_rem) if days_rem is not None else 0
            msg = f"Hydrotest test expired {overdue_days} days ago. Inform manager, follow branch policy."
        elif final_state == "FAILED":
            msg = "Last hydrotest failed. Inform manager, do not dispense fuel."
        else:
            msg = "Hydrotest inspection pending."

        check.confirmed_plate = norm_plate
        check.plate_edited = plate_edited
        check.fuel_type = fuel_type
        check.vehicle_summary = json.dumps(vehicle_data) if vehicle_data else None
        check.asset_id = matched_asset.asset_id
        check.final_result = final_state
        check.data_source = json.dumps({"vahan": "mock", "hydrotest": "internal_register"})
        check.confirmed_at = now
        db.commit()

        AuditService.log(
            db,
            action="SCAN_VERDICT",
            user_id=user.id,
            target_type="SCAN",
            target_id=scan_id,
            outcome="SUCCESS",
            ip_address=ip_address,
            details={"result": final_state, "asset_id": matched_asset.asset_id, "plate": norm_plate},
        )

        return VehicleCheckConfirmResponse(
            scan_id=scan_id,
            plate=norm_plate,
            plate_edited=plate_edited,
            vehicle=vehicle_data,
            is_cng=True,
            asset_id=matched_asset.asset_id,
            compliance_state=final_state,
            next_due_date=next_due_date_str,
            final_result=final_state,
            message=msg,
            data_source={"vahan": "mock", "hydrotest": "internal_register"},
            checked_at=now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        )

    @classmethod
    async def manual_check(
        cls,
        db: Session,
        plate: str,
        user: User,
        station_id: Optional[int] = None,
        ip_address: Optional[str] = None,
    ) -> VehicleCheckConfirmResponse:
        """
        Direct manual entry bypassing video detection directly to stage 2 lookup.
        """
        scan_id = cls.generate_scan_id()
        assigned_stn_id = station_id or (user.stations[0].id if user.stations else None)

        norm_plate, _, _ = IndianPlateNormalizer.normalize(plate)
        if not norm_plate:
            norm_plate = ExternalVehicleService.normalize_plate(plate)

        check = VehicleCheck(
            id=scan_id,
            user_id=user.id,
            station_id=assigned_stn_id,
            input_type="MANUAL",
            detected_plate=norm_plate,
            confirmed_plate=norm_plate,
            plate_edited=False,
            final_result="NOT_CONFIRMED",
        )
        db.add(check)
        db.commit()

        return await cls.confirm_plate(db, scan_id, norm_plate, user, ip_address)
