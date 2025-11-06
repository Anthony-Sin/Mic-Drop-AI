# poseTrack.py
from super_gradients.training import models
import cv2
import torch

class PoseTracker:
    def __init__(self, model_name="yolo_nas_pose_s"):
        print("[PoseTracker] Loading model...")
        self.model = models.get(model_name, pretrained_weights="coco_pose")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        print(f"[PoseTracker] Model loaded on {self.device}")

    def detect_pose(self, frame):
        """
        Runs pose estimation on the given frame.
        Returns a list of detections (keypoints, confidence, bbox).
        """
        results = self.model.predict(frame, conf=0.3)
        annotated = results[0].draw()  # Draws keypoints/skeletons
        poses = results[0].prediction  # Raw keypoints/bboxes
        return annotated, poses
