import cv2
import mediapipe as mp
import time

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

print("Opening camera...")
pipeline = (
    "nvarguscamerasrc ! "
    "video/x-raw(memory:NVMM), width=640, height=480, framerate=60/1 ! "
    "nvvidconv ! "
    "video/x-raw, format=BGRx ! "
    "videoconvert ! "
    "video/x-raw, format=BGR ! "
    "appsink drop=1 max-buffers=2"
)

cap = cv2.VideoCapture(pipeline, cv2.CAP_GSTREAMER)

if not cap.isOpened():
    print("ERROR: Camera won't open!")
    exit(1)

print("Camera opened! Press 'q' to quit")

# Use model_complexity=0 for fastest speed
pose = mp_pose.Pose(
    model_complexity=0,  # 0=lite, 1=full, 2=heavy
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

fps_start = time.time()
fps_counter = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Convert to RGB for MediaPipe
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb_frame)
    
    # Draw landmarks
    if results.pose_landmarks:
        mp_drawing.draw_landmarks(
            frame,
            results.pose_landmarks,
            mp_pose.POSE_CONNECTIONS
        )
    
    # Calculate FPS
    fps_counter += 1
    if fps_counter % 30 == 0:
        fps = 30 / (time.time() - fps_start)
        cv2.putText(frame, f'FPS: {fps:.1f}', (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        print(f"FPS: {fps:.1f}")
        fps_start = time.time()
    
    cv2.imshow('MediaPipe Pose', frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
