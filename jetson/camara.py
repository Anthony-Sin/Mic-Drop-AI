import cv2

class CameraStream:
    def __init__(self):
        self.cap = cv2.VideoCapture("nvarguscamerasrc ! video/x-raw(memory:NVMM), width=1280, height=720, framerate=30/1 ! nvvidconv ! video/x-raw, format=BGRx ! videoconvert ! appsink", cv2.CAP_GSTREAMER)

    def get_frame(self):
        ret, frame = self.cap.read()
        return frame if ret else None
