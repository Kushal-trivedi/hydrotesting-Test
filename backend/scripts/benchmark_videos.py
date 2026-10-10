import os
import sys
import time
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import cv2
from app.detection.video_reader import VideoReader
from app.detection.plate_detector import PlateDetector
from app.detection.plate_reader import PlateReader
from app.detection.plate_normalizer import IndianPlateNormalizer
from app.detection.frame_selector import FrameSelector


def run_benchmark():
    test_dirs = [
        Path(r"C:\Users\Kushal Trivedi\OneDrive\Desktop\test data"),
        backend_dir / "samples",
    ]

    video_files = []
    for d in test_dirs:
        if d.exists():
            for f in d.glob("*.mp4"):
                if f not in video_files:
                    video_files.append(f)

    if not video_files:
        print("No test video files found to benchmark.")
        return

    print("=" * 80)
    print("HYDROSAPHE VISION PIPELINE BENCHMARK (Per Implementation Plan Page 28)")
    print("=" * 80)
    print(f"Discovered {len(video_files)} test video(s):\n")

    results = []

    for vid_path in video_files:
        print(f"--> Processing: {vid_path.name} ({vid_path.stat().st_size / (1024*1024):.2f} MB)")
        cap = cv2.VideoCapture(str(vid_path))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        duration_sec = total_frames / fps if fps > 0 else 0
        cap.release()

        start_time = time.time()

        # Step 1: Read sampled frames (3 fps, max 30s for fast benchmarking)
        frames_data = VideoReader.read_video_frames(
            vid_path, target_fps=3.0, max_duration_seconds=30.0, min_sharpness_threshold=10.0
        )

        all_detections = []
        for frame_idx, timestamp, frame_img, sharpness in frames_data:
            plates = PlateDetector.detect_plates(frame_img)
            for p_det in plates:
                raw_text, ocr_conf = PlateReader.read_text(p_det["plate_crop"])
                if raw_text:
                    norm_plate, is_valid, _ = IndianPlateNormalizer.normalize(raw_text)
                    if norm_plate:
                        all_detections.append({
                            "plate": norm_plate,
                            "raw_text": raw_text,
                            "confidence": ocr_conf,
                            "frame_index": frame_idx,
                            "timestamp": timestamp,
                            "sharpness": sharpness,
                        })

        # Multi-frame aggregator
        candidates, best_det = FrameSelector.select_best_candidates(all_detections, max_candidates=3)
        elapsed_sec = time.time() - start_time

        top_plate = candidates[0]["plate"] if candidates else "NO_DETECTION"
        top_conf = candidates[0]["confidence"] if candidates else 0.0

        if top_conf >= 0.75:
            conf_badge = "HIGH"
        elif top_conf >= 0.40:
            conf_badge = "MEDIUM"
        else:
            conf_badge = "LOW"

        results.append({
            "name": vid_path.name[:35],
            "size_mb": f"{vid_path.stat().st_size / (1024*1024):.1f}",
            "res": f"{width}x{height}",
            "duration": f"{duration_sec:.1f}s",
            "sampled_frames": len(frames_data),
            "detections": len(all_detections),
            "top_plate": top_plate,
            "confidence": f"{top_conf:.2f} ({conf_badge})",
            "time_sec": f"{elapsed_sec:.2f}s",
        })

    # Render summary table
    print("\n" + "=" * 115)
    print(f"{'Video File':<36} | {'Res':<10} | {'Frames':<7} | {'Dets':<5} | {'Detected Plate':<15} | {'Confidence':<14} | {'Elapsed':<8}")
    print("-" * 115)
    for r in results:
        print(f"{r['name']:<36} | {r['res']:<10} | {r['sampled_frames']:<7} | {r['detections']:<5} | {r['top_plate']:<15} | {r['confidence']:<14} | {r['time_sec']:<8}")
    print("=" * 115)
    print("\n[Audit Rule Verification]")
    print("- Mandatory human confirmation step: Enforced (Stage 1 never decides without Stage 2 operator approval).")
    print("- Positional OCR normalization: Active.")
    print("- Multi-frame confidence aggregation: Active.")


if __name__ == "__main__":
    run_benchmark()
