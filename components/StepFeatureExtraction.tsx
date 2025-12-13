"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "./Button"
import type { ProcessedImage } from "../types"
import { extractComprehensiveFeatures, compareFeatureVectors } from "../services/featureExtraction"

interface StepFeatureExtractionProps {
  selectedImages: Array<{ original: string; enhanced: ProcessedImage }>
  onComplete: () => void
  onBack: () => void
}

export const StepFeatureExtraction: React.FC<StepFeatureExtractionProps> = ({ selectedImages, onComplete, onBack }) => {
  const [analyzing, setAnalyzing] = useState(true)
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState("Initializing...")
  const [allResults, setAllResults] = useState<any[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    const processFeatures = async () => {
      setAnalyzing(true)
      setProgress(10)
      const results = []

      for (let i = 0; i < selectedImages.length; i++) {
        const imageGroup = selectedImages[i]
        const progressPerImage = 100 / selectedImages.length
        const startProgress = (i / selectedImages.length) * 100

        setCurrentPhase(`Analyzing Low-Light Image ${i + 1}/${selectedImages.length}...`)
        await new Promise((resolve) => setTimeout(resolve, 300))

        const lowLight = await extractComprehensiveFeatures(imageGroup.original, "Low-Light")
        setProgress(Math.round(startProgress + 15))

        setCurrentPhase(`Analyzing Enhanced Image ${i + 1}/${selectedImages.length}...`)
        await new Promise((resolve) => setTimeout(resolve, 300))

        const enhanced = await extractComprehensiveFeatures(imageGroup.enhanced.dataUrl, "Enhanced")
        setProgress(Math.round(startProgress + 35))

        setCurrentPhase(`Computing Feature Similarity ${i + 1}/${selectedImages.length}...`)
        await new Promise((resolve) => setTimeout(resolve, 300))

        if (lowLight && enhanced) {
          const comp = compareFeatureVectors(lowLight.featureVector, enhanced.featureVector)

          results.push({
            imageIndex: i,
            enhanced: imageGroup.enhanced,
            original: imageGroup.original,
            lowLightResults: lowLight,
            enhancedResults: enhanced,
            comparison: {
              ...comp,
              keypoints: {
                lowLight: lowLight.keypoints,
                enhanced: enhanced.keypoints,
                improvement: {
                  orb: ((enhanced.keypoints.orb - lowLight.keypoints.orb) / lowLight.keypoints.orb) * 100,
                  fast: ((enhanced.keypoints.fast - lowLight.keypoints.fast) / lowLight.keypoints.fast) * 100,
                  sift: ((enhanced.keypoints.sift - lowLight.keypoints.sift) / lowLight.keypoints.sift) * 100,
                  average:
                    (((enhanced.keypoints.orb - lowLight.keypoints.orb) / lowLight.keypoints.orb) * 100 +
                      ((enhanced.keypoints.fast - lowLight.keypoints.fast) / lowLight.keypoints.fast) * 100 +
                      ((enhanced.keypoints.sift - lowLight.keypoints.sift) / lowLight.keypoints.sift) * 100) /
                    3,
                },
              },
              quality: {
                lowLight: lowLight.quality,
                enhanced: enhanced.quality,
                improvements: {
                  brightness: enhanced.quality.brightness - lowLight.quality.brightness,
                  contrast: enhanced.quality.contrast - lowLight.quality.contrast,
                  sharpness: enhanced.quality.sharpness - lowLight.quality.sharpness,
                },
              },
              texture: {
                hogSimilarity:
                  1 -
                  Math.abs(
                    enhanced.texture.hog.descriptor.reduce((a, b) => a + b, 0) -
                      lowLight.texture.hog.descriptor.reduce((a, b) => a + b, 0),
                  ) /
                    100,
                lbpSimilarity:
                  1 -
                  Math.abs(
                    enhanced.texture.lbp.histogram.reduce((a, b) => a + b, 0) -
                      lowLight.texture.lbp.histogram.reduce((a, b) => a + b, 0),
                  ),
                glcmChanges: {
                  contrast: enhanced.texture.glcm.contrast - lowLight.texture.glcm.contrast,
                  energy: enhanced.texture.glcm.energy - lowLight.texture.glcm.energy,
                  homogeneity: enhanced.texture.glcm.homogeneity - lowLight.texture.glcm.homogeneity,
                },
              },
              processingTime: {
                lowLight: lowLight.processingTime.total,
                enhanced: enhanced.processingTime.total,
                total: lowLight.processingTime.total + enhanced.processingTime.total,
              },
            },
          })
        }

        setProgress(Math.round(startProgress + progressPerImage))
      }

      setAllResults(results)
      setProgress(100)
      setCurrentPhase("Analysis Complete")
      setAnalyzing(false)
    }

    processFeatures()
  }, [selectedImages])

  const currentResult = allResults[selectedImageIndex]

  return (
    <div className="w-full animate-fadeIn pb-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold font-mono text-white">
          <span className="text-vision-500 mr-2">MODULE 2:</span>
          FEATURE EXTRACTION & EVALUATION
          {selectedImages.length > 1 && (
            <span className="text-vision-400 text-sm ml-4">
              ({selectedImageIndex + 1}/{selectedImages.length})
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBack} className="text-xs">
            Reset System
          </Button>
          {!analyzing && allResults.length > 0 && (
            <Button variant="primary" onClick={onComplete} className="text-xs">
              Next Phase →
            </Button>
          )}
        </div>
      </div>

      {/* Image Selector Tabs */}
      {selectedImages.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {selectedImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImageIndex(idx)}
              className={`px-3 py-1 rounded text-xs font-mono uppercase whitespace-nowrap transition-all ${
                selectedImageIndex === idx
                  ? "bg-vision-500 text-black font-bold"
                  : "bg-night-800 text-gray-400 hover:text-white border border-night-700"
              }`}
            >
              Image {idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {analyzing && (
        <div className="mb-6 bg-night-800 rounded-lg border border-night-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-mono text-gray-400">{currentPhase}</span>
            <span className="text-sm font-mono text-vision-500">{progress}%</span>
          </div>
          <div className="w-full bg-night-900 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-vision-500 transition-all duration-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Image Comparison Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Original Image */}
        <div className="bg-night-800 rounded-lg border border-night-700 p-4">
          <h3 className="text-gray-400 font-mono text-sm uppercase mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Low-Light Input
          </h3>
          <div className="relative bg-black rounded border border-night-700 overflow-hidden aspect-video">
            <img
              src={currentResult?.original || "/placeholder.svg"}
              alt="Original"
              className="w-full h-full object-contain"
            />
          </div>
          {currentResult?.lowLightResults && (
            <div className="mt-3 text-xs font-mono text-gray-500">
              {currentResult.lowLightResults.imageSize.width}×{currentResult.lowLightResults.imageSize.height}
            </div>
          )}
        </div>

        {/* Enhanced Image */}
        <div className="bg-night-800 rounded-lg border border-vision-500/30 p-4">
          <h3 className="text-vision-400 font-mono text-sm uppercase mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-vision-500 rounded-full animate-pulse"></span>
            Enhanced Output
          </h3>
          <div className="relative bg-black rounded border border-vision-500/30 overflow-hidden aspect-video">
            <img
              src={currentResult?.enhanced.dataUrl || "/placeholder.svg"}
              alt="Enhanced"
              className="w-full h-full object-contain"
            />
          </div>
          {currentResult?.enhancedResults && (
            <div className="mt-3 text-xs font-mono text-vision-500">{currentResult.enhanced.label}</div>
          )}
        </div>

        {/* Analysis Status */}
        <div className="bg-night-800 rounded-lg border border-night-700 p-4 flex flex-col">
          <h3 className="text-gray-400 font-mono text-sm uppercase mb-4 flex items-center gap-2">
            <span>{analyzing ? "Analyzing..." : "Summary"}</span>
            <span
              className={`w-2 h-2 rounded-full ${analyzing ? "bg-yellow-500 animate-pulse" : "bg-vision-500"}`}
            ></span>
          </h3>

          {analyzing ? (
            <div className="flex-grow flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-vision-500/30 border-t-vision-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            currentResult?.comparison && (
              <div className="space-y-3 text-sm font-mono">
                <div className="bg-night-900 p-3 rounded border border-night-700">
                  <div className="text-gray-500 text-xs mb-1">Processing Time</div>
                  <div className="text-white">{currentResult.comparison.processingTime.total}ms</div>
                </div>
                <div className="bg-night-900 p-3 rounded border border-night-700">
                  <div className="text-gray-500 text-xs mb-1">Features Detected</div>
                  <div className="text-white">
                    {currentResult.comparison.keypoints.enhanced.orb +
                      currentResult.comparison.keypoints.enhanced.fast +
                      currentResult.comparison.keypoints.enhanced.sift}
                  </div>
                </div>
                <div className="bg-night-900 p-3 rounded border border-night-700">
                  <div className="text-gray-500 text-xs mb-1">Feature Dimensionality</div>
                  <div className="text-white">{currentResult.enhancedResults.featureVector.dimensionality}D</div>
                </div>
                <div className="bg-night-900 p-3 rounded border border-vision-500/30">
                  <div className="text-gray-500 text-xs mb-1">Avg. Improvement</div>
                  <div className="text-vision-500 font-bold">
                    {Math.abs(Math.round(currentResult.comparison.keypoints.improvement.average))}%
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Detailed Analysis - Only show when complete */}
      {!analyzing && currentResult?.comparison && currentResult.lowLightResults && currentResult.enhancedResults && (
        <>
          {/* Keypoint Detection Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-night-800 rounded-lg border border-night-700 p-6">
              <h3 className="text-vision-500 font-mono text-lg mb-4 border-b border-night-700 pb-2 flex items-center justify-between">
                <span>KEYPOINT DETECTION</span>
                <span className="text-xs text-gray-500">Classical CV</span>
              </h3>

              <div className="space-y-6">
                {/* ORB */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 text-sm uppercase tracking-wider">ORB Keypoints</span>
                    <span
                      className={`font-bold text-sm ${currentResult.comparison.keypoints.improvement.orb >= 0 ? "text-vision-500" : "text-red-400"}`}
                    >
                      {currentResult.comparison.keypoints.improvement.orb >= 0 ? "+" : ""}
                      {Math.round(currentResult.comparison.keypoints.improvement.orb)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-night-900 p-3 rounded border border-red-500/30">
                      <div className="text-xs text-gray-500 mb-1">Low-Light</div>
                      <div className="text-2xl font-bold text-red-400">
                        {currentResult.comparison.keypoints.lowLight.orb}
                      </div>
                    </div>
                    <div className="bg-night-900 p-3 rounded border border-vision-500/30">
                      <div className="text-xs text-gray-500 mb-1">Enhanced</div>
                      <div className="text-2xl font-bold text-vision-500">
                        {currentResult.comparison.keypoints.enhanced.orb}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FAST */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 text-sm uppercase tracking-wider">FAST Keypoints</span>
                    <span
                      className={`font-bold text-sm ${currentResult.comparison.keypoints.improvement.fast >= 0 ? "text-vision-500" : "text-red-400"}`}
                    >
                      {currentResult.comparison.keypoints.improvement.fast >= 0 ? "+" : ""}
                      {Math.round(currentResult.comparison.keypoints.improvement.fast)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-night-900 p-3 rounded border border-red-500/30">
                      <div className="text-xs text-gray-500 mb-1">Low-Light</div>
                      <div className="text-2xl font-bold text-red-400">
                        {currentResult.comparison.keypoints.lowLight.fast}
                      </div>
                    </div>
                    <div className="bg-night-900 p-3 rounded border border-vision-500/30">
                      <div className="text-xs text-gray-500 mb-1">Enhanced</div>
                      <div className="text-2xl font-bold text-vision-500">
                        {currentResult.comparison.keypoints.enhanced.fast}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SIFT */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 text-sm uppercase tracking-wider">SIFT Keypoints</span>
                    <span
                      className={`font-bold text-sm ${currentResult.comparison.keypoints.improvement.sift >= 0 ? "text-vision-500" : "text-red-400"}`}
                    >
                      {currentResult.comparison.keypoints.improvement.sift >= 0 ? "+" : ""}
                      {Math.round(currentResult.comparison.keypoints.improvement.sift)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-night-900 p-3 rounded border border-red-500/30">
                      <div className="text-xs text-gray-500 mb-1">Low-Light</div>
                      <div className="text-2xl font-bold text-red-400">
                        {currentResult.comparison.keypoints.lowLight.sift}
                      </div>
                    </div>
                    <div className="bg-night-900 p-3 rounded border border-vision-500/30">
                      <div className="text-xs text-gray-500 mb-1">Enhanced</div>
                      <div className="text-2xl font-bold text-vision-500">
                        {currentResult.comparison.keypoints.enhanced.sift}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Texture Analysis */}
            <div className="bg-night-800 rounded-lg border border-night-700 p-6">
              <h3 className="text-vision-500 font-mono text-lg mb-4 border-b border-night-700 pb-2 flex items-center justify-between">
                <span>TEXTURE ANALYSIS</span>
                <span className="text-xs text-gray-500">HOG • LBP • GLCM</span>
              </h3>

              <div className="space-y-4">
                {/* HOG */}
                <div className="bg-night-900 p-4 rounded border border-night-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs uppercase">HOG Descriptor</span>
                    <span className="text-vision-500 text-xs font-mono">
                      {currentResult.lowLightResults.texture.hog.descriptor.length}D
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Cell: {currentResult.lowLightResults.texture.hog.cellSize}×
                    {currentResult.lowLightResults.texture.hog.cellSize}, Bins:{" "}
                    {currentResult.lowLightResults.texture.hog.bins}
                  </div>
                  <div className="mt-2 text-xs text-vision-400">
                    Similarity: {Math.round(currentResult.comparison.texture.hogSimilarity * 100)}%
                  </div>
                </div>

                {/* LBP */}
                <div className="bg-night-900 p-4 rounded border border-night-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs uppercase">LBP Histogram</span>
                    <span className="text-vision-500 text-xs font-mono">
                      {currentResult.lowLightResults.texture.lbp.patterns} patterns
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Radius: {currentResult.lowLightResults.texture.lbp.radius}, Uniform patterns
                  </div>
                  <div className="mt-2 text-xs text-vision-400">
                    Similarity: {Math.round(currentResult.comparison.texture.lbpSimilarity * 100)}%
                  </div>
                </div>

                {/* GLCM */}
                <div className="bg-night-900 p-4 rounded border border-night-700">
                  <div className="text-gray-400 text-xs uppercase mb-3">GLCM Properties</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Contrast Change</div>
                      <div
                        className={`font-bold ${currentResult.comparison.texture.glcmChanges.contrast >= 0 ? "text-vision-500" : "text-red-400"}`}
                      >
                        {currentResult.comparison.texture.glcmChanges.contrast >= 0 ? "+" : ""}
                        {Math.round(currentResult.comparison.texture.glcmChanges.contrast * 100) / 100}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Energy Change</div>
                      <div
                        className={`font-bold ${currentResult.comparison.texture.glcmChanges.energy >= 0 ? "text-vision-500" : "text-red-400"}`}
                      >
                        {currentResult.comparison.texture.glcmChanges.energy >= 0 ? "+" : ""}
                        {Math.round(currentResult.comparison.texture.glcmChanges.energy * 1000) / 1000}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Homogeneity</div>
                      <div
                        className={`font-bold ${currentResult.comparison.texture.glcmChanges.homogeneity >= 0 ? "text-vision-500" : "text-red-400"}`}
                      >
                        {currentResult.comparison.texture.glcmChanges.homogeneity >= 0 ? "+" : ""}
                        {Math.round(currentResult.comparison.texture.glcmChanges.homogeneity * 1000) / 1000}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Image Quality & Feature Vector Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Image Quality */}
            <div className="bg-night-800 rounded-lg border border-night-700 p-6">
              <h3 className="text-vision-500 font-mono text-lg mb-4 border-b border-night-700 pb-2">
                IMAGE QUALITY METRICS
              </h3>

              <div className="space-y-4">
                {/* Brightness */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 text-sm uppercase">Brightness</span>
                    <span className="text-vision-500 font-bold text-sm">
                      +{Math.round(currentResult.comparison.quality.improvements.brightness)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div className="bg-night-900 p-2 rounded border border-red-500/30 text-center">
                      <div className="text-xs text-gray-500">Low</div>
                      <div className="text-xl font-bold text-red-400">
                        {currentResult.comparison.quality.lowLight.brightness}
                      </div>
                    </div>
                    <div className="bg-night-900 p-2 rounded border border-vision-500/30 text-center">
                      <div className="text-xs text-gray-500">Enhanced</div>
                      <div className="text-xl font-bold text-vision-500">
                        {currentResult.comparison.quality.enhanced.brightness}
                      </div>
                    </div>
                  </div>
                  <div className="bg-night-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-vision-500 transition-all duration-1000"
                      style={{ width: `${(currentResult.comparison.quality.enhanced.brightness / 255) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Contrast */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 text-sm uppercase">Contrast</span>
                    <span className="text-vision-500 font-bold text-sm">
                      +{Math.round(currentResult.comparison.quality.improvements.contrast)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div className="bg-night-900 p-2 rounded border border-red-500/30 text-center">
                      <div className="text-xs text-gray-500">Low</div>
                      <div className="text-xl font-bold text-red-400">
                        {currentResult.comparison.quality.lowLight.contrast}
                      </div>
                    </div>
                    <div className="bg-night-900 p-2 rounded border border-vision-500/30 text-center">
                      <div className="text-xs text-gray-500">Enhanced</div>
                      <div className="text-xl font-bold text-vision-500">
                        {currentResult.comparison.quality.enhanced.contrast}
                      </div>
                    </div>
                  </div>
                  <div className="bg-night-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-vision-500 transition-all duration-1000"
                      style={{
                        width: `${Math.min((currentResult.comparison.quality.enhanced.contrast / 100) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Sharpness */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 text-sm uppercase">Sharpness</span>
                    <span className="text-vision-500 font-bold text-sm">
                      +{Math.round(currentResult.comparison.quality.improvements.sharpness)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div className="bg-night-900 p-2 rounded border border-red-500/30 text-center">
                      <div className="text-xs text-gray-500">Low</div>
                      <div className="text-xl font-bold text-red-400">
                        {currentResult.comparison.quality.lowLight.sharpness}
                      </div>
                    </div>
                    <div className="bg-night-900 p-2 rounded border border-vision-500/30 text-center">
                      <div className="text-xs text-gray-500">Enhanced</div>
                      <div className="text-xl font-bold text-vision-500">
                        {currentResult.comparison.quality.enhanced.sharpness}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Vector Analysis */}
            <div className="bg-night-800 rounded-lg border border-night-700 p-6">
              <h3 className="text-vision-500 font-mono text-lg mb-4 border-b border-night-700 pb-2">
                FEATURE VECTOR ANALYSIS
              </h3>

              <div className="space-y-4">
                {/* Dimensionality */}
                <div className="bg-night-900 p-4 rounded border border-night-700">
                  <div className="text-gray-400 text-xs uppercase mb-2">Feature Dimensionality</div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {currentResult.enhancedResults.featureVector.dimensionality}D
                  </div>
                  <div className="text-xs text-gray-500">
                    Keypoints: {currentResult.enhancedResults.featureVector.keypoints.length}D • Texture:{" "}
                    {currentResult.enhancedResults.featureVector.texture.length}D • Statistical:{" "}
                    {currentResult.enhancedResults.featureVector.statistical.length}D
                  </div>
                </div>

                {/* Similarity Metrics */}
                <div className="bg-night-900 p-4 rounded border border-vision-500/30">
                  <div className="text-gray-400 text-xs uppercase mb-3">Similarity Analysis</div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Cosine Similarity</span>
                      <span className="text-vision-500 font-bold">
                        {currentResult.comparison.similarity.toFixed(4)}
                      </span>
                    </div>
                    <div className="bg-night-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-vision-500"
                        style={{ width: `${currentResult.comparison.similarity * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Euclidean Distance</span>
                      <span className="text-gray-300 font-mono text-sm">
                        {currentResult.comparison.euclideanDistance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Statistical Features */}
                <div className="bg-night-900 p-4 rounded border border-night-700">
                  <div className="text-gray-400 text-xs uppercase mb-2">Statistical Features</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-500 mb-1">Hu Moments</div>
                      <div className="text-white font-mono">
                        {currentResult.enhancedResults.statistical.huMoments.length} invariants
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Color Moments</div>
                      <div className="text-white font-mono">RGB (3×3)</div>
                    </div>
                  </div>
                </div>

                {/* System Evaluation */}
                <div className="bg-vision-500/5 border border-vision-500/20 rounded p-4">
                  <div className="text-vision-500 font-bold text-xs mb-2 uppercase">Module 2 Evaluation</div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Enhancement increased feature detectability by{" "}
                    <span className="text-vision-500 font-bold">
                      {Math.abs(Math.round(currentResult.comparison.keypoints.improvement.average))}%
                    </span>
                    {". "}
                    Feature similarity of {currentResult.comparison.similarity.toFixed(2)} indicates content
                    preservation while maintaining structural improvements. System ready for Module 3 deep learning
                    integration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
