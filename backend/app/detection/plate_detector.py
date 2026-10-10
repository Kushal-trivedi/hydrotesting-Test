from typing import List, Dict, Any, Optional
import cv2
import numpy as np

# Lazy global model holder
_vehicle_model = None


def get_detector_model():
    global _vehicle_model
    if _vehicle_model is None:
        try:
            from ultralytics import YOLO
            # Load nano model for fast inference on CPU
            _vehicle_model = YOLO("yolov8n.pt")
        except Exception as e:
            print(f"[PlateDetector] Notice: Ultralytics YOLO model init: {e}")
            _vehicle_model = None
    return _vehicle_model


class PlateDetector:
    """
    Two-stage plate detector:
    Stage 1: Detect vehicle regions (motorcycle, car, bus, truck) in frame.
    Stage 2: Detect plate candidate regions (vehicle crop, full frame, and high-contrast rectangles).
    """

    # COCO class IDs for vehicles: 2: car, 3: motorcycle, 5: bus, 7: truck
    VEHICLE_CLASS_IDS = {2, 3, 5, 7}

    @classmethod
    def detect_plates(
        cls,
        frame: np.ndarray,
        min_confidence: float = 0.4
    ) -> List[Dict[str, Any]]:
        """
        Detects vehicle and plate regions in a single frame.
        Always includes the frame itself to support direct camera/phone plate captures.
        
        Returns list of detections:
            [
                {
                    "plate_box": [x1, y1, x2, y2],
                    "confidence": float,
                    "plate_crop": np.ndarray,
                    "vehicle_box": [vx1, vy1, vx2, vy2]
                }
            ]
        """
        if frame is None or frame.size == 0:
            return []

        h, w = frame.shape[:2]
        detections = []
        model = get_detector_model()

        if model is not None:
            try:
                # Run YOLO inference on frame
                results = model(frame, verbose=False, conf=min_confidence)
                for res in results:
                    boxes = res.boxes
                    if boxes is None:
                        continue
                    for box in boxes:
                        cls_id = int(box.cls[0].item())
                        conf = float(box.conf[0].item())

                        if cls_id in cls.VEHICLE_CLASS_IDS and conf >= min_confidence:
                            xyxy = box.xyxy[0].cpu().numpy().astype(int)
                            vx1, vy1, vx2, vy2 = max(0, xyxy[0]), max(0, xyxy[1]), min(w, xyxy[2]), min(h, xyxy[3])
                            veh_crop = frame[vy1:vy2, vx1:vx2]

                            # Also include vehicle crop directly
                            detections.append({
                                "plate_box": [vx1, vy1, vx2, vy2],
                                "confidence": conf,
                                "plate_crop": veh_crop,
                                "vehicle_box": [vx1, vy1, vx2, vy2]
                            })

                            # Look for plate rectangular candidates within vehicle crop
                            plate_crops = cls._extract_plate_candidates_from_crop(veh_crop, vx1, vy1)
                            for p_info in plate_crops:
                                p_info["vehicle_box"] = [vx1, vy1, vx2, vy2]
                                detections.append(p_info)
            except Exception as e:
                print(f"[PlateDetector] YOLO detection exception: {e}")

        # Add contour-based plate candidates from the frame
        fallback_plates = cls._extract_plate_candidates_from_crop(frame, 0, 0)
        detections.extend(fallback_plates)

        # Always include the frame itself as a primary candidate region
        detections.append({
            "plate_box": [0, 0, w, h],
            "confidence": 0.50,
            "plate_crop": frame,
            "vehicle_box": [0, 0, w, h]
        })

        return detections

    @classmethod
    def _extract_plate_candidates_from_crop(
        cls,
        crop: np.ndarray,
        offset_x: int,
        offset_y: int
    ) -> List[Dict[str, Any]]:
        """
        Extracts candidate rectangular plate areas using morphological operations,
        aspect ratio filtering, and contour bounds.
        Filters out tiny badges (like IND) by enforcing minimum dimensions.
        """
        if crop is None or crop.size == 0:
            return []

        h, w = crop.shape[:2]
        if h < 30 or w < 60:
            return []

        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
        # Morphological blackhat
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 7))
        blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)

        # Sobel gradient
        grad_x = cv2.Sobel(blackhat, ddepth=cv2.CV_32F, dx=1, dy=0, ksize=-1)
        grad_x = np.absolute(grad_x)
        min_v, max_v = np.min(grad_x), np.max(grad_x)
        if max_v > min_v:
            grad_x = (255 * ((grad_x - min_v) / (max_v - min_v))).astype("uint8")
        else:
            grad_x = grad_x.astype("uint8")

        # Blur and threshold
        grad_x = cv2.GaussianBlur(grad_x, (5, 5), 0)
        _, thresh = cv2.threshold(grad_x, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

        # Close gaps
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidates = []
        for c in contours:
            x, y, cw, ch = cv2.boundingRect(c)
            aspect_ratio = cw / float(max(ch, 1))

            # License plate aspect ratio: typically 1.4 to 5.5
            # Minimum width 80px and height 30px to avoid picking small 'IND' badge
            if 1.4 <= aspect_ratio <= 5.5 and cw >= 80 and ch >= 30:
                mx = int(cw * 0.08)
                my = int(ch * 0.08)
                px1 = max(0, x - mx)
                py1 = max(0, y - my)
                px2 = min(w, x + cw + mx)
                py2 = min(h, y + ch + my)

                plate_crop = crop[py1:py2, px1:px2]
                candidates.append({
                    "plate_box": [offset_x + px1, offset_y + py1, offset_x + px2, offset_y + py2],
                    "confidence": 0.75,
                    "plate_crop": plate_crop
                })

        candidates.sort(key=lambda item: item["plate_crop"].shape[0] * item["plate_crop"].shape[1], reverse=True)
        return candidates[:3]
