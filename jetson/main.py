# main.py
from camara import CameraStream
from poseTrack import PoseTracker
import cv2


def main():
    camera = CameraStream()
    pose = PoseTracker()

    print("[Main] Starting video stream... Press 'q' to exit.")
    while True:
        frame = camera.get_frame()
        if frame is None:
            print("[Main] No frame received from camera.")
            break

        annotated, poses = pose.detect_pose(frame)
        cv2.imshow("Pose Tracking", annotated)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cv2.destroyAllWindows()
    print("[Main] Exiting...")

if __name__ == "__main__":
    main()

#so  a pop up shoudl po