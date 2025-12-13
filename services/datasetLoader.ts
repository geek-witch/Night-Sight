/**
 * Dataset Loader Service
 * 
 * Handles loading custom datasets for training and evaluation
 * Supports various formats: COCO, YOLO, Pascal VOC, custom JSON
 */

import { BoundingBox } from '../types';

export interface DatasetImage {
  id: string;
  url: string;
  width: number;
  height: number;
  annotations: BoundingBox[];
}

export interface Dataset {
  name: string;
  images: DatasetImage[];
  classes: string[];
  format: 'coco' | 'yolo' | 'pascal' | 'custom';
}

/**
 * Load COCO format dataset
 */
export async function loadCOCODataset(file: File): Promise<Dataset> {
  const text = await file.text();
  const data = JSON.parse(text);

  const images: DatasetImage[] = data.images.map((img: any) => {
    const annotations = data.annotations
      .filter((ann: any) => ann.image_id === img.id)
      .map((ann: any) => {
        const bbox = ann.bbox; // [x, y, width, height]
        return {
          x: bbox[0],
          y: bbox[1],
          width: bbox[2],
          height: bbox[3],
          confidence: 1.0,
          class: data.categories.find((c: any) => c.id === ann.category_id)?.name || 'unknown',
          classId: ann.category_id
        } as BoundingBox;
      });

    return {
      id: img.id.toString(),
      url: img.coco_url || img.file_name,
      width: img.width,
      height: img.height,
      annotations
    };
  });

  const classes = data.categories.map((c: any) => c.name);

  return {
    name: file.name,
    images,
    classes,
    format: 'coco'
  };
}

/**
 * Load YOLO format dataset
 */
export async function loadYOLODataset(
  images: File[],
  labels: File[],
  classes: string[]
): Promise<Dataset> {
  const imageMap = new Map<string, File>();
  images.forEach(img => imageMap.set(img.name.replace(/\.[^/.]+$/, ''), img));

  const datasetImages: DatasetImage[] = [];

  for (const labelFile of labels) {
    const baseName = labelFile.name.replace(/\.[^/.]+$/, '');
    const imageFile = imageMap.get(baseName);

    if (!imageFile) continue;

    const labelText = await labelFile.text();
    const annotations = labelText
      .trim()
      .split('\n')
      .map(line => {
        const parts = line.trim().split(' ');
        if (parts.length < 5) return null;

        const classId = parseInt(parts[0]);
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const w = parseFloat(parts[3]);
        const h = parseFloat(parts[4]);

        return {
          classId,
          class: classes[classId] || `class_${classId}`,
          x,
          y,
          width: w,
          height: h,
          confidence: 1.0
        } as BoundingBox;
      })
      .filter((ann): ann is BoundingBox => ann !== null);

    const imageUrl = URL.createObjectURL(imageFile);
    const img = await loadImageDimensions(imageUrl);

    datasetImages.push({
      id: baseName,
      url: imageUrl,
      width: img.width,
      height: img.height,
      annotations
    });
  }

  return {
    name: 'YOLO Dataset',
    images: datasetImages,
    classes,
    format: 'yolo'
  };
}

/**
 * Load custom JSON dataset
 */
export async function loadCustomDataset(file: File): Promise<Dataset> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data.images || !Array.isArray(data.images)) {
    throw new Error('Invalid dataset format: missing images array');
  }

  const images: DatasetImage[] = data.images.map((img: any, index: number) => ({
    id: img.id || img.name || `image_${index}`,
    url: img.url || img.path,
    width: img.width || 640,
    height: img.height || 640,
    annotations: (img.annotations || []).map((ann: any) => ({
      x: ann.x || ann.xmin || 0,
      y: ann.y || ann.ymin || 0,
      width: ann.width || (ann.xmax - ann.xmin) || 0,
      height: ann.height || (ann.ymax - ann.ymin) || 0,
      confidence: ann.confidence || 1.0,
      class: ann.class || ann.className || 'unknown',
      classId: ann.classId || 0
    }))
  }));

  return {
    name: data.name || file.name,
    images,
    classes: data.classes || [],
    format: 'custom'
  };
}

/**
 * Load dataset from file(s)
 */
export async function loadDataset(
  files: File | File[],
  format?: 'coco' | 'yolo' | 'custom'
): Promise<Dataset> {
  if (Array.isArray(files)) {
    // Assume YOLO format with separate image and label files
    const images = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f.name));
    const labels = files.filter(f => /\.txt$/i.test(f.name));
    
    if (images.length > 0 && labels.length > 0) {
      // Try to load classes from classes.txt if present
      const classesFile = files.find(f => f.name === 'classes.txt');
      let classes: string[] = [];
      
      if (classesFile) {
        const classesText = await classesFile.text();
        classes = classesText.trim().split('\n').map(c => c.trim());
      }

      return loadYOLODataset(images, labels, classes);
    }
  }

  const file = Array.isArray(files) ? files[0] : files;
  const fileName = file.name.toLowerCase();

  if (format === 'coco' || fileName.endsWith('.json')) {
    return loadCOCODataset(file);
  }

  if (format === 'custom') {
    return loadCustomDataset(file);
  }

  throw new Error('Unsupported dataset format');
}

/**
 * Load image dimensions
 */
function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Split dataset into train/val/test sets
 */
export function splitDataset(
  dataset: Dataset,
  trainRatio: number = 0.7,
  valRatio: number = 0.15,
  testRatio: number = 0.15
): {
  train: Dataset;
  val: Dataset;
  test: Dataset;
} {
  // Deterministic shuffle based on image ID hash (reproducible splits)
  const shuffled = [...dataset.images].sort((a, b) => {
    const hashA = a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hashB = b.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return hashA - hashB;
  });
  const trainEnd = Math.floor(shuffled.length * trainRatio);
  const valEnd = trainEnd + Math.floor(shuffled.length * valRatio);

  return {
    train: {
      ...dataset,
      images: shuffled.slice(0, trainEnd)
    },
    val: {
      ...dataset,
      images: shuffled.slice(trainEnd, valEnd)
    },
    test: {
      ...dataset,
      images: shuffled.slice(valEnd)
    }
  };
}

/**
 * Export dataset to JSON
 */
export function exportDataset(dataset: Dataset): string {
  return JSON.stringify(dataset, null, 2);
}

