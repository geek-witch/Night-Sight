/**
 * YOLO Model Loader Service
 * 
 * Handles loading YOLO models from various sources:
 * - TensorFlow.js models
 * - ONNX.js models
 * - Custom model formats
 */

declare global {
  interface Window {
    tf: any;
  }
}

export type ModelSource = 'tfjs' | 'onnx' | 'custom' | 'simulated';

export interface ModelConfig {
  source: ModelSource;
  path?: string;
  version?: string;
  inputSize?: number;
  numClasses?: number;
}

/**
 * Load TensorFlow.js model
 */
async function loadTFJSModel(path: string): Promise<any> {
  if (!window.tf) {
    // Dynamically load TensorFlow.js
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js';
      script.onload = () => {
        console.log('TensorFlow.js loaded');
        resolve(undefined);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  if (!window.tf) {
    throw new Error('TensorFlow.js failed to load');
  }

  try {
    const model = await window.tf.loadLayersModel(path);
    return model;
  } catch (error) {
    console.error('Failed to load TF.js model:', error);
    throw error;
  }
}

/**
 * Load ONNX model
 */
async function loadONNXModel(path: string): Promise<any> {
  // ONNX.js would be loaded similarly
  // For now, return a placeholder
  throw new Error('ONNX.js support coming soon');
}

/**
 * Load YOLO model based on configuration
 */
export async function loadYOLOModel(config: ModelConfig): Promise<any> {
  switch (config.source) {
    case 'tfjs':
      if (!config.path) {
        throw new Error('Model path required for TensorFlow.js models');
      }
      return await loadTFJSModel(config.path);
    
    case 'onnx':
      if (!config.path) {
        throw new Error('Model path required for ONNX models');
      }
      return await loadONNXModel(config.path);
    
    case 'simulated':
      // Return simulated model
      return {
        type: 'simulated',
        version: config.version || 'YOLOv8n',
        loaded: true
      };
    
    default:
      throw new Error(`Unsupported model source: ${config.source}`);
  }
}

/**
 * Get default model configuration
 */
export function getDefaultModelConfig(): ModelConfig {
  return {
    // Stay on simulator by default (no external model files required)
    source: 'simulated',
    path: undefined,
    version: 'YOLOv8n',
    inputSize: 640,
    numClasses: 80 // COCO dataset classes
  };
}

/**
 * Check if TensorFlow.js is available
 */
export function isTensorFlowAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.tf;
}

