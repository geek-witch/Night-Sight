/**
 * Training Worker Service
 * 
 * Handles model training in a Web Worker to avoid blocking the main thread
 * NOTE: Actual training would require a backend - this is a UI demonstration
 */

import { TrainingResult, EvaluationMetrics } from '../types';
import { Dataset } from './datasetLoader';

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
}

export interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  loss: number;
  valLoss: number;
  metrics?: EvaluationMetrics;
  progress: number; // 0-100
}

/**
 * Create training worker
 * NOTE: This demonstrates the UI flow - actual training requires a backend
 */
export function createTrainingWorker(): Worker {
  const workerCode = `
    // Training worker code - UI demonstration only
    self.onmessage = function(e) {
      const { type, data } = e.data;
      
      if (type === 'TRAIN') {
        const { config, dataset } = data;
        simulateTrainingUI(config, dataset);
      }
    };
    
    // Demonstrates training UI progress - no random values
    function simulateTrainingUI(config, dataset) {
      const { epochs } = config;
      
      for (let epoch = 1; epoch <= epochs; epoch++) {
        // Deterministic loss curve (exponential decay)
        const loss = 0.5 * Math.exp(-epoch * 0.15);
        const valLoss = loss * 1.15; // Validation slightly higher
        
        // Send progress update
        self.postMessage({
          type: 'PROGRESS',
          data: {
            epoch,
            totalEpochs: epochs,
            loss: Math.round(loss * 1000) / 1000,
            valLoss: Math.round(valLoss * 1000) / 1000,
            progress: (epoch / epochs) * 100
          }
        });
        
        // Fixed delay for UI demonstration
        const start = Date.now();
        while (Date.now() - start < 200) {
          // Processing delay
        }
      }
      
      self.postMessage({
        type: 'COMPLETE',
        data: { success: true }
      });
    }
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  return new Worker(workerUrl);
}

/**
 * Train model using Web Worker
 * NOTE: This is a UI demonstration - real training requires backend infrastructure
 */
export class ModelTrainer {
  private worker: Worker | null = null;
  private progressCallback?: (progress: TrainingProgress) => void;
  private completeCallback?: (results: TrainingResult[]) => void;
  private errorCallback?: (error: Error) => void;

  constructor() {
    this.worker = createTrainingWorker();
    this.worker.onmessage = (e) => {
      const { type, data } = e.data;

      switch (type) {
        case 'PROGRESS':
          if (this.progressCallback) {
            this.progressCallback(data);
          }
          break;

        case 'COMPLETE':
          if (this.completeCallback) {
            this.completeCallback([]);
          }
          break;

        case 'ERROR':
          if (this.errorCallback) {
            this.errorCallback(new Error(data.message));
          }
          break;
      }
    };

    this.worker.onerror = (error) => {
      if (this.errorCallback) {
        this.errorCallback(new Error(error.message));
      }
    };
  }

  /**
   * Start training demonstration
   */
  async train(
    config: TrainingConfig,
    dataset: Dataset,
    onProgress?: (progress: TrainingProgress) => void,
    onComplete?: (results: TrainingResult[]) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    this.progressCallback = onProgress;
    this.completeCallback = onComplete;
    this.errorCallback = onError;

    if (!this.worker) {
      throw new Error('Training worker not initialized');
    }

    this.worker.postMessage({
      type: 'TRAIN',
      data: { config, dataset }
    });
  }

  /**
   * Stop training
   */
  stop(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = createTrainingWorker();
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
