import React, { useState } from 'react';
import { Button } from './Button';
import { loadDataset, splitDataset, Dataset } from '../services/datasetLoader';
import { ModelTrainer, TrainingConfig, TrainingProgress } from '../services/trainingWorker';
import { TrainingResult } from '../types';

export const StepDatasetTraining: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [trainingResults, setTrainingResults] = useState<TrainingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const trainerRef = React.useRef<ModelTrainer | null>(null);

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const loadedDataset = await loadDataset(files);
      setDataset(loadedDataset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTraining = async () => {
    if (!dataset) return;

    const config: TrainingConfig = {
      epochs: 10,
      batchSize: 16,
      learningRate: 0.001,
      validationSplit: 0.2
    };

    const splits = splitDataset(dataset, 0.7, 0.15, 0.15);
    const trainDataset = splits.train;

    setTraining(true);
    setTrainingResults([]);
    setError(null);

    if (!trainerRef.current) {
      trainerRef.current = new ModelTrainer();
    }

    await trainerRef.current.train(
      config,
      trainDataset,
      (progress) => {
        setTrainingProgress(progress);
      },
      (results) => {
        setTrainingResults(results);
        setTraining(false);
      },
      (err) => {
        setError(err.message);
        setTraining(false);
      }
    );
  };

  const handleStopTraining = () => {
    if (trainerRef.current) {
      trainerRef.current.stop();
      setTraining(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (trainerRef.current) {
        trainerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="w-full animate-fadeIn pb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold font-mono text-white">
          <span className="text-vision-500 mr-2">MODEL TRAINING:</span>
          DATASET LOADING & TRAINING
        </h2>
        <Button variant="secondary" onClick={onBack} className="text-xs">
          Back
        </Button>
      </div>

      {/* Dataset Loading */}
      <div className="bg-night-800 rounded-lg border border-night-700 p-6 mb-4">
        <h3 className="text-vision-500 font-mono text-lg mb-4">Load Dataset</h3>
        <p className="text-gray-400 text-sm mb-4">
          Supported formats: COCO JSON, YOLO (images + labels), Custom JSON
        </p>
        <label className="block">
          <input
            type="file"
            multiple
            onChange={handleFileLoad}
            className="hidden"
            accept=".json,.txt,.jpg,.jpeg,.png"
          />
          <Button variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Loading...' : 'Select Dataset Files'}
          </Button>
        </label>

        {dataset && (
          <div className="mt-4 bg-night-900 p-4 rounded border border-night-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-gray-400 text-xs mb-1">Dataset Name</div>
                <div className="text-white font-mono">{dataset.name}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Images</div>
                <div className="text-white font-mono">{dataset.images.length}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Classes</div>
                <div className="text-white font-mono">{dataset.classes.length}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Format</div>
                <div className="text-white font-mono uppercase">{dataset.format}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
          <p className="text-red-400 font-mono text-sm">{error}</p>
        </div>
      )}

      {/* Training Section */}
      {dataset && (
        <div className="bg-night-800 rounded-lg border border-night-700 p-6 mb-4">
          <h3 className="text-vision-500 font-mono text-lg mb-4">Training Configuration</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-night-900 p-3 rounded border border-night-700">
              <div className="text-gray-400 text-xs mb-1">Epochs</div>
              <div className="text-white font-mono">10</div>
            </div>
            <div className="bg-night-900 p-3 rounded border border-night-700">
              <div className="text-gray-400 text-xs mb-1">Batch Size</div>
              <div className="text-white font-mono">16</div>
            </div>
            <div className="bg-night-900 p-3 rounded border border-night-700">
              <div className="text-gray-400 text-xs mb-1">Learning Rate</div>
              <div className="text-white font-mono">0.001</div>
            </div>
            <div className="bg-night-900 p-3 rounded border border-night-700">
              <div className="text-gray-400 text-xs mb-1">Val Split</div>
              <div className="text-white font-mono">20%</div>
            </div>
          </div>

          <div className="flex gap-2">
            {!training ? (
              <Button variant="primary" onClick={handleStartTraining}>
                Start Training
              </Button>
            ) : (
              <Button variant="secondary" onClick={handleStopTraining}>
                Stop Training
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Training Progress */}
      {training && trainingProgress && (
        <div className="bg-night-800 rounded-lg border border-night-700 p-6 mb-4">
          <h3 className="text-vision-500 font-mono text-lg mb-4">Training Progress</h3>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 font-mono text-sm">
                Epoch {trainingProgress.epoch} / {trainingProgress.totalEpochs}
              </span>
              <span className="text-vision-500 font-mono text-sm">
                {trainingProgress.progress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-night-900 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-vision-500 transition-all duration-300"
                style={{ width: `${trainingProgress.progress}%` }}
              ></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-night-900 p-3 rounded border border-night-700">
              <div className="text-gray-400 text-xs mb-1">Loss</div>
              <div className="text-white font-mono">{trainingProgress.loss.toFixed(4)}</div>
            </div>
            <div className="bg-night-900 p-3 rounded border border-night-700">
              <div className="text-gray-400 text-xs mb-1">Val Loss</div>
              <div className="text-white font-mono">{trainingProgress.valLoss.toFixed(4)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Training Results */}
      {trainingResults.length > 0 && (
        <div className="bg-night-800 rounded-lg border border-night-700 p-6">
          <h3 className="text-vision-500 font-mono text-lg mb-4">Training Results</h3>
          <div className="space-y-2">
            {trainingResults.map((result, idx) => (
              <div key={idx} className="bg-night-900 p-3 rounded border border-night-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-mono">Epoch {result.epoch}</span>
                  <span className="text-vision-500 font-mono">
                    mAP: {(result.metrics.mAP * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-gray-500">Loss: </span>
                    <span className="text-white">{result.loss.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Val Loss: </span>
                    <span className="text-white">{result.valLoss.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

