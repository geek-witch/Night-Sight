import React, { useRef } from 'react';
import { Button } from './Button';

interface StepUploadProps {
  onImageSelected: (files: File[]) => void;
  onPipelineSelected?: (files: File[]) => void;
}

export const StepUpload: React.FC<StepUploadProps> = ({ onImageSelected, onPipelineSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const isPipelineMode = (e.target as any).__pipelineMode;
      if (isPipelineMode && onPipelineSelected) {
        (e.target as any).__pipelineMode = false;
        onPipelineSelected(files);
      } else {
        onImageSelected(files);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImageSelected(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-fadeIn">
      <div 
        className="w-full max-w-2xl p-12 border-2 border-dashed border-vision-500/30 rounded-lg bg-night-800/50 flex flex-col items-center justify-center text-center transition-colors hover:border-vision-500/60 hover:bg-night-800/80"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="w-20 h-20 mb-6 rounded-full bg-night-900 border border-vision-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.2)]">
          <svg className="w-10 h-10 text-vision-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold mb-2 text-white font-mono tracking-tight">
          INITIALIZE NIGHT VISION
        </h2>
        <p className="text-gray-400 mb-8 max-w-md">
          Upload one or multiple low-light images to apply advanced computer vision filters.
        </p>

        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange} 
          accept="image/*" 
          multiple
          className="hidden" 
        />
        
        <div className="flex gap-3">
          <Button onClick={() => fileInputRef.current?.click()}>
            Select Images
          </Button>
         
        </div>
        <p className="mt-4 text-xs text-gray-500 uppercase tracking-widest">or drag and drop files here</p>
      </div>
    </div>
  );
};