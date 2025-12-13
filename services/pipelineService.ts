/**
 * Complete Pipeline Service
 * 
 * Orchestrates the full pipeline:
 * Input → Enhancement → Feature Extraction → Deep Learning (YOLO) → Output
 * 
 * Compares performance with and without enhancement
 */

import { ProcessedImage, DetectionResult, EvaluationMetrics } from '../types';
import { ComprehensiveFeatureResult } from './featureExtraction';
import * as ImageUtils from './imageUtils';
import { extractComprehensiveFeatures } from './featureExtraction';
import { yoloDetector } from './yoloDetection';
import { evaluateOnBothImageTypes, ModelEvaluation } from './modelTraining';
import { calculateMetrics } from './metricsCalculation';

export interface PipelineResult {
  // Raw image pipeline
  raw: {
    imageUrl: string;
    features: ComprehensiveFeatureResult | null;
    detection: DetectionResult;
    metrics: EvaluationMetrics;
    processingTime: number;
  };
  // Enhanced image pipeline
  enhanced: {
    imageUrl: string;
    enhancedImage: ProcessedImage;
    features: ComprehensiveFeatureResult | null;
    detection: DetectionResult;
    metrics: EvaluationMetrics;
    processingTime: number;
  };
  // Comparison
  comparison: {
    featureImprovement: {
      keypoints: number; // percentage
      texture: number;
      quality: number;
    };
    detectionImprovement: {
      accuracy: number;
      precision: number;
      recall: number;
      mAP: number;
      detectionCount: number;
    };
    overallImprovement: number; // weighted average
    totalProcessingTime: {
      raw: number;
      enhanced: number;
      overhead: number; // enhancement overhead
    };
  };
  timestamp: number;
}

export interface PipelineProgress {
  stage: 'enhancement' | 'feature_extraction' | 'detection' | 'comparison' | 'complete';
  progress: number; // 0-100
  message: string;
  currentImage: 'raw' | 'enhanced' | null;
}

/**
 * Run complete pipeline on image
 */
export async function runPipeline(
  rawImageUrl: string,
  onProgress?: (progress: PipelineProgress) => void
): Promise<PipelineResult> {
  const startTime = performance.now();
  const result: Partial<PipelineResult> = {
    raw: {} as any,
    enhanced: {} as any,
    comparison: {} as any,
    timestamp: Date.now()
  };

  // Stage 1: Enhancement
  if (onProgress) {
    onProgress({
      stage: 'enhancement',
      progress: 10,
      message: 'Enhancing image...',
      currentImage: null
    });
  }

  await ImageUtils.waitForOpenCV();
  const rawImg = await ImageUtils.loadImage(rawImageUrl);
  const enhancedUrl = ImageUtils.applyCompositeEnhancement(rawImg);
  
  const enhancedImage: ProcessedImage = {
    id: 'pipeline-enhanced',
    label: 'Full Enhancement',
    description: 'LAB CLAHE + Gamma',
    dataUrl: enhancedUrl
  };

  // Stage 2: Feature Extraction - Raw Image
  if (onProgress) {
    onProgress({
      stage: 'feature_extraction',
      progress: 30,
      message: 'Extracting features from raw image...',
      currentImage: 'raw'
    });
  }

  const rawFeaturesStart = performance.now();
  const rawFeatures = await extractComprehensiveFeatures(rawImageUrl, 'Raw Image');
  const rawFeaturesTime = performance.now() - rawFeaturesStart;

  // Stage 3: Feature Extraction - Enhanced Image
  if (onProgress) {
    onProgress({
      stage: 'feature_extraction',
      progress: 50,
      message: 'Extracting features from enhanced image...',
      currentImage: 'enhanced'
    });
  }

  const enhancedFeaturesStart = performance.now();
  const enhancedFeatures = await extractComprehensiveFeatures(enhancedUrl, 'Enhanced Image');
  const enhancedFeaturesTime = performance.now() - enhancedFeaturesStart;

  // Stage 4: YOLO Detection - Raw Image
  if (onProgress) {
    onProgress({
      stage: 'detection',
      progress: 60,
      message: 'Running YOLO detection on raw image...',
      currentImage: 'raw'
    });
  }

  await yoloDetector.loadModel();
  const rawDetectionStart = performance.now();
  const rawDetection = await yoloDetector.detect(rawImageUrl);
  const rawDetectionTime = performance.now() - rawDetectionStart;

  // Stage 5: YOLO Detection - Enhanced Image
  if (onProgress) {
    onProgress({
      stage: 'detection',
      progress: 80,
      message: 'Running YOLO detection on enhanced image...',
      currentImage: 'enhanced'
    });
  }

  const enhancedDetectionStart = performance.now();
  const enhancedDetection = await yoloDetector.detect(enhancedUrl);
  const enhancedDetectionTime = performance.now() - enhancedDetectionStart;

  // Stage 6: Calculate Metrics and Comparison
  if (onProgress) {
    onProgress({
      stage: 'comparison',
      progress: 90,
      message: 'Calculating metrics and comparison...',
      currentImage: null
    });
  }

  // Generate synthetic ground truth for metrics
  const { generateSyntheticGroundTruth } = await import('./metricsCalculation');
  const rawGroundTruth = generateSyntheticGroundTruth(
    rawDetection.imageWidth,
    rawDetection.imageHeight
  );
  const enhancedGroundTruth = generateSyntheticGroundTruth(
    enhancedDetection.imageWidth,
    enhancedDetection.imageHeight
  );

  const rawMetrics = calculateMetrics(rawDetection.boxes, rawGroundTruth);
  const enhancedMetrics = calculateMetrics(enhancedDetection.boxes, enhancedGroundTruth);

  // Calculate feature improvements
  const featureImprovement = calculateFeatureImprovement(rawFeatures, enhancedFeatures);

  // Calculate detection improvements
  const detectionImprovement = {
    accuracy: enhancedMetrics.accuracy - rawMetrics.accuracy,
    precision: enhancedMetrics.precision - rawMetrics.precision,
    recall: enhancedMetrics.recall - rawMetrics.recall,
    mAP: enhancedMetrics.mAP - rawMetrics.mAP,
    detectionCount: enhancedDetection.boxes.length - rawDetection.boxes.length
  };

  // Calculate overall improvement (weighted average)
  const overallImprovement = (
    featureImprovement.keypoints * 0.3 +
    featureImprovement.texture * 0.2 +
    featureImprovement.quality * 0.2 +
    detectionImprovement.mAP * 0.3
  );

  const totalTime = performance.now() - startTime;
  const enhancementTime = enhancedFeaturesTime - rawFeaturesTime; // Approximation

  // Build result
  result.raw = {
    imageUrl: rawImageUrl,
    features: rawFeatures,
    detection: rawDetection,
    metrics: rawMetrics,
    processingTime: rawFeaturesTime + rawDetectionTime
  };

  result.enhanced = {
    imageUrl: enhancedUrl,
    enhancedImage,
    features: enhancedFeatures,
    detection: enhancedDetection,
    metrics: enhancedMetrics,
    processingTime: enhancedFeaturesTime + enhancedDetectionTime
  };

  result.comparison = {
    featureImprovement,
    detectionImprovement,
    overallImprovement,
    totalProcessingTime: {
      raw: result.raw.processingTime,
      enhanced: result.enhanced.processingTime,
      overhead: enhancementTime
    }
  };

  if (onProgress) {
    onProgress({
      stage: 'complete',
      progress: 100,
      message: 'Pipeline complete!',
      currentImage: null
    });
  }

  return result as PipelineResult;
}

