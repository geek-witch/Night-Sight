"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "./Button"
import type { ProcessedImage } from "../types"
import * as ImageUtils from "../services/imageUtils"

interface StepProcessProps {
  originalImageSrcs: string[]
  onSelectResult: (image: ProcessedImage, originalSrc: string) => void
  selectedCount: number
  onConfirmSelection: () => void
  onRemoveSelected: (index: number) => void
  onClearSelection: () => void
  onBack: () => void
}

interface ImageGroup {
  index: number
  originalSrc: string
  results: ProcessedImage[]
}

export const StepProcess: React.FC<StepProcessProps> = ({
  originalImageSrcs,
  onSelectResult,
  selectedCount,
  onConfirmSelection,
  onRemoveSelected,
  onClearSelection,
  onBack,
}) => {
  const [processing, setProcessing] = useState(true)
  const [imageGroups, setImageGroups] = useState<ImageGroup[]>([])
  const [status, setStatus] = useState("LOADING LIBRARIES...")
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const processImages = async () => {
      try {
        setStatus("INITIALIZING OPENCV...")
        await ImageUtils.waitForOpenCV()

        const groups: ImageGroup[] = []

        for (let i = 0; i < originalImageSrcs.length; i++) {
          const src = originalImageSrcs[i]
          setStatus(`PROCESSING IMAGE ${i + 1}/${originalImageSrcs.length}...`)

          const img = await ImageUtils.loadImage(src)

          const enhancedUrl = ImageUtils.applyCompositeEnhancement(img)
          const histUrl = ImageUtils.applyHistogramEqualization(img)
          const gammaUrl = ImageUtils.applyGamma(img, 1.8)

          groups.push({
            index: i,
            originalSrc: src,
            results: [
              {
                id: `enhancement-${i}`,
                label: "Full Enhancement",
                description: "LAB CLAHE + Gamma",
                dataUrl: enhancedUrl,
              },
              {
                id: `hist_eq-${i}`,
                label: "YUV Histogram Eq",
                description: "Equalizes Y-channel",
                dataUrl: histUrl,
              },
              {
                id: `gamma-${i}`,
                label: "Gamma Correction",
                description: "Brightness (γ=1.8)",
                dataUrl: gammaUrl,
              },
            ],
          })
        }

        setImageGroups(groups)
      } catch (err) {
        console.error("Processing failed", err)
        setStatus("ERROR: PROCESSING FAILED")
      } finally {
        setProcessing(false)
      }
    }

    setTimeout(processImages, 100)
  }, [originalImageSrcs])

  const handleSelectToggle = (image: ProcessedImage, originalSrc: string) => {
    if (selectedResultIds.has(image.id)) {
      const newSelected = new Set(selectedResultIds)
      newSelected.delete(image.id)
      setSelectedResultIds(newSelected)
    } else {
      const newSelected = new Set(selectedResultIds)
      newSelected.add(image.id)
      setSelectedResultIds(newSelected)
      onSelectResult(image, originalSrc)
    }
  }

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <div className="w-16 h-16 border-4 border-vision-500/30 border-t-vision-500 rounded-full animate-spin mb-4"></div>
        <p className="font-mono text-vision-500 animate-pulse">{status}</p>
      </div>
    )
  }

  return (
    <div className="w-full animate-fadeIn pb-12">
      <div className="flex justify-between items-center mb-6 sticky top-16 bg-night-900/95 z-40 py-4 border-b border-night-800">
        <h2 className="text-xl font-bold font-mono text-white">
          <span className="text-vision-500 mr-2">BATCH PROCESS:</span>
          {originalImageSrcs.length} IMAGE{originalImageSrcs.length > 1 ? "S" : ""} DETECTED
          {selectedCount > 0 && <span className="text-vision-400 text-sm ml-4">({selectedCount} selected)</span>}
        </h2>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <>
              <Button variant="primary" onClick={onConfirmSelection} className="text-xs">
                Continue with {selectedCount}
              </Button>
              <Button variant="secondary" onClick={onClearSelection} className="text-xs">
                Clear
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={onBack} className="text-xs">
            New Upload
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-16">
        {imageGroups.map((group) => (
          <div key={group.index} className="space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-px bg-night-700 flex-grow"></div>
              <span className="font-mono text-gray-500 text-sm">SOURCE STREAM {group.index + 1}</span>
              <div className="h-px bg-night-700 flex-grow"></div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Original Image Card */}
              <div className="xl:col-span-1">
                <div className="bg-night-800 rounded-lg p-2 border-2 border-night-700 h-full flex flex-col shadow-lg">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <h3 className="text-gray-400 font-mono text-sm uppercase tracking-wider">Original</h3>
                    <span className="text-[10px] bg-night-900 px-2 py-0.5 rounded text-gray-500">RAW</span>
                  </div>
                  <div className="relative flex-grow bg-black rounded overflow-hidden h-96">
                    <img
                      src={group.originalSrc || "/placeholder.svg"}
                      alt="Original"
                      className="w-full h-full object-contain absolute inset-0"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Results Cards */}
              <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                {group.results.map((result) => (
                  <div
                    key={result.id}
                    className="bg-night-800 rounded-lg p-2 border border-vision-500/30 hover:border-vision-500 transition-all flex flex-col group shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                  >
                    <div className="flex justify-between items-start mb-2 px-2">
                      <h3
                        className="text-vision-400 font-mono text-sm font-bold uppercase truncate pr-2"
                        title={result.label}
                      >
                        {result.label}
                      </h3>
                    </div>

                    <div className="bg-black rounded border border-night-700 mb-3 overflow-hidden relative h-96">
                      <img
                        src={result.dataUrl || "/placeholder.svg"}
                        alt={result.label}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="mt-auto px-2 pb-2">
                      <p className="text-xs text-gray-400 mb-3 leading-tight font-mono border-b border-night-700 pb-2">
                        {result.description}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <a
                          href={result.dataUrl}
                          download={`night_vision_${result.id}.jpg`}
                          className="bg-night-700 text-gray-300 hover:text-white hover:bg-night-600 border border-night-600 rounded-md text-sm py-2.5 flex items-center justify-center transition-colors font-semibold"
                        >
                          Download
                        </a>
                        <button
                          onClick={() => handleSelectToggle(result, group.originalSrc)}
                          className={`rounded-md text-sm py-2.5 font-bold uppercase transition-all border ${
                            selectedResultIds.has(result.id)
                              ? "bg-vision-500 text-black border-vision-500"
                              : "bg-vision-500/10 text-vision-500 hover:bg-vision-500/20 border-vision-500"
                          }`}
                        >
                          {selectedResultIds.has(result.id) ? "✓ Selected" : "Select"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
