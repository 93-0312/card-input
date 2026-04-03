// App.tsx

import { useEffect, useRef, useState } from "react";
import "./App.css";
import jsQR from "jsqr";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  const [scannedUrl, setScannedUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(true);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        requestAnimationFrame(scanQRCode);
      }
    } catch (error) {
      setErrorMessage("카메라 접근 권한이 필요합니다.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    cancelAnimationFrame(animationFrameRef.current);
  };

  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

    if (qrCode?.data) {
      setScannedUrl(qrCode.data);
      setIsScanning(false);
      stopCamera();
      window.location.href = qrCode.data;
      return;
    }

    animationFrameRef.current = requestAnimationFrame(scanQRCode);
  };

  return (
    <div className="qr-scanner-wrapper">
      {errorMessage ? (
        <div className="error-message">{errorMessage}</div>
      ) : (
        <>
          {isScanning && (
            <div className="scanner-container">
              <p className="scanner-guide">QR 코드를 카메라에 비춰주세요</p>
              <div className="video-wrapper">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="camera-feed"
                />
                <div className="scan-overlay">
                  <div className="scan-frame" />
                </div>
              </div>
            </div>
          )}
          {scannedUrl && (
            <div className="redirect-message">
              <p>QR 코드 인식 완료!</p>
              <p>이동 중...</p>
            </div>
          )}
        </>
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default App;