/**
 * Calculate feature improvement between raw and enhanced
 */
function calculateFeatureImprovement(
  raw: ComprehensiveFeatureResult | null,
  enhanced: ComprehensiveFeatureResult | null
): { keypoints: number; texture: number; quality: number } {
  if (!raw || !enhanced) {
    return { keypoints: 0, texture: 0, quality: 0 };
  }

  // Keypoint improvement
  const rawKeypoints = raw.keypoints.enhanced.orb + raw.keypoints.enhanced.fast + raw.keypoints.enhanced.sift;
  const enhancedKeypoints = enhanced.keypoints.enhanced.orb + enhanced.keypoints.enhanced.fast + enhanced.keypoints.enhanced.sift;
  const keypointImprovement = rawKeypoints > 0 
    ? ((enhancedKeypoints - rawKeypoints) / rawKeypoints) * 100 
    : 0;

  // Texture improvement (using HOG descriptor similarity)
  const rawTexture = raw.texture.enhanced.hog.descriptor.reduce((a, b) => a + b, 0);
  const enhancedTexture = enhanced.texture.enhanced.hog.descriptor.reduce((a, b) => a + b, 0);
  const textureImprovement = rawTexture > 0 
    ? ((enhancedTexture - rawTexture) / rawTexture) * 100 
    : 0;

  // Quality improvement (brightness + contrast + sharpness)
  const rawQuality = raw.quality.enhanced.brightness + raw.quality.enhanced.contrast + raw.quality.enhanced.sharpness;
  const enhancedQuality = enhanced.quality.enhanced.brightness + enhanced.quality.enhanced.contrast + enhanced.quality.enhanced.sharpness;
  const qualityImprovement = rawQuality > 0 
    ? ((enhancedQuality - rawQuality) / rawQuality) * 100 
    : 0;

  return {
    keypoints: keypointImprovement,
    texture: textureImprovement,
    quality: qualityImprovement
  };
}

/**
 * Run pipeline on multiple images for batch comparison
 */
export async function runBatchPipeline(
  imageUrls: string[],
  onProgress?: (progress: PipelineProgress & { currentImageIndex: number; totalImages: number }) => void
): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    if (onProgress) {
      onProgress({
        stage: 'enhancement',
        progress: (i / imageUrls.length) * 100,
        message: `Processing image ${i + 1} of ${imageUrls.length}...`,
        currentImage: null,
        currentImageIndex: i,
        totalImages: imageUrls.length
      });
    }

    const result = await runPipeline(imageUrls[i], (progress) => {
      if (onProgress) {
        onProgress({
          ...progress,
          currentImageIndex: i,
          totalImages: imageUrls.length
        });
      }
    });

    results.push(result);
  }

  return results;
}

