from ultralytics importsource /home/ant/Downloads/Mic-Drop-AI/jetson/yolo-env/bin/activate
 YOLO
import cv2

print("Loading YOLO model...")
model = YOLO('yolov8n-pose.pt')  # Using nano (smallest/fastest)

print("Opening camera...")
pipeline = (
    "nvarguscamerasrc ! "
    "video/x-raw(memory:NVMM), width=640, height=480, framerate=60/1 ! "  # Lower res, higher FPS
    "nvvidconv ! "
    "video/x-raw, format=BGRx ! "
    "videoconvert ! "
    "video/x-raw, format=BGR ! "
    "appsink drop=1 max-buffers=2"  # Drop old frames
)

cap = cv2.VideoCapture(pipeline, cv2.CAP_GSTREAMER)

if not cap.isOpened():
    print("ERROR: Camera won't open!")
    exit(1)

print("Camera opened! Press 'q' to quit")

# Process every N frames
frame_skip = 2
frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    frame_count += 1
    
    # Only process every Nth frame
    if frame_count % frame_skip == 0:
        results = model(frame, verbose=False, imgsz=320, conf=0.5)  # Smaller input size
        annotated_frame = results[0].plot()
    else:
        annotated_frame = frame  # Show raw frame
    
    cv2.imshow('YOLO Pose', annotated_frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
