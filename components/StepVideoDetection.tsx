import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { DetectionResult } from '../types';
import { detectInVideo, detectInVideoStream, getWebcamStream, VideoDetectionResult } from '../services/videoDetection';
import { exportAnnotatedImage } from '../services/exportService';

export const StepVideoDetection: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [mode, setMode] = useState<'file' | 'webcam' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState<number | null>(null);
  const [currentDetection, setCurrentDetection] = useState<DetectionResult | null>(null);
  const [results, setResults] = useState<VideoDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMode('file');
    setProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const result = await detectInVideo(file, {
        frameRate: 1, // 1 FPS
        maxFrames: 30,
        onProgress: (p) => setProgress(p),
        onFrameDetected: (frame, detection) => {
          setCurrentFrame(frame);
          setCurrentDetection(detection);
        }
      });

      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleWebcamStart = async () => {
    try {
      const stream = await getWebcamStream();
      setMode('webcam');
      setProcessing(true);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const stop = await detectInVideoStream(stream, {
        frameRate: 1,
        onFrameDetected: (frame, detection) => {
          setCurrentFrame(frame);
          setCurrentDetection(detection);
          drawDetections(detection);
        },
        onProgress: (frame) => {
          setProgress(frame);
        }
      });

      stopStreamRef.current = stop;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access webcam');
      setProcessing(false);
    }
  };

  const handleStop = () => {
    if (stopStreamRef.current) {
      stopStreamRef.current();
      stopStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setProcessing(false);
    setMode(null);
  };

  const drawDetections = (detection: DetectionResult) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    detection.boxes.forEach(box => {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      const label = `${box.class} ${(box.confidence * 100).toFixed(1)}%`;
      ctx.font = '12px monospace';
      const metrics = ctx.measureText(label);

      ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
      ctx.fillRect(box.x, box.y - 20, metrics.width + 8, 20);

      ctx.fillStyle = '#000';
      ctx.fillText(label, box.x + 4, box.y - 6);
    });
  };

  return (
    <div className="w-full animate-fadeIn pb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold font-mono text-white">
          <span className="text-vision-500 mr-2">VIDEO DETECTION:</span>
          REAL-TIME OBJECT DETECTION
        </h2>
        <Button variant="secondary" onClick={onBack} className="text-xs">
          Back
        </Button>
      </div>

      {!mode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-night-800 rounded-lg border border-night-700 p-6">
            <h3 className="text-vision-500 font-mono text-lg mb-4">File Detection</h3>
            <p className="text-gray-400 text-sm mb-4">
              Upload a video file to detect objects frame by frame
            </p>
            <label className="block">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="primary" className="w-full">
                Select Video File
              </Button>
            </label>
          </div>

          <div className="bg-night-800 rounded-lg border border-night-700 p-6">
            <h3 className="text-vision-500 font-mono text-lg mb-4">Webcam Detection</h3>
            <p className="text-gray-400 text-sm mb-4">
              Use your webcam for real-time object detection
            </p>
            <Button variant="primary" onClick={handleWebcamStart} className="w-full">
              Start Webcam
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
          <p className="text-red-400 font-mono text-sm">{error}</p>
        </div>
      )}

      {processing && (
        <div className="bg-night-800 rounded-lg border border-night-700 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-vision-500 font-mono text-sm">Processing...</span>
            <span className="text-vision-500 font-mono text-sm">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-night-900 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-vision-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {currentFrame !== null && (
            <p className="text-gray-400 text-xs mt-2 font-mono">
              Frame: {currentFrame} | Detections: {currentDetection?.boxes.length || 0}
            </p>
          )}
        </div>
      )}

      {mode === 'webcam' && (
        <div className="bg-night-800 rounded-lg border border-night-700 p-4 mb-4">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[60vh] object-contain bg-black rounded"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={handleStop}>
              Stop Detection
            </Button>
            {currentDetection && (
              <Button
                variant="primary"
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const dataUrl = canvas.toDataURL('image/png');
                    exportAnnotatedImage(dataUrl, currentDetection, 'webcam_detection.png');
                  }
                }}
              >
                Export Frame
              </Button>
            )}
          </div>
        </div>
      )}

      {results && (
        <div className="bg-night-800 rounded-lg border border-night-700 p-6">
          <h3 className="text-vision-500 font-mono text-lg mb-4">Detection Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-night-900 p-3 rounded border border-night-700">
              <div className="text-gray-400 text-xs mb-1">Total Frames</div>
              <div className="text-white font-mono text-xl">{results.totalFrames}</div>
            </div>
            <div className="bg-night-900 p-3 rounded border border-night-700">
              <div className="text-gray-400 text-xs mb-1">Processed</div>
              <div className="text-white font-mono text-xl">{results.processedFrames}</div>
            </div>
            <div className="bg-night-900 p-3 rounded border border-night-700">
              <div className="text-gray-400 text-xs mb-1">Avg Time</div>
              <div className="text-white font-mono text-xl">
                {results.averageProcessingTime.toFixed(0)}ms
              </div>
            </div>
            <div className="bg-night-900 p-3 rounded border border-night-700">
              <div className="text-gray-400 text-xs mb-1">Total Time</div>
              <div className="text-white font-mono text-xl">
                {(results.totalProcessingTime / 1000).toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

