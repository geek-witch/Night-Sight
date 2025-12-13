/**
 * Real Object Detection Service using COCO-SSD
 * 
 * Uses TensorFlow.js COCO-SSD model for real object detection
 * Optimized for low-light/night vision images
 */

import { BoundingBox, DetectionResult } from '../types';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

// Class ID mapping for COCO classes
const CLASS_ID_MAP: { [key: string]: number } = {
  'person': 0,
  'bicycle': 1,
  'car': 2,
  'motorcycle': 3,
  'bus': 5,
  'truck': 7,
  'cat': 15,
  'dog': 16
};

class ObjectDetector {
  private model: cocoSsd.ObjectDetection | null = null;
  private isLoading: boolean = false;
  private readonly confidenceThreshold = 0.10; // Very low for low-light
  private readonly nmsThreshold = 0.3; // IoU threshold for NMS
  private readonly maxBoxAreaRatio = 0.50; // Allow larger boxes

  /**
   * Initialize COCO-SSD model
   */
  async loadModel(): Promise<void> {
    if (this.model) {
      console.log('Model already loaded');
      return;
    }

    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;
    
    try {
      console.log('Loading COCO-SSD model...');
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2'
      });
      console.log('✅ COCO-SSD model loaded successfully!');
    } catch (error) {
      console.error('Failed to load COCO-SSD model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Pre-process image for better detection in low-light
   * Temporarily brightens the image for the AI model
   */
  private preprocessForDetection(img: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    
    // Draw original image
    ctx.drawImage(img, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply brightness and contrast boost for detection
    const brightness = 40; // Add brightness
    const contrast = 1.4;  // Increase contrast
    const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128 + brightness));
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128 + brightness));
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128 + brightness));
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Apply Non-Maximum Suppression to filter overlapping boxes
   */
  private applyNMS(boxes: BoundingBox[]): BoundingBox[] {
    if (boxes.length === 0) return [];
    
    // Sort by confidence (highest first)
    const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
    const selected: BoundingBox[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < sorted.length; i++) {
      if (used.has(i)) continue;
      
      selected.push(sorted[i]);
      
      // Suppress overlapping boxes of the same class
      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(j)) continue;
        if (sorted[i].class !== sorted[j].class) continue;
        
        const iou = this.calculateIoU(sorted[i], sorted[j]);
        if (iou > this.nmsThreshold) {
          used.add(j);
        }
      }
    }
    
    return selected;
  }

  /**
   * Calculate Intersection over Union between two boxes
   */
  private calculateIoU(box1: BoundingBox, box2: BoundingBox): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    
    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;
    
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Run object detection on an image
   */
  async detect(imageUrl: string): Promise<DetectionResult> {
    if (!this.model) {
      await this.loadModel();
    }

    if (!this.model) {
      throw new Error('Failed to load detection model');
    }

    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = async () => {
        try {
          const imageArea = img.width * img.height;
          const maxBoxArea = imageArea * this.maxBoxAreaRatio;
          
          // Pre-process image for better low-light detection
          const processedCanvas = this.preprocessForDetection(img);
          
          // Run detection on the brightened image (lower threshold = more detections)
          const predictions = await this.model!.detect(processedCanvas, 50, 0.08);
          
          // Log raw detections
          console.log('🔍 Raw detections:', predictions.map(p => ({
            class: p.class,
            score: (p.score * 100).toFixed(1) + '%',
            size: `${Math.round(p.bbox[2])}x${Math.round(p.bbox[3])}`
          })));
          
          // Convert and filter predictions
          let boxes: BoundingBox[] = predictions
            .filter(pred => {
              const boxArea = pred.bbox[2] * pred.bbox[3];
              const isValidSize = boxArea < maxBoxArea && boxArea > 100; // Min 100px area
              const isValidConfidence = pred.score >= this.confidenceThreshold;
              return isValidSize && isValidConfidence;
            })
            .map(pred => ({
              x: pred.bbox[0],
              y: pred.bbox[1],
              width: pred.bbox[2],
              height: pred.bbox[3],
              confidence: pred.score,
              class: pred.class,
              classId: CLASS_ID_MAP[pred.class] ?? -1
            }));

          // Apply NMS to remove duplicates
          boxes = this.applyNMS(boxes);
          
          const processingTime = performance.now() - startTime;
          
          console.log(`🎯 Final: ${boxes.length} objects detected in ${processingTime.toFixed(0)}ms`);
          
          resolve({
            boxes,
            imageWidth: img.width,
            imageHeight: img.height,
            processingTime,
            modelVersion: 'COCO-SSD (MobileNet v2)'
          });
        } catch (error) {
          console.error('Detection error:', error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        console.error('Failed to load image:', error);
        resolve({
          boxes: [],
          imageWidth: 0,
          imageHeight: 0,
          processingTime: performance.now() - startTime,
          modelVersion: 'COCO-SSD (MobileNet v2)'
        });
      };
      
      img.src = imageUrl;
    });
  }

  /**
   * Draw detection boxes on canvas
   */
  drawDetections(
    canvas: HTMLCanvasElement,
    detections: DetectionResult,
    showLabels: boolean = true
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Color palette for different classes
    const classColors: { [key: string]: string } = {
      'person': '#22c55e',    // Green
      'car': '#3b82f6',       // Blue  
      'truck': '#8b5cf6',     // Purple
      'bus': '#f59e0b',       // Amber
      'motorcycle': '#ec4899', // Pink
      'bicycle': '#14b8a6',   // Teal
      'cat': '#f97316',       // Orange
      'dog': '#ef4444',       // Red
      'traffic light': '#fbbf24',
      'stop sign': '#dc2626',
    };
    
    detections.boxes.forEach((box) => {
      const color = classColors[box.class] || '#22c55e';
      
      // Draw bounding box with thicker line
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Add slight fill for visibility
      ctx.fillStyle = color + '20'; // 20 = ~12% opacity
      ctx.fillRect(box.x, box.y, box.width, box.height);
      
      if (showLabels) {
        const label = `${box.class} ${(box.confidence * 100).toFixed(1)}%`;
        ctx.font = 'bold 14px monospace';
        const metrics = ctx.measureText(label);
        const labelHeight = 22;
        const padding = 6;
        
        // Label background
        ctx.fillStyle = color;
        ctx.fillRect(
          box.x - 1,
          box.y - labelHeight - 2,
          metrics.width + padding * 2,
          labelHeight
        );
        
        // Label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, box.x + padding - 1, box.y - 8);
      }
    });
  }

  isModelLoaded(): boolean {
    return this.model !== null;
  }
}

// Export singleton instance
export const yoloDetector = new ObjectDetector();
