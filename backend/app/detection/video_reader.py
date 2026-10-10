from pathlib import Path
from typing import List, Tuple, Union
import cv2
import numpy as np


class VideoReader:
    """
    Extracts frames from video files:
    - Preserves native portrait aspect ratio and video orientation metadata.
    - Samples ~3 frames per second up to 60 seconds.
    - Calculates sharpness using Laplacian variance and drops excessively blurry frames.
    - Never downscales low-resolution inputs.
    """

    @staticmethod
    def calculate_sharpness(frame: np.ndarray) -> float:
        """Computes variance of Laplacian on grayscale image."""
        if frame is None or frame.size == 0:
            return 0.0
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    @classmethod
    def read_video_frames(
        cls,
        video_path: Union[str, Path],
        target_fps: float = 3.0,
        max_duration_seconds: float = 60.0,
        min_sharpness_threshold: float = 15.0
    ) -> List[Tuple[int, float, np.ndarray, float]]:
        """
        Extracts sampled sharp frames from a video file.
        
        Returns list of tuples:
            (frame_index, timestamp_seconds, frame_image, sharpness_score)
        """
        path_str = str(video_path)
        cap = cv2.VideoCapture(path_str)

        if not cap.isOpened():
            return []

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        frame_interval = max(int(round(fps / target_fps)), 1)
        max_frames = int(fps * max_duration_seconds)

        # Check orientation rotation metadata if available
        # OpenCV on Windows automatically applies rotation in modern builds,
        # but we check CAP_PROP_ORIENTATION_META when available.
        rotation = cap.get(cv2.CAP_PROP_ORIENTATION_META) if hasattr(cv2, "CAP_PROP_ORIENTATION_META") else 0

        frames_data = []
        current_frame = 0

        while cap.isOpened() and current_frame < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if current_frame % frame_interval == 0:
                timestamp = round(current_frame / fps, 2)

                # Correct rotation if metadata specifies orientation
                if rotation == 90:
                    frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
                elif rotation == 180:
                    frame = cv2.rotate(frame, cv2.ROTATE_180)
                elif rotation == 270:
                    frame = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)

                sharpness = cls.calculate_sharpness(frame)

                # Keep if above minimum sharpness or if we don't have enough frames yet
                if sharpness >= min_sharpness_threshold or len(frames_data) < 3:
                    frames_data.append((current_frame, timestamp, frame, sharpness))

            current_frame += 1

        cap.release()
        return frames_data

    @classmethod
    def read_image_file(cls, image_path: Union[str, Path]) -> List[Tuple[int, float, np.ndarray, float]]:
        """Reads a single image file as a single-frame input."""
        path_str = str(image_path)
        img = cv2.imread(path_str)
        if img is None:
            return []
        sharpness = cls.calculate_sharpness(img)
        return [(0, 0.0, img, sharpness)]
