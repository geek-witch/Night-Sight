/**
 * Video Detection Service
 * 
 * Handles object detection on video streams and files
 */

import { DetectionResult, BoundingBox } from '../types';
import { yoloDetector } from './yoloDetection';

export interface VideoDetectionConfig {
  frameRate?: number; // FPS for processing (default: 1 - process every second)
  maxFrames?: number; // Maximum frames to process
  onFrameDetected?: (frame: number, detection: DetectionResult) => void;
  onProgress?: (progress: number) => void;
  onComplete?: (results: VideoDetectionResult) => void;
}

export interface VideoDetectionResult {
  totalFrames: number;
  processedFrames: number;
  detections: Map<number, DetectionResult>; // Frame number -> Detection
  averageProcessingTime: number;
  totalProcessingTime: number;
}

/**
 * Detect objects in video file
 */
export async function detectInVideo(
  videoFile: File,
  config: VideoDetectionConfig = {}
): Promise<VideoDetectionResult> {
  const {
    frameRate = 1, // Process 1 frame per second
    maxFrames,
    onFrameDetected,
    onProgress,
    onComplete
  } = config;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const detections = new Map<number, DetectionResult>();
    let frameCount = 0;
    let processedCount = 0;
    const processingTimes: number[] = [];

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const fps = 30; // Assume 30 FPS (can be extracted from video)
      const totalFrames = Math.floor(duration * fps);
      const frameInterval = Math.floor(fps / frameRate);
      const framesToProcess = maxFrames 
        ? Math.min(maxFrames, Math.floor(totalFrames / frameInterval))
        : Math.floor(totalFrames / frameInterval);

      // Load YOLO model
      await yoloDetector.loadModel();

      // Process frames
      for (let i = 0; i < framesToProcess; i++) {
        const targetFrame = i * frameInterval;
        const targetTime = targetFrame / fps;

        // Seek to frame
        video.currentTime = targetTime;
        
        await new Promise(r => {
          video.onseeked = () => {
            // Capture frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              r(undefined);
              return;
            }

            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg');

            // Run detection
            const startTime = performance.now();
            yoloDetector.detect(imageData).then(detection => {
              const processingTime = performance.now() - startTime;
              processingTimes.push(processingTime);

              detections.set(targetFrame, detection);
              processedCount++;

              if (onFrameDetected) {
                onFrameDetected(targetFrame, detection);
              }

              if (onProgress) {
                onProgress((processedCount / framesToProcess) * 100);
              }

              r(undefined);
            }).catch(err => {
              console.error('Detection failed for frame', targetFrame, err);
              r(undefined);
            });
          };
        });
      }

      const totalProcessingTime = processingTimes.reduce((a, b) => a + b, 0);
      const averageProcessingTime = totalProcessingTime / processingTimes.length;

      const result: VideoDetectionResult = {
        totalFrames: framesToProcess,
        processedFrames: processedCount,
        detections,
        averageProcessingTime,
        totalProcessingTime
      };

      if (onComplete) {
        onComplete(result);
      }

      resolve(result);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Detect objects in video stream (webcam)
 */
export async function detectInVideoStream(
  stream: MediaStream,
  config: VideoDetectionConfig = {}
): Promise<() => void> {
  const {
    frameRate = 1,
    onFrameDetected,
    onProgress
  } = config;

  const video = document.createElement('video');
  video.srcObject = stream;
  video.play();

  await new Promise((resolve) => {
    video.onloadedmetadata = () => resolve(undefined);
  });

  await yoloDetector.loadModel();

  let frameCount = 0;
  let lastProcessTime = 0;
  const interval = 1000 / frameRate; // milliseconds

  const processFrame = async () => {
    const now = performance.now();
    if (now - lastProcessTime < interval) {
      requestAnimationFrame(processFrame);
      return;
    }

    lastProcessTime = now;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      requestAnimationFrame(processFrame);
      return;
    }

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg');

    try {
      const detection = await yoloDetector.detect(imageData);
      frameCount++;

      if (onFrameDetected) {
        onFrameDetected(frameCount, detection);
      }

      if (onProgress) {
        onProgress(frameCount);
      }
    } catch (error) {
      console.error('Detection failed:', error);
    }

    requestAnimationFrame(processFrame);
  };

  processFrame();

  // Return stop function
  return () => {
    video.pause();
    stream.getTracks().forEach(track => track.stop());
  };
}

/**
 * Get webcam stream
 */
export async function getWebcamStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'environment'
    }
  });
}

/**
 * Create video from detections
 */
export async function createAnnotatedVideo(
  videoFile: File,
  detections: Map<number, DetectionResult>,
  outputFilename: string = 'annotated_video.webm'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;

    video.onloadedmetadata = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const stream = canvas.captureStream(30); // 30 FPS
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputFilename;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      };

      recorder.start();

      // Process video frame by frame
      const fps = 30;
      const duration = video.duration;
      const totalFrames = Math.floor(duration * fps);

      for (let frame = 0; frame < totalFrames; frame++) {
        const time = frame / fps;
        video.currentTime = time;

        await new Promise(r => {
          video.onseeked = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0);

            // Draw detections for this frame
            const detection = detections.get(frame);
            if (detection) {
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
            }

            r(undefined);
          };
        });
      }

      recorder.stop();
    };

    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(videoFile);
  });
}

