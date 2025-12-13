import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { ProcessedImage } from '../types';

interface StepClassificationProps {
  image: ProcessedImage;
  onBack: () => void;
}

export const StepClassification: React.FC<StepClassificationProps> = ({ image, onBack }) => {
  const [analyzing, setAnalyzing] = useState(true);
  const [results, setResults] = useState<{label: string, confidence: number}[]>([]);

  useEffect(() => {
    // Simulate classification delay
    const timer = setTimeout(() => {
      setAnalyzing(false);
      setResults([
        { label: 'Low Light Anomaly', confidence: 0.98 },
        { label: 'Organic Structure', confidence: 0.85 },
        { label: 'Thermal Signature', confidence: 0.72 }
      ]);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full animate-fadeIn pb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold font-mono text-white">
          <span className="text-vision-500 mr-2">Step 6:</span>
          CLASSIFICATION MATRIX
        </h2>
        <Button variant="secondary" onClick={onBack} className="text-xs">
          Reset System
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Main Image View - Increased to 4/5 columns and 85vh height */}
        <div className="lg:col-span-4">
          <div className="bg-night-800 rounded-lg border border-night-700 relative overflow-hidden group h-[85vh] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="relative w-full h-full bg-black flex items-center justify-center">
               <img 
                 src={image.dataUrl} 
                 alt="Subject" 
                 className="w-full h-full object-contain" 
               />
               
               {/* Scanning Overlay Effect */}
               {analyzing && (
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-vision-500/10 to-transparent w-full h-full animate-[scan_2s_ease-in-out_infinite] border-b border-vision-500/30 pointer-events-none"></div>
               )}
            </div>
            
            <div className="absolute bottom-4 right-4 text-xs font-mono text-vision-500 bg-black/80 px-3 py-1.5 rounded border border-vision-500/30 backdrop-blur-md">
              SOURCE_ID: {image.label.toUpperCase().replace(/\s/g, '_')}
            </div>
          </div>
        </div>

        {/* Analysis Panel - Adjusted to 1/5 columns and matching height */}
        <div className="lg:col-span-1 flex flex-col gap-4 h-[85vh]">
          <div className="bg-night-800 p-6 rounded-lg border border-night-700 flex flex-col h-full overflow-y-auto custom-scrollbar">
            <h3 className="text-vision-500 font-mono text-lg mb-6 flex items-center gap-2 border-b border-night-700 pb-4">
              <span className={`w-2 h-2 rounded-full ${analyzing ? 'bg-yellow-500 animate-pulse' : 'bg-vision-500'}`}></span>
              {analyzing ? 'ANALYZING...' : 'RESULTS'}
            </h3>

            <div className="space-y-4 flex-grow">
              {analyzing ? (
                // Skeleton loading
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-1/3 bg-night-700 rounded animate-pulse"></div>
                    <div className="h-12 bg-night-900 rounded border border-night-700 animate-pulse"></div>
                  </div>
                ))
              ) : (
                // Results
                results.map((res, idx) => (
                  <div key={idx} className="bg-night-900 p-4 rounded border border-night-700 hover:border-vision-500/50 transition-colors">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-gray-300 font-mono text-xs uppercase tracking-wider truncate w-24" title={res.label}>{res.label}</span>
                      <span className="text-vision-500 font-bold font-mono">{(res.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-night-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-vision-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-all duration-1000 ease-out"
                        style={{ width: `${res.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {!analyzing && (
               <div className="mt-8 p-4 bg-vision-500/5 border border-vision-500/20 rounded text-xs text-gray-400 font-mono">
                 <p className="mb-2 text-vision-500 font-bold uppercase">System Diagnostic:</p>
                 Analysis confirms structural integrity matches known night-vision profiles. Confidence levels sufficient for automated tracking.
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};