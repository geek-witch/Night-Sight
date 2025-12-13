# YOLO Object Detection Implementation

## Overview
This implementation provides a complete YOLO-based object detection system with training and evaluation capabilities for both raw and enhanced images.

## Features

### 1. **YOLO Detection Service** (`services/yoloDetection.ts`)
- Model loading and initialization
- Image preprocessing for YOLO input (640x640 standard size)
- Object detection inference
- Non-Maximum Suppression (NMS) for filtering overlapping boxes
- Visualization of detection boxes on canvas

### 2. **Metrics Calculation** (`services/metricsCalculation.ts`)
- **Accuracy**: Overall correctness of detections
- **Precision**: True positives / (True positives + False positives)
- **Recall**: True positives / (True positives + False negatives)
- **F1 Score**: Harmonic mean of precision and recall
- **mAP (mean Average Precision)**: Average precision across all classes
- **mAP@0.5**: mAP at IoU threshold 0.5
- **mAP@0.75**: mAP at IoU threshold 0.75
- **Per-class metrics**: Individual metrics for each detected class

### 3. **Model Training & Evaluation** (`services/modelTraining.ts`)
- Training on both raw and enhanced images
- Evaluation on test datasets
- Comparison metrics between raw and enhanced image performance
- Synthetic ground truth generation (for demo purposes)

### 4. **UI Component** (`components/StepObjectDetection.tsx`)
- Real-time detection visualization
- Toggle between raw and enhanced image views
- Comprehensive metrics display
- Per-class performance breakdown
- Enhancement improvement comparison

## Usage

### Running Detection
```typescript
import { yoloDetector } from './services/yoloDetection';

// Load model
await yoloDetector.loadModel();

// Run detection
const result = await yoloDetector.detect(imageUrl);
console.log(`Found ${result.boxes.length} objects`);
```

### Calculating Metrics
```typescript
import { calculateMetrics } from './services/metricsCalculation';

const metrics = calculateMetrics(predictions, groundTruth, 0.5);
console.log(`mAP: ${metrics.mAP}`);
```

### Training & Evaluation
```typescript
import { trainModel, evaluateOnBothImageTypes } from './services/modelTraining';

// Train model
const trainingResults = await trainModel(dataset, 10);

// Evaluate on both image types
const evaluation = await evaluateOnBothImageTypes(rawImageUrl, enhancedImageUrl);
```

## Metrics Explained

### Accuracy
Overall percentage of correct detections (TP / Total)

### Precision
Measures how many of the detected objects are actually correct:
- High precision = Few false positives
- Formula: TP / (TP + FP)

### Recall
Measures how many of the actual objects were detected:
- High recall = Few false negatives
- Formula: TP / (TP + FN)

### mAP (mean Average Precision)
Average of Average Precision (AP) across all classes:
- AP is calculated using 11-point interpolation
- mAP@0.5: mAP at IoU threshold 0.5
- mAP@0.75: mAP at IoU threshold 0.75 (stricter)

### IoU (Intersection over Union)
Measures overlap between predicted and ground truth boxes:
- IoU = Intersection Area / Union Area
- Used to determine if a detection is a true positive (typically IoU > 0.5)

## Integration with Real YOLO Models

To integrate with actual YOLO models:

1. **Convert YOLO model to TensorFlow.js or ONNX.js format**
   ```bash
   # Example: Convert YOLOv8 to TensorFlow.js
   pip install ultralytics
   python -c "from ultralytics import YOLO; model = YOLO('yolov8n.pt'); model.export(format='tfjs')"
   ```

2. **Update `yoloDetection.ts`**:
   ```typescript
   async loadModel(): Promise<void> {
     this.model = await tf.loadLayersModel('/models/yolov8n.json');
     this.model.loaded = true;
   }
   
   async detect(imageUrl: string): Promise<DetectionResult> {
     const preprocessed = this.preprocessImage(imageData);
     const predictions = await this.model.predict(preprocessed);
     // Process predictions to extract bounding boxes
     return this.parseYOLOOutput(predictions);
   }
   ```

3. **Use labeled datasets** for ground truth instead of synthetic data

## Current Implementation

The current implementation uses a **simulated YOLO model** for demonstration purposes. It:
- Generates realistic detection boxes based on image characteristics
- Calculates actual metrics using proper formulas
- Provides complete UI for visualization and analysis
- Supports training/evaluation workflows

To use with real models, replace the simulation functions with actual model inference.

## File Structure

```
services/
  ├── yoloDetection.ts      # YOLO model and detection logic
  ├── metricsCalculation.ts  # Metrics calculation (accuracy, precision, recall, mAP)
  └── modelTraining.ts      # Training and evaluation workflows

components/
  └── StepObjectDetection.tsx  # UI component for detection visualization

types.ts                      # TypeScript interfaces for detection data
```



