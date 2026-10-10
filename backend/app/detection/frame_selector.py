from typing import List, Dict, Any, Optional, Tuple


class FrameSelector:
    """
    Groups identical normalized plates across multiple video frames
    and ranks them by frequency weighted by OCR confidence.
    Filters out transient single-frame OCR noise.
    """

    @staticmethod
    def select_best_candidates(
        frame_detections: List[Dict[str, Any]],
        max_candidates: int = 3
    ) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Input: list of detections, each with:
            {
                "plate": "GJ01AB1234",
                "confidence": 0.85,
                "frame_index": 12,
                "timestamp": 4.0,
                "frame_img": np.ndarray (or None),
                "box": [x1, y1, x2, y2],
                "sharpness": 120.5
            }

        Returns:
            (top_candidates, best_detection)
            top_candidates: [{"plate": str, "confidence": float, "frames": int}, ...]
            best_detection: detection dict with the highest score / sharpness
        """
        if not frame_detections:
            return [], None

        # Group by plate
        grouped: Dict[str, Dict[str, Any]] = {}

        for det in frame_detections:
            plate = det.get("plate")
            if not plate:
                continue

            conf = float(det.get("confidence", 0.0))
            sharpness = float(det.get("sharpness", 0.0))

            if plate not in grouped:
                grouped[plate] = {
                    "plate": plate,
                    "count": 0,
                    "total_conf": 0.0,
                    "max_conf": 0.0,
                    "best_det": det,
                }

            grouped[plate]["count"] += 1
            grouped[plate]["total_conf"] += conf

            # Track best frame for this plate based on combined conf and sharpness
            current_best = grouped[plate]["best_det"]
            current_score = current_best.get("confidence", 0) * 0.7 + (current_best.get("sharpness", 0) / 1000.0) * 0.3
            new_score = conf * 0.7 + (sharpness / 1000.0) * 0.3

            if new_score > current_score:
                grouped[plate]["best_det"] = det

        if not grouped:
            return [], None

        # Calculate weighted confidence score:
        # Score combines average confidence and frame frequency bonus
        results = []
        for plate, data in grouped.items():
            count = data["count"]
            avg_conf = data["total_conf"] / count
            # Frequency weighting: bonus for repeated occurrences across frames
            # min(count / 5.0, 1.0) provides up to 10% confidence boost
            weighted_conf = min(avg_conf * (1.0 + 0.05 * min(count - 1, 4)), 0.99)

            results.append({
                "plate": plate,
                "confidence": round(weighted_conf, 2),
                "frames": count,
                "best_det": data["best_det"],
            })

        # Sort by (frequency * confidence) descending
        results.sort(key=lambda x: (x["frames"] * 2 + x["confidence"]), reverse=True)

        top_candidates = [
            {
                "plate": r["plate"],
                "confidence": r["confidence"],
                "frames": r["frames"],
            }
            for r in results[:max_candidates]
        ]

        best_detection = results[0]["best_det"] if results else None
        return top_candidates, best_detection
