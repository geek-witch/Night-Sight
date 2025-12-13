"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "./Button"
import type { ProcessedImage, DetectionResult, ModelEvaluation } from "../types"
import { yoloDetector } from "../services/yoloDetection"
import { evaluateOnBothImageTypes } from "../services/modelTraining"
import { exportToJSON, exportAnnotatedImage, exportEvaluationMetrics } from "../services/exportService"

interface StepObjectDetectionProps {
  originalImageSrc: string
  enhancedImage: ProcessedImage
  onBack: () => void
  onNext?: () => void
}

export const StepObjectDetection: React.FC<StepObjectDetectionProps> = ({
  originalImageSrc,
  enhancedImage,
  onBack,
  onNext,
}) => {
  const [processing, setProcessing] = useState(true)
  const [rawDetection, setRawDetection] = useState<DetectionResult | null>(null)
  const [enhancedDetection, setEnhancedDetection] = useState<DetectionResult | null>(null)
  const [evaluation, setEvaluation] = useState<ModelEvaluation | null>(null)
  const [selectedView, setSelectedView] = useState<"raw" | "enhanced">("enhanced")
  const [showMetrics, setShowMetrics] = useState(true)

  useEffect(() => {
    const runDetection = async () => {
      try {
        setProcessing(true)

        // Load YOLO model
        await yoloDetector.loadModel()

        // Run detection on raw image
        const raw = await yoloDetector.detect(originalImageSrc)
        setRawDetection(raw)

        // Run detection on enhanced image
        const enhanced = await yoloDetector.detect(enhancedImage.dataUrl)
        setEnhancedDetection(enhanced)

        // Evaluate both
        const evalResult = await evaluateOnBothImageTypes(originalImageSrc, enhancedImage.dataUrl)
        setEvaluation(evalResult)
      } catch (error) {
        console.error("Detection failed:", error)
      } finally {
        setProcessing(false)
      }
    }

    runDetection()
  }, [originalImageSrc, enhancedImage.dataUrl])

  useEffect(() => {
    const drawDetectionsOnCanvas = () => {
      const canvas = document.getElementById("detection-canvas") as HTMLCanvasElement
      if (!canvas) return

      const imageUrl = selectedView === "raw" ? originalImageSrc : enhancedImage.dataUrl
      const detection = selectedView === "raw" ? rawDetection : enhancedDetection

      if (!detection) return

      const img = new Image()
      img.crossOrigin = "Anonymous"
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Clear and draw image
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)

        // Draw detections
        yoloDetector.drawDetections(canvas, detection, true)
      }
      img.onerror = () => {
        console.error("Failed to load image for detection visualization")
      }
      img.src = imageUrl
    }

    if ((rawDetection || enhancedDetection) && !processing) {
      // Small delay to ensure canvas is rendered
      setTimeout(drawDetectionsOnCanvas, 100)
    }
  }, [selectedView, rawDetection, enhancedDetection, originalImageSrc, enhancedImage.dataUrl, processing])

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <div className="w-16 h-16 border-4 border-vision-500/30 border-t-vision-500 rounded-full animate-spin mb-4"></div>
        <p className="font-mono text-vision-500 animate-pulse">LOADING AI MODEL & RUNNING DETECTION...</p>
        <p className="font-mono text-gray-500 text-sm mt-2">First load may take a few seconds</p>
      </div>
    )
  }

  const currentDetection = selectedView === "raw" ? rawDetection : enhancedDetection
  const currentMetrics = selectedView === "raw" ? evaluation?.rawImageMetrics : evaluation?.enhancedImageMetrics

  return (
    <div className="w-full animate-fadeIn pb-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold font-mono text-white">
          <span className="text-vision-500 mr-2">MODULE 3:</span>
          YOLO OBJECT DETECTION
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBack} className="text-xs">
            Reset System
          </Button>
          {currentDetection && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const imageUrl = selectedView === "raw" ? originalImageSrc : enhancedImage.dataUrl
                  const detection = selectedView === "raw" ? rawDetection : enhancedDetection
                  if (detection) {
                    exportAnnotatedImage(imageUrl, detection, `detection_${selectedView}.png`)
                  }
                }}
                className="px-3 py-1.5 bg-night-700 text-white hover:bg-night-600 border border-night-600 rounded text-xs font-mono uppercase transition-colors"
              >
                Export Image
              </button>
              <button
                onClick={() => {
                  const detection = selectedView === "raw" ? rawDetection : enhancedDetection
                  if (detection) {
                    exportToJSON(detection, `detection_${selectedView}.json`)
                  }
                }}
                className="px-3 py-1.5 bg-night-700 text-white hover:bg-night-600 border border-night-600 rounded text-xs font-mono uppercase transition-colors"
              >
                Export JSON
              </button>
            </div>
          )}
          {evaluation && (
            <button
              onClick={() => exportEvaluationMetrics(evaluation, "evaluation_metrics.json")}
              className="px-3 py-1.5 bg-vision-500/20 text-vision-500 hover:bg-vision-500/30 border border-vision-500/50 rounded text-xs font-mono uppercase transition-colors"
            >
              Export Metrics
            </button>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSelectedView("raw")}
          className={`px-4 py-2 rounded font-mono text-sm transition-all ${
            selectedView === "raw"
              ? "bg-vision-500 text-black font-bold"
              : "bg-night-800 text-gray-400 hover:text-white border border-night-700"
          }`}
        >
          Raw Image
        </button>
        <button
          onClick={() => setSelectedView("enhanced")}
          className={`px-4 py-2 rounded font-mono text-sm transition-all ${
            selectedView === "enhanced"
              ? "bg-vision-500 text-black font-bold"
              : "bg-night-800 text-gray-400 hover:text-white border border-night-700"
          }`}
        >
          Enhanced Image
        </button>
        <button
          onClick={() => setShowMetrics(!showMetrics)}
          className={`px-4 py-2 rounded font-mono text-sm transition-all ${
            showMetrics
              ? "bg-night-700 text-vision-500 border border-vision-500/50"
              : "bg-night-800 text-gray-400 border border-night-700"
          }`}
        >
          {showMetrics ? "Hide" : "Show"} Metrics
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Detection View */}
        <div className="lg:col-span-2">
          <div className="bg-night-800 rounded-lg border border-night-700 p-4">
            <div className="relative bg-black rounded border border-night-700 overflow-hidden">
              <canvas id="detection-canvas" className="w-full h-auto max-h-[70vh] object-contain"></canvas>
              {currentDetection && (
                <div className="absolute top-4 left-4 bg-black/80 px-3 py-1.5 rounded border border-vision-500/50 backdrop-blur-sm">
                  <div className="text-xs font-mono text-vision-500">
                    Detections: {currentDetection.boxes.length} | Model: {currentDetection.modelVersion} | Time:{" "}
                    {currentDetection.processingTime.toFixed(0)}ms
                  </div>
                </div>
              )}
              {currentDetection && (
                <div className="absolute bottom-4 left-4 bg-vision-500/20 px-3 py-2 rounded border border-vision-500/50 backdrop-blur-sm">
                  <div className="text-xs font-mono text-vision-500">
                    ✅ REAL AI: Using COCO-SSD neural network for object detection
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detection List */}
          {currentDetection && currentDetection.boxes.length > 0 && (
            <div className="mt-4 bg-night-800 rounded-lg border border-night-700 p-4">
              <h3 className="text-vision-500 font-mono text-sm mb-3 uppercase">Detected Objects</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {currentDetection.boxes.map((box, idx) => (
                  <div
                    key={idx}
                    className="bg-night-900 p-3 rounded border border-night-700 hover:border-vision-500/50 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-mono text-sm font-bold">{box.class}</span>
                      <span className="text-vision-500 font-mono text-xs">{(box.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {Math.round(box.width)}×{Math.round(box.height)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Metrics Panel */}
        {showMetrics && (
          <div className="lg:col-span-1 space-y-4">
            {/* Overall Metrics */}
            {currentMetrics && (
              <div className="bg-night-800 rounded-lg border border-night-700 p-6">
                <h3 className="text-vision-500 font-mono text-lg mb-4 border-b border-night-700 pb-2">
                  {selectedView === "raw" ? "RAW IMAGE" : "ENHANCED IMAGE"} METRICS
                </h3>

                <div className="space-y-4">
                  <MetricCard label="Accuracy" value={currentMetrics.accuracy} format="percent" color="vision" />
                  <MetricCard label="Precision" value={currentMetrics.precision} format="percent" color="vision" />
                  <MetricCard label="Recall" value={currentMetrics.recall} format="percent" color="vision" />
                  <MetricCard label="F1 Score" value={currentMetrics.f1Score} format="percent" color="vision" />
                  <MetricCard label="mAP" value={currentMetrics.mAP} format="percent" color="vision" />
                  <MetricCard label="mAP@0.5" value={currentMetrics.mAP50} format="percent" color="vision" />
                  <MetricCard label="mAP@0.75" value={currentMetrics.mAP75} format="percent" color="vision" />
                </div>
              </div>
            )}

            {/* Comparison Metrics */}
            {evaluation && (
              <div className="bg-night-800 rounded-lg border border-vision-500/30 p-6">
                <h3 className="text-vision-500 font-mono text-lg mb-4 border-b border-night-700 pb-2">
                  ENHANCEMENT IMPROVEMENT
                </h3>

                <div className="space-y-3">
                  <ImprovementCard label="Accuracy" improvement={evaluation.comparison.accuracyImprovement} />
                  <ImprovementCard label="Precision" improvement={evaluation.comparison.precisionImprovement} />
                  <ImprovementCard label="Recall" improvement={evaluation.comparison.recallImprovement} />
                  <ImprovementCard label="mAP" improvement={evaluation.comparison.mAPImprovement} />
                </div>
              </div>
            )}

            {/* Per-Class Metrics */}
            {currentMetrics && currentMetrics.perClassMetrics.length > 0 && (
              <div className="bg-night-800 rounded-lg border border-night-700 p-6">
                <h3 className="text-vision-500 font-mono text-sm mb-3 uppercase">Per-Class Performance</h3>
                <div className="space-y-2">
                  {currentMetrics.perClassMetrics.map((metric, idx) => (
                    <div key={idx} className="bg-night-900 p-3 rounded border border-night-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-mono text-xs font-bold uppercase">{metric.className}</span>
                        <span className="text-vision-500 font-mono text-xs">AP: {(metric.ap * 100).toFixed(1)}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-gray-500">P: </span>
                          <span className="text-white">{(metric.precision * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">R: </span>
                          <span className="text-white">{(metric.recall * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: number
  format: "percent" | "number"
  color?: "vision" | "red"
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, format, color = "vision" }) => {
  const displayValue = format === "percent" ? (value * 100).toFixed(2) + "%" : value.toFixed(4)
  const colorClass = color === "vision" ? "text-vision-500" : "text-red-400"

  return (
    <div className="bg-night-900 p-3 rounded border border-night-700">
      <div className="text-gray-400 text-xs uppercase mb-1 font-mono">{label}</div>
      <div className={`text-2xl font-bold font-mono ${colorClass}`}>{displayValue}</div>
    </div>
  )
}

interface ImprovementCardProps {
  label: string
  improvement: number
}

const ImprovementCard: React.FC<ImprovementCardProps> = ({ label, improvement }) => {
  const isPositive = improvement >= 0
  const colorClass = isPositive ? "text-vision-500" : "text-red-400"
  const sign = improvement >= 0 ? "+" : ""

  return (
    <div className="bg-night-900 p-3 rounded border border-night-700">
      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-xs uppercase font-mono">{label}</span>
        <span className={`font-bold font-mono ${colorClass}`}>
          {sign}
          {(improvement * 100).toFixed(2)}%
        </span>
      </div>
    </div>
  )
}
