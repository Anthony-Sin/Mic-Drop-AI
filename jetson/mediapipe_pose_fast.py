import cv2
import mediapipe as mp
import time

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

print("Opening camera...")
pipeline = (
    "nvarguscamerasrc ! "
    "video/x-raw(memory:NVMM), width=320, height=240, framerate=60/1 ! " 
    "nvvidconv ! "
    "video/x-raw, format=BGRx ! "
    "videoconvert ! "
    "video/x-raw, format=BGR ! "
    "appsink drop=1 max-buffers=1"  
)

cap = cv2.VideoCapture(pipeline, cv2.CAP_GSTREAMER)

if not cap.isOpened():
    print("ERROR: Camera won't open!")
    exit(1)

print("Camera opened! Press 'q' to quit")

pose = mp_pose.Pose(
    static_image_mode=False, 
    model_complexity=0,  
    enable_segmentation=False,  
    min_detection_confidence=0.5,
    min_tracking_confidence=0.3  
)

fps_start = time.time()
fps_counter = 0

MINIMAL_CONNECTIONS = frozenset([
    (11, 12), (11, 13), (13, 15),  
    (12, 14), (14, 16),  
    (11, 23), (12, 24),  
    (23, 24), (23, 25), (25, 27),  
    (24, 26), (26, 28) 
])

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb_frame)
    
    if results.pose_landmarks:
        mp_drawing.draw_landmarks(
            frame,
            results.pose_landmarks,
            MINIMAL_CONNECTIONS,
            landmark_drawing_spec=None,  
            connection_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
        )
    
    fps_counter += 1
    if fps_counter % 30 == 0:
        fps = 30 / (time.time() - fps_start)
        print(f"FPS: {fps:.1f}")
        fps_start = time.time()
    
    small_frame = cv2.resize(frame, (640, 480))
    cv2.imshow('Pose', small_frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
