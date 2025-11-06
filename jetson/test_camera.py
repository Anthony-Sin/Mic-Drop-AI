import cv2

pipeline = "nvarguscamerasrc ! video/x-raw(memory:NVMM), width=1280, height=720, framerate=30/1 ! nvvidconv ! video/x-raw, format=BGRx ! videoconvert ! video/x-raw, format=BGR ! appsink"

print("Opening camera...")
cap = cv2.VideoCapture(pipeline, cv2.CAP_GSTREAMER)

if not cap.isOpened():
    print("ERROR: Could not open camera")
    exit(1)

print("Camera opened successfully")
print("Capturing frame...")

ret, frame = cap.read()

if ret and frame is not None:
    print(f"SUCCESS! Frame captured: {frame.shape}")
    cv2.imwrite("debug_frame.jpg", frame)
    print("Saved to debug_frame.jpg")
else:
    print("Failed to capture frame")

cap.release()
