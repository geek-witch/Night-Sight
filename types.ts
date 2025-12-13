export enum AppStep {
  UPLOAD = "UPLOAD",
  PROCESS = "PROCESS",
  FEATURE_EXTRACTION = "FEATURE_EXTRACTION",
  STEP_2 = "STEP_2",
  STEP_3 = "STEP_3",
  PIPELINE = "PIPELINE",
}

export interface ProcessedImage {
  id: string
  label: string
  dataUrl: string
  description: string
}

// NEW: Feature extraction types
export interface FeatureStats {
  orb: number
  fast: number
  sift: number
}

export interface FeatureExtractionResult {
  imageName: string
  lowLight: {
    keypoints: FeatureStats
    brightness: number
    contrast: number
  }
  enhanced: {
    keypoints: FeatureStats
    brightness: number
    contrast: number
  }
  improvements: {
    orbImprovement: number
    fastImprovement: number
    brightnessImprovement: number
    contrastImprovement: number
  }
}

export type ImageFilterType = "gamma" | "hist_eq" | "enhancement"

// YOLO Object Detection Types
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
  confidence: number
  class: string
  classId: number
}

export interface DetectionResult {
  boxes: BoundingBox[]
  imageWidth: number
  imageHeight: number
  processingTime: number
  modelVersion: string
}

export interface EvaluationMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  mAP: number // mean Average Precision
  mAP50: number // mAP at IoU threshold 0.5
  mAP75: number // mAP at IoU threshold 0.75
  perClassMetrics: {
    className: string
    precision: number
    recall: number
    ap: number // Average Precision
  }[]
}

export interface TrainingResult {
  epoch: number
  loss: number
  valLoss: number
  metrics: EvaluationMetrics
  timestamp: number
}

export interface ModelEvaluation {
  rawImageMetrics: EvaluationMetrics
  enhancedImageMetrics: EvaluationMetrics
  comparison: {
    accuracyImprovement: number
    precisionImprovement: number
    recallImprovement: number
    mAPImprovement: number
  }
  totalImages: number
  evaluationTime: number
}

// Pipeline Types
export interface PipelineResult {
  raw: {
    imageUrl: string
    features: any | null
    detection: DetectionResult
    metrics: EvaluationMetrics
    processingTime: number
  }
  enhanced: {
    imageUrl: string
    enhancedImage: ProcessedImage
    features: any | null
    detection: DetectionResult
    metrics: EvaluationMetrics
    processingTime: number
  }
  comparison: {
    featureImprovement: {
      keypoints: number
      texture: number
      quality: number
    }
    detectionImprovement: {
      accuracy: number
      precision: number
      recall: number
      mAP: number
      detectionCount: number
    }
    overallImprovement: number
    totalProcessingTime: {
      raw: number
      enhanced: number
      overhead: number
    }
  }
  timestamp: number
}

export interface SelectedImageGroup {
  original: string
  enhanced: ProcessedImage
}
