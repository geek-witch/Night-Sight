import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { PipelineResult } from '../types';
import { runPipeline, PipelineProgress } from '../services/pipelineService';
import { exportToJSON, exportAnnotatedImage } from '../services/exportService';

interface StepPipelineComparisonProps {
  imageUrl: string;
  onBack: () => void;
}

export const StepPipelineComparison: React.FC<StepPipelineComparisonProps> = ({
  imageUrl,
  onBack
}) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'raw' | 'enhanced' | 'comparison'>('comparison');

  useEffect(() => {
    const executePipeline = async () => {
      setProcessing(true);
      setError(null);
      setProgress(null);

      try {
        const pipelineResult = await runPipeline(imageUrl, (prog) => {
          setProgress(prog);
        });

        setResult(pipelineResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Pipeline execution failed');
      } finally {
        setProcessing(false);
      }
    };

    executePipeline();
  }, [imageUrl]);

  const drawDetections = (
    canvasId: string,
    imageUrl: string,
    detection: any
  ) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas || !detection) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes
      detection.boxes.forEach((box: any) => {
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
    };
    img.src = imageUrl;
  };

  useEffect(() => {
    if (result && selectedView === 'raw') {
      setTimeout(() => drawDetections('pipeline-canvas', result.raw.imageUrl, result.raw.detection), 100);
    } else if (result && selectedView === 'enhanced') {
      setTimeout(() => drawDetections('pipeline-canvas', result.enhanced.imageUrl, result.enhanced.detection), 100);
    }
  }, [result, selectedView]);

  if (processing) {
    return (
      <div className="w-full animate-fadeIn pb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold font-mono text-white">
            <span className="text-vision-500 mr-2">COMPLETE PIPELINE:</span>
            PROCESSING...
          </h2>
          <Button variant="secondary" onClick={onBack} className="text-xs">
            Cancel
          </Button>
        </div>

        {progress && (
          <div className="bg-night-800 rounded-lg border border-night-700 p-6 mb-4">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-vision-500 font-mono text-sm uppercase">
                  {progress.stage.replace('_', ' ')}
                </span>
                <span className="text-vision-500 font-mono text-sm">{progress.progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-night-900 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-vision-500 transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
            </div>
            <p className="text-gray-400 font-mono text-sm">{progress.message}</p>
            {progress.currentImage && (
              <p className="text-vision-500 font-mono text-xs mt-2">
                Processing: {progress.currentImage} image
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full animate-fadeIn pb-4">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
          <h3 className="text-red-400 font-mono text-lg mb-2">Pipeline Error</h3>
          <p className="text-red-300 font-mono text-sm">{error}</p>
          <Button variant="secondary" onClick={onBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="w-full animate-fadeIn pb-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold font-mono text-white">
          <span className="text-vision-500 mr-2">COMPLETE PIPELINE:</span>
          PERFORMANCE COMPARISON
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBack} className="text-xs">
            Back
          </Button>
          <button
            onClick={() => exportToJSON(result as any, 'pipeline_results.json')}
            className="px-3 py-1.5 bg-night-700 text-white hover:bg-night-600 border border-night-600 rounded text-xs font-mono uppercase transition-colors"
          >
            Export Results
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        {['raw', 'enhanced', 'comparison'].map((view) => (
          <button
            key={view}
            onClick={() => setSelectedView(view as any)}
            className={`px-4 py-2 rounded font-mono text-sm transition-all ${
              selectedView === view
                ? 'bg-vision-500 text-black font-bold'
                : 'bg-night-800 text-gray-400 hover:text-white border border-night-700'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Comparison View */}
      {selectedView === 'comparison' && (
        <div className="space-y-4">
          {/* Overall Improvement */}
          <div className="bg-night-800 rounded-lg border border-vision-500/30 p-6">
            <h3 className="text-vision-500 font-mono text-lg mb-4">Overall Performance Improvement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-night-900 p-4 rounded border border-night-700">
                <div className="text-gray-400 text-xs mb-2 uppercase">Overall Improvement</div>
                <div className="text-4xl font-bold text-vision-500 font-mono">
                  {result.comparison.overallImprovement >= 0 ? '+' : ''}
                  {result.comparison.overallImprovement.toFixed(2)}%
                </div>
              </div>
              <div className="bg-night-900 p-4 rounded border border-night-700">
                <div className="text-gray-400 text-xs mb-2 uppercase">Processing Time</div>
                <div className="text-sm font-mono text-white space-y-1">
                  <div>Raw: {result.comparison.totalProcessingTime.raw.toFixed(0)}ms</div>
                  <div>Enhanced: {result.comparison.totalProcessingTime.enhanced.toFixed(0)}ms</div>
                  <div className="text-vision-500">
                    Overhead: +{result.comparison.totalProcessingTime.overhead.toFixed(0)}ms
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Improvement */}
          <div className="bg-night-800 rounded-lg border border-night-700 p-6">
            <h3 className="text-vision-500 font-mono text-lg mb-4">Feature Extraction Improvement</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                label="Keypoints"
                value={result.comparison.featureImprovement.keypoints}
                unit="%"
              />
              <MetricCard
                label="Texture"
                value={result.comparison.featureImprovement.texture}
                unit="%"
              />
              <MetricCard
                label="Quality"
                value={result.comparison.featureImprovement.quality}
                unit="%"
              />
            </div>
          </div>

          {/* Detection Improvement */}
          <div className="bg-night-800 rounded-lg border border-night-700 p-6">
            <h3 className="text-vision-500 font-mono text-lg mb-4">Object Detection Improvement</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard
                label="Accuracy"
                value={result.comparison.detectionImprovement.accuracy * 100}
                unit="%"
              />
              <MetricCard
                label="Precision"
                value={result.comparison.detectionImprovement.precision * 100}
                unit="%"
              />
              <MetricCard
                label="Recall"
                value={result.comparison.detectionImprovement.recall * 100}
                unit="%"
              />
              <MetricCard
                label="mAP"
                value={result.comparison.detectionImprovement.mAP * 100}
                unit="%"
              />
              <MetricCard
                label="Detections"
                value={result.comparison.detectionImprovement.detectionCount}
                unit=""
              />
            </div>
          </div>

          {/* Side-by-Side Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-night-800 rounded-lg border border-red-500/30 p-6">
              <h3 className="text-red-400 font-mono text-lg mb-4">Raw Image Metrics</h3>
              <div className="space-y-3">
                <MetricRow label="Accuracy" value={result.raw.metrics.accuracy} />
                <MetricRow label="Precision" value={result.raw.metrics.precision} />
                <MetricRow label="Recall" value={result.raw.metrics.recall} />
                <MetricRow label="mAP" value={result.raw.metrics.mAP} />
                <MetricRow label="Detections" value={result.raw.detection.boxes.length} isCount />
                <MetricRow label="Time" value={result.raw.processingTime} isTime />
              </div>
            </div>

            <div className="bg-night-800 rounded-lg border border-vision-500/30 p-6">
              <h3 className="text-vision-500 font-mono text-lg mb-4">Enhanced Image Metrics</h3>
              <div className="space-y-3">
                <MetricRow label="Accuracy" value={result.enhanced.metrics.accuracy} />
                <MetricRow label="Precision" value={result.enhanced.metrics.precision} />
                <MetricRow label="Recall" value={result.enhanced.metrics.recall} />
                <MetricRow label="mAP" value={result.enhanced.metrics.mAP} />
                <MetricRow label="Detections" value={result.enhanced.detection.boxes.length} isCount />
                <MetricRow label="Time" value={result.enhanced.processingTime} isTime />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw/Enhanced Views */}
      {(selectedView === 'raw' || selectedView === 'enhanced') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-night-800 rounded-lg border border-night-700 p-4">
            <div className="relative bg-black rounded border border-night-700 overflow-hidden">
              <canvas
                id="pipeline-canvas"
                className="w-full h-auto max-h-[70vh] object-contain"
              ></canvas>
            </div>
          </div>
          <div className="bg-night-800 rounded-lg border border-night-700 p-6">
            <h3 className="text-vision-500 font-mono text-lg mb-4">
              {selectedView === 'raw' ? 'Raw Image' : 'Enhanced Image'} Results
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-gray-400 text-xs mb-2 uppercase">Detections</div>
                <div className="text-2xl font-bold text-white font-mono">
                  {selectedView === 'raw' 
                    ? result.raw.detection.boxes.length 
                    : result.enhanced.detection.boxes.length}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-2 uppercase">Processing Time</div>
                <div className="text-xl font-mono text-white">
                  {selectedView === 'raw'
                    ? result.raw.processingTime.toFixed(0)
                    : result.enhanced.processingTime.toFixed(0)}ms
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MetricCard
                  label="mAP"
                  value={(selectedView === 'raw' ? result.raw.metrics.mAP : result.enhanced.metrics.mAP) * 100}
                  unit="%"
                  small
                />
                <MetricCard
                  label="Precision"
                  value={(selectedView === 'raw' ? result.raw.metrics.precision : result.enhanced.metrics.precision) * 100}
                  unit="%"
                  small
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  small?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, small = false }) => {
  const isPositive = value >= 0;
  const colorClass = isPositive ? 'text-vision-500' : 'text-red-400';
  const sign = value >= 0 ? '+' : '';

  return (
    <div className="bg-night-900 p-3 rounded border border-night-700">
      <div className="text-gray-400 text-xs mb-1 uppercase">{label}</div>
      <div className={`font-bold font-mono ${colorClass} ${small ? 'text-xl' : 'text-2xl'}`}>
        {sign}{value.toFixed(2)}{unit}
      </div>
    </div>
  );
};

interface MetricRowProps {
  label: string;
  value: number;
  isCount?: boolean;
  isTime?: boolean;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, isCount, isTime }) => {
  const displayValue = isCount 
    ? value.toString() 
    : isTime 
    ? `${value.toFixed(0)}ms`
    : (value * 100).toFixed(2) + '%';

  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-sm font-mono">{label}</span>
      <span className="text-white font-mono font-bold">{displayValue}</span>
    </div>
  );
};

