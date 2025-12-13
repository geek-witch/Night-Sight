"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AppStep, type ProcessedImage, type SelectedImageGroup } from "./types"
import { StepUpload } from "./components/StepUpload"
import { StepProcess } from "./components/StepProcess"
import { StepFeatureExtraction } from "./components/StepFeatureExtraction"
import { StepObjectDetection } from "./components/StepObjectDetection"
import { StepPipelineComparison } from "./components/StepPipelineComparison"

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD)
  const [originalImages, setOriginalImages] = useState<string[]>([])
  const [selectedResults, setSelectedResults] = useState<SelectedImageGroup[]>([])
  const [selectedOriginalImage, setSelectedOriginalImage] = useState<string>("")

  const stepToHash = (step: AppStep) => {
    switch (step) {
      case AppStep.UPLOAD:
        return ""
      case AppStep.PROCESS:
        return "enhance"
      case AppStep.FEATURE_EXTRACTION:
        return "extract"
      case AppStep.STEP_2:
        return "detection"
      case AppStep.STEP_3:
        return "tracking"
      case AppStep.PIPELINE:
        return "pipeline"
      default:
        return ""
    }
  }

  const hashToStep = (hash: string): AppStep => {
    switch (hash) {
      case "enhance":
        return AppStep.PROCESS
      case "extract":
        return AppStep.FEATURE_EXTRACTION
      case "detection":
        return AppStep.STEP_2
      case "tracking":
        return AppStep.STEP_3
      case "pipeline":
        return AppStep.PIPELINE
      default:
        return AppStep.UPLOAD
    }
  }

  const updateHash = (step: AppStep) => {
    const hash = stepToHash(step)
    const newUrl = window.location.pathname + window.location.search + (hash ? `#${hash}` : "")
    if (window.location.hash !== (hash ? `#${hash}` : "")) {
      window.history.pushState({ step }, "", newUrl)
    }
  }

  const navigateToStep = (step: AppStep) => {
    setCurrentStep(step)
    updateHash(step)
  }

  useEffect(() => {
    const handlePopState = (event?: PopStateEvent | null) => {
      const stateStep = (event?.state as any)?.step as AppStep | undefined
      const hash = window.location.hash.replace("#", "")
      const targetStep = stateStep ?? hashToStep(hash)

      if (targetStep === AppStep.PROCESS && originalImages.length === 0) {
        const replaceUrl = window.location.pathname + window.location.search
        window.history.replaceState(null, "", replaceUrl)
        setCurrentStep(AppStep.UPLOAD)
        return
      }

      const requiresResult = [AppStep.FEATURE_EXTRACTION, AppStep.STEP_2, AppStep.STEP_3, AppStep.PIPELINE]
      if (requiresResult.includes(targetStep) && selectedResults.length === 0) {
        if (originalImages.length > 0) {
          const replaceUrl = window.location.pathname + window.location.search + "#enhance"
          window.history.replaceState(null, "", replaceUrl)
          setCurrentStep(AppStep.PROCESS)
        } else {
          const replaceUrl = window.location.pathname + window.location.search
          window.history.replaceState(null, "", replaceUrl)
          setCurrentStep(AppStep.UPLOAD)
        }
        return
      }

      setCurrentStep(targetStep)
    }

    handlePopState()

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [originalImages, selectedResults])

  const handleImageSelected = async (files: File[]) => {
    try {
      const promises = files.map((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            if (e.target?.result) resolve(e.target.result as string)
            else reject("Failed to read file")
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      })

      const images = await Promise.all(promises)
      setOriginalImages(images)

      navigateToStep(AppStep.PROCESS)
    } catch (error) {
      console.error("Error reading files:", error)
    }
  }

  const handlePipelineSelected = async (files: File[]) => {
    try {
      const promises = files.map((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            if (e.target?.result) resolve(e.target.result as string)
            else reject("Failed to read file")
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      })

      const images = await Promise.all(promises)
      setOriginalImages(images)

      navigateToStep(AppStep.PIPELINE)
    } catch (error) {
      console.error("Error reading files:", error)
    }
  }

  const handleResultSelected = (image: ProcessedImage, originalSrc: string) => {
    setSelectedResults((prev) => [...prev, { enhanced: image, original: originalSrc }])
  }

  const handleRemoveSelected = (index: number) => {
    setSelectedResults((prev) => prev.filter((_, i) => i !== index))
  }

  const handleClearSelection = () => {
    setSelectedResults([])
  }

  const handleConfirmSelection = () => {
    if (selectedResults.length > 0) {
      navigateToStep(AppStep.FEATURE_EXTRACTION)
    }
  }

  const handleFeatureExtractionComplete = () => {
    navigateToStep(AppStep.STEP_2)
  }

  const handleReset = () => {
    setOriginalImages([])
    setSelectedResults([])
    setSelectedOriginalImage("")
    navigateToStep(AppStep.UPLOAD)
  }

  const getStepStatusClass = (step: AppStep, target: AppStep) => {
    const order = [
      AppStep.UPLOAD,
      AppStep.PROCESS,
      AppStep.FEATURE_EXTRACTION,
      AppStep.STEP_2,
      AppStep.STEP_3,
      AppStep.PIPELINE,
    ]
    const currentIndex = order.indexOf(step)
    const targetIndex = order.indexOf(target)
    return currentIndex === targetIndex
      ? "text-white text-vision-500"
      : currentIndex > targetIndex
        ? "text-vision-500/70"
        : "text-gray-600"
  }

  return (
    <div className="min-h-screen bg-night-900 text-gray-200 font-sans selection:bg-vision-500 selection:text-black flex flex-col">
      {/* Header */}
      <header className="border-b border-night-700 bg-night-900/95 sticky top-0 z-50 backdrop-blur-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-vision-500 rounded-full shadow-[0_0_10px_#22c55e] animate-pulse"></div>
            <h1 className="text-xl font-bold tracking-wider font-mono text-white">
              NIGHT<span className="text-vision-500">SIGHT</span>
            </h1>
          </div>
          <nav className="hidden lg:flex gap-4 text-[10px] uppercase font-mono tracking-widest">
            <button
              className={getStepStatusClass(currentStep, AppStep.UPLOAD)}
              onClick={() => navigateToStep(AppStep.UPLOAD)}
            >
              01. Input
            </button>
            <span className="text-night-700">/</span>
            <button
              className={getStepStatusClass(currentStep, AppStep.PROCESS)}
              onClick={() => {
                if (originalImages.length === 0) navigateToStep(AppStep.UPLOAD)
                else navigateToStep(AppStep.PROCESS)
              }}
            >
              02. Enhance
            </button>
            <span className="text-night-700">/</span>
            <button
              className={getStepStatusClass(currentStep, AppStep.FEATURE_EXTRACTION)}
              onClick={() => {
                if (selectedResults.length === 0) {
                  if (originalImages.length > 0) navigateToStep(AppStep.PROCESS)
                  else navigateToStep(AppStep.UPLOAD)
                } else {
                  navigateToStep(AppStep.FEATURE_EXTRACTION)
                }
              }}
            >
              03. Extract
            </button>
            <span className="text-night-700">/</span>
            <button
              className={getStepStatusClass(currentStep, AppStep.STEP_2)}
              onClick={() => {
                if (selectedResults.length === 0) {
                  if (originalImages.length > 0) navigateToStep(AppStep.PROCESS)
                  else navigateToStep(AppStep.UPLOAD)
                } else {
                  navigateToStep(AppStep.STEP_2)
                }
              }}
            >
              04. Detect
            </button>
            <span className="text-night-700">/</span>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {currentStep === AppStep.UPLOAD && (
          <StepUpload onImageSelected={handleImageSelected} onPipelineSelected={handlePipelineSelected} />
        )}

        {currentStep === AppStep.PROCESS && originalImages.length > 0 && (
          <StepProcess
            originalImageSrcs={originalImages}
            onSelectResult={handleResultSelected}
            selectedCount={selectedResults.length}
            onConfirmSelection={handleConfirmSelection}
            onRemoveSelected={handleRemoveSelected}
            onClearSelection={handleClearSelection}
            onBack={handleReset}
          />
        )}

        {currentStep === AppStep.FEATURE_EXTRACTION && selectedResults.length > 0 && (
          <StepFeatureExtraction
            selectedImages={selectedResults}
            onComplete={handleFeatureExtractionComplete}
            onBack={handleReset}
          />
        )}

        {currentStep === AppStep.STEP_2 && selectedResults.length > 0 && (
          <StepObjectDetection
            originalImageSrc={selectedResults[0].original}
            enhancedImage={selectedResults[0].enhanced}
            onBack={handleReset}
            onNext={() => navigateToStep(AppStep.STEP_3)}
          />
        )}

        {currentStep === AppStep.STEP_3 && selectedResults.length > 0 && (
          <div className="max-w-4xl mx-auto p-6 bg-night-800 rounded-2xl">
            <h2 className="text-lg font-bold mb-4">Motion Tracking (placeholder)</h2>
            <p className="text-sm text-night-500 mb-4">Implement your tracking UI here.</p>
            <div className="flex gap-3">
              <button onClick={handleReset} className="px-4 py-2 rounded border border-night-700">
                Reset
              </button>
            </div>
          </div>
        )}

        {currentStep === AppStep.PIPELINE && originalImages.length > 0 && (
          <StepPipelineComparison originalImages={originalImages} onBack={handleReset} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-night-800 py-6 text-center bg-night-900">
        <p className="text-xs text-night-700 font-mono">NIGHT VISION ENHANCEMENT SYSTEM • V2.0.0</p>
      </footer>
    </div>
  )
}

export default App
