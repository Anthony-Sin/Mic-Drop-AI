def gstreamer_pipeline(
    sensor_id=0,
    width=1280,
    height=720,
    framerate=30,
    flip_method=0,
):
    return (
        f"nvarguscamerasrc sensor-id={sensor_id} ! "
        f"video/x-raw(memory:NVMM), width={width}, height={height}, framerate={framerate}/1 ! "
        f"nvvidconv flip-method={flip_method} ! "
        f"video/x-raw, format=BGRx ! "
        f"videoconvert ! video/x-raw, format=BGR ! appsink"
    )


import cv2

class CameraStream:
    def __init__(self):
        self.cap = cv2.VideoCapture(
            gstreamer_pipeline(),
            cv2.CAP_GSTREAMER
        )

    def get_frame(self):
        ret, frame = self.cap.read()
        return frame if ret else None