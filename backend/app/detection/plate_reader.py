from typing import Tuple, List, Dict, Any, Optional
import cv2
import numpy as np
import re

from app.detection.plate_normalizer import IndianPlateNormalizer, NOISE_WORDS

# Global EasyOCR reader instance loaded lazily on demand
_easyocr_reader = None


def get_ocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            # Initialize with English, CPU mode
            _easyocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        except Exception as e:
            print(f"[PlateReader] Warning: EasyOCR reader initialization failed: {e}")
            _easyocr_reader = None
    return _easyocr_reader


class PlateReader:
    """
    Preprocesses license plate crops and performs OCR extraction:
    - Smart token filtering: filters out HSRP country badge (IND/INDIA) and web/UI noise.
    - Multi-line reconstruction: seamlessly stitches Row 1 (State+District) and Row 2 (Series+Digits).
    - Intelligent bounding box calculation enclosing the full plate number.
    - Grayscale conversion, dynamic resizing, CLAHE contrast enhancement, and gamma correction.
    """

    @staticmethod
    def adjust_gamma(image: np.ndarray, gamma: float = 1.2) -> np.ndarray:
        """Applies gamma correction to brighten dark/night footage."""
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
        return cv2.LUT(image, table)

    @classmethod
    def preprocess_crop(cls, plate_crop: np.ndarray) -> np.ndarray:
        """Applies grayscale, resizing, CLAHE, and adaptive thresholding."""
        if plate_crop is None or plate_crop.size == 0:
            return plate_crop

        # 1. Grayscale
        if len(plate_crop.shape) == 3:
            gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
        else:
            gray = plate_crop.copy()

        # 2. Check brightness: if average pixel intensity < 90, apply gamma correction (night clip)
        avg_intensity = np.mean(gray)
        if avg_intensity < 90:
            gray = cls.adjust_gamma(gray, gamma=1.6)

        # 3. Resize small crops to fixed height (at least 100px) for clear OCR character separation
        h, w = gray.shape[:2]
        if h < 100:
            scale = 100.0 / max(h, 1)
            new_w = int(w * scale)
            gray = cv2.resize(gray, (new_w, 100), interpolation=cv2.INTER_CUBIC)

        # 4. Contrast enhancement using CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        return enhanced

    @classmethod
    def smart_extract_plates(
        cls,
        image: np.ndarray,
        offset_x: int = 0,
        offset_y: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Runs OCR on image, filters out noise/IND badges, and forms valid multi-line Indian plate candidates.
        
        Returns:
            List of dicts:
            [
                {
                    "plate": "UP27AD1432",
                    "confidence": 0.88,
                    "box": [x1, y1, x2, y2],
                    "is_valid": True,
                    "raw_text": "UP27A D1432"
                }
            ]
        """
        if image is None or image.size == 0:
            return []

        reader = get_ocr_reader()
        if reader is None:
            return []

        try:
            results = reader.readtext(image, detail=1, paragraph=False)
            if not results:
                # Try with CLAHE preprocessed image
                processed = cls.preprocess_crop(image)
                results = reader.readtext(processed, detail=1, paragraph=False)

            if not results:
                return []

            tokens = []
            for item in results:
                bbox, text, prob = item[0], item[1], float(item[2])
                cleaned_tok = IndianPlateNormalizer.clean_text(text)
                if not cleaned_tok or cleaned_tok in NOISE_WORDS:
                    continue

                xs = [p[0] for p in bbox]
                ys = [p[1] for p in bbox]
                x1 = int(min(xs)) + offset_x
                y1 = int(min(ys)) + offset_y
                x2 = int(max(xs)) + offset_x
                y2 = int(max(ys)) + offset_y

                tokens.append({
                    "text": cleaned_tok,
                    "raw": text,
                    "conf": prob,
                    "box": [x1, y1, x2, y2],
                    "y_center": (y1 + y2) / 2.0,
                    "x_center": (x1 + x2) / 2.0,
                })

            tokens.sort(key=lambda t: (t["y_center"], t["x_center"]))

            candidates = []
            seen = set()

            # 1. Single tokens (standard 1-line plate)
            for tok in tokens:
                norm, valid, _ = IndianPlateNormalizer.normalize(tok["text"])
                if valid and norm not in seen:
                    seen.add(norm)
                    candidates.append({
                        "plate": norm,
                        "confidence": tok["conf"],
                        "box": tok["box"],
                        "is_valid": True,
                        "raw_text": tok["raw"],
                    })

            # 2. Pairs (Row 1 + Row 2 multi-line plates)
            for i in range(len(tokens)):
                for j in range(len(tokens)):
                    if i == j:
                        continue
                    t1, t2 = tokens[i], tokens[j]
                    comb = t1["text"] + t2["text"]
                    norm, valid, _ = IndianPlateNormalizer.normalize(comb)
                    if valid and norm not in seen:
                        seen.add(norm)
                        comb_box = [
                            min(t1["box"][0], t2["box"][0]),
                            min(t1["box"][1], t2["box"][1]),
                            max(t1["box"][2], t2["box"][2]),
                            max(t1["box"][3], t2["box"][3]),
                        ]
                        avg_conf = (t1["conf"] + t2["conf"]) / 2.0
                        candidates.append({
                            "plate": norm,
                            "confidence": avg_conf,
                            "box": comb_box,
                            "is_valid": True,
                            "raw_text": f"{t1['raw']} {t2['raw']}",
                        })

            # 3. Triples (e.g. State + District + Series/Number)
            for i in range(len(tokens)):
                for j in range(len(tokens)):
                    for k in range(len(tokens)):
                        if len({i, j, k}) < 3:
                            continue
                        t1, t2, t3 = tokens[i], tokens[j], tokens[k]
                        comb = t1["text"] + t2["text"] + t3["text"]
                        norm, valid, _ = IndianPlateNormalizer.normalize(comb)
                        if valid and norm not in seen:
                            seen.add(norm)
                            comb_box = [
                                min(t1["box"][0], t2["box"][0], t3["box"][0]),
                                min(t1["box"][1], t2["box"][1], t3["box"][1]),
                                max(t1["box"][2], t2["box"][2], t3["box"][2]),
                                max(t1["box"][3], t2["box"][3], t3["box"][3]),
                            ]
                            avg_conf = (t1["conf"] + t2["conf"] + t3["conf"]) / 3.0
                            candidates.append({
                                "plate": norm,
                                "confidence": avg_conf,
                                "box": comb_box,
                                "is_valid": True,
                                "raw_text": f"{t1['raw']} {t2['raw']} {t3['raw']}",
                            })

            # Sort candidates by confidence descending
            candidates.sort(key=lambda x: x["confidence"], reverse=True)
            return candidates

        except Exception as e:
            print(f"[PlateReader] smart_extract_plates error: {e}")
            return []

    @classmethod
    def read_text(cls, plate_crop: np.ndarray) -> Tuple[str, float]:
        """
        Extracts plate text and confidence.
        Prioritizes smart Indian license plate multi-line extraction.
        """
        if plate_crop is None or plate_crop.size == 0:
            return "", 0.0

        smart_cands = cls.smart_extract_plates(plate_crop)
        if smart_cands:
            top = smart_cands[0]
            return top["plate"], top["confidence"]

        # Fallback to standard OCR if smart extractor found no valid syntax
        processed = cls.preprocess_crop(plate_crop)
        reader = get_ocr_reader()
        if reader is None:
            return "", 0.0

        try:
            results = reader.readtext(processed, detail=1, paragraph=False)
            if not results:
                results = reader.readtext(plate_crop, detail=1, paragraph=False)
            if not results:
                return "", 0.0

            def get_bbox_center(item):
                bbox = item[0]
                y_center = (bbox[0][1] + bbox[2][1]) / 2.0
                x_center = (bbox[0][0] + bbox[1][0]) / 2.0
                return (y_center, x_center)

            sorted_results = sorted(results, key=get_bbox_center)
            texts = [r[1].strip() for r in sorted_results if r[1].strip() and r[1].strip() not in NOISE_WORDS]
            confs = [r[2] for r in sorted_results if r[1].strip() and r[1].strip() not in NOISE_WORDS]

            combined_text = " ".join(texts)
            avg_conf = float(np.mean(confs)) if confs else 0.0
            return combined_text, avg_conf

        except Exception as e:
            print(f"[PlateReader] OCR fallback error: {e}")
            return "", 0.0
