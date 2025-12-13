/**
 * Export Service
 * 
 * Handles exporting detection results in various formats
 */

import { DetectionResult, BoundingBox, ModelEvaluation } from '../types';

export type ExportFormat = 'json' | 'csv' | 'coco' | 'yolo' | 'image' | 'all';

/**
 * Export detection results to JSON
 */
export function exportToJSON(
  detection: DetectionResult,
  filename: string = 'detections.json'
): void {
  const data = {
    modelVersion: detection.modelVersion,
    imageWidth: detection.imageWidth,
    imageHeight: detection.imageHeight,
    processingTime: detection.processingTime,
    detections: detection.boxes.map(box => ({
      class: box.class,
      classId: box.classId,
      confidence: box.confidence,
      bbox: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      }
    })),
    timestamp: new Date().toISOString()
  };

  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
}

/**
 * Export detection results to CSV
 */
export function exportToCSV(
  detection: DetectionResult,
  filename: string = 'detections.csv'
): void {
  const headers = ['Class', 'Class ID', 'Confidence', 'X', 'Y', 'Width', 'Height'];
  const rows = detection.boxes.map(box => [
    box.class,
    box.classId.toString(),
    box.confidence.toFixed(4),
    box.x.toFixed(2),
    box.y.toFixed(2),
    box.width.toFixed(2),
    box.height.toFixed(2)
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export to COCO format
 */
export function exportToCOCO(
  detections: DetectionResult[],
  filename: string = 'detections_coco.json'
): void {
  const coco = {
    info: {
      description: 'NightSight Enhancer Detection Results',
      version: '1.0',
      year: new Date().getFullYear()
    },
    licenses: [],
    images: detections.map((det, idx) => ({
      id: idx + 1,
      width: det.imageWidth,
      height: det.imageHeight,
      file_name: `image_${idx + 1}.jpg`
    })),
    annotations: [] as any[],
    categories: [] as any[]
  };

  const classMap = new Map<string, number>();
  let categoryId = 1;

  detections.forEach((det, imgIdx) => {
    det.boxes.forEach((box, annIdx) => {
      if (!classMap.has(box.class)) {
        classMap.set(box.class, categoryId);
        coco.categories.push({
          id: categoryId,
          name: box.class,
          supercategory: 'object'
        });
        categoryId++;
      }

      coco.annotations.push({
        id: imgIdx * 1000 + annIdx + 1,
        image_id: imgIdx + 1,
        category_id: classMap.get(box.class)!,
        bbox: [box.x, box.y, box.width, box.height],
        area: box.width * box.height,
        iscrowd: 0,
        score: box.confidence
      });
    });
  });

  downloadFile(JSON.stringify(coco, null, 2), filename, 'application/json');
}

/**
 * Export to YOLO format
 */
export function exportToYOLO(
  detection: DetectionResult,
  classes: string[],
  filename: string = 'detections.txt'
): void {
  const lines = detection.boxes.map(box => {
    // YOLO format: class_id center_x center_y width height (normalized)
    const centerX = (box.x + box.width / 2) / detection.imageWidth;
    const centerY = (box.y + box.height / 2) / detection.imageHeight;
    const normWidth = box.width / detection.imageWidth;
    const normHeight = box.height / detection.imageHeight;
    const classId = classes.indexOf(box.class);

    return `${classId} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${normWidth.toFixed(6)} ${normHeight.toFixed(6)}`;
  });

  downloadFile(lines.join('\n'), filename, 'text/plain');
}

/**
 * Export image with annotations
 */
export async function exportAnnotatedImage(
  imageUrl: string,
  detection: DetectionResult,
  filename: string = 'annotated_image.png'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes
      detection.boxes.forEach(box => {
        // Box
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Label background
        const label = `${box.class} ${(box.confidence * 100).toFixed(1)}%`;
        ctx.font = 'bold 14px monospace';
        const metrics = ctx.measureText(label);
        const labelHeight = 20;
        
        ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
        ctx.fillRect(
          box.x,
          box.y - labelHeight,
          metrics.width + 10,
          labelHeight
        );

        // Label text
        ctx.fillStyle = '#000';
        ctx.fillText(label, box.x + 5, box.y - 5);
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'));
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Export evaluation metrics
 */
export function exportEvaluationMetrics(
  evaluation: ModelEvaluation,
  filename: string = 'evaluation_metrics.json'
): void {
  const data = {
    timestamp: new Date().toISOString(),
    totalImages: evaluation.totalImages,
    evaluationTime: evaluation.evaluationTime,
    rawImageMetrics: evaluation.rawImageMetrics,
    enhancedImageMetrics: evaluation.enhancedImageMetrics,
    comparison: evaluation.comparison
  };

  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
}

/**
 * Export all formats
 */
export async function exportAll(
  imageUrl: string,
  detection: DetectionResult,
  classes: string[],
  baseFilename: string = 'detection'
): Promise<void> {
  await Promise.all([
    exportToJSON(detection, `${baseFilename}.json`),
    exportToCSV(detection, `${baseFilename}.csv`),
    exportToYOLO(detection, classes, `${baseFilename}_yolo.txt`),
    exportAnnotatedImage(imageUrl, detection, `${baseFilename}_annotated.png`)
  ]);
}

/**
 * Helper function to download file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

