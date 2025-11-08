from flask import Flask, jsonify
from flask_cors import CORS
import cv2
import mediapipe as mp
import time
import threading
import Jetson.GPIO as GPIO

app = Flask(__name__)
CORS(app)

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

SERVO_PIN = 33
GPIO.setmode(GPIO.BOARD)
GPIO.setup(SERVO_PIN, GPIO.OUT)
servo = GPIO.PWM(SERVO_PIN, 50)
servo.start(7.5)

current_pose_data = {
    "landmarks": [],
    "timestamp": time.time(),
    "person_detected": False,
    "center_x": 0.5
}

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
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=0,
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.3
)

MINIMAL_CONNECTIONS = frozenset([
    (11, 12), (11, 13), (13, 15),
    (12, 14), (14, 16),
    (11, 23), (12, 24),
    (23, 24), (23, 25), (25, 27),
    (24, 26), (26, 28)
])

def set_servo_angle(angle):
    duty = 2 + (angle / 18)
    servo.ChangeDutyCycle(duty)
    time.sleep(0.3)
    servo.ChangeDutyCycle(0)

def track_person(center_x):
    if center_x < 0.4:
        current_angle = max(0, getattr(track_person, 'angle', 90) - 5)
        track_person.angle = current_angle
        set_servo_angle(current_angle)
    elif center_x > 0.6:
        current_angle = min(180, getattr(track_person, 'angle', 90) + 5)
        track_person.angle = current_angle
        set_servo_angle(current_angle)

track_person.angle = 90

def pose_detection_loop():
    global current_pose_data
    fps_start = time.time()
    fps_counter = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            continue
        
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)
        
        if results.pose_landmarks:
            landmarks = []
            for idx, landmark in enumerate(results.pose_landmarks.landmark):
                landmarks.append({
                    "id": idx,
                    "x": landmark.x,
                    "y": landmark.y,
                    "z": landmark.z,
                    "visibility": landmark.visibility
                })
            
            nose = results.pose_landmarks.landmark[0]
            left_shoulder = results.pose_landmarks.landmark[11]
            right_shoulder = results.pose_landmarks.landmark[12]
            center_x = (nose.x + left_shoulder.x + right_shoulder.x) / 3
            
            current_pose_data = {
                "landmarks": landmarks,
                "timestamp": time.time(),
                "person_detected": True,
                "center_x": center_x
            }
            
            track_person(center_x)
        else:
            current_pose_data = {
                "landmarks": [],
                "timestamp": time.time(),
                "person_detected": False,
                "center_x": 0.5
            }
        
        fps_counter += 1
        if fps_counter % 30 == 0:
            fps = 30 / (time.time() - fps_start)
            print(f"FPS: {fps:.1f}")
            fps_start = time.time()

@app.route('/pose', methods=['GET'])
def get_pose():
    return jsonify(current_pose_data)

@app.route('/servo/<int:angle>', methods=['POST'])
def control_servo(angle):
    if 0 <= angle <= 180:
        set_servo_angle(angle)
        track_person.angle = angle
        return jsonify({"status": "success", "angle": angle})
    return jsonify({"status": "error", "message": "Angle must be 0-180"}), 400

if __name__ == '__main__':
    detection_thread = threading.Thread(target=pose_detection_loop, daemon=True)
    detection_thread.start()
    app.run(host='0.0.0.0', port=80, threaded=True)