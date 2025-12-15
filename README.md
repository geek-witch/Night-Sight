#  README.md 
## 🌙 NightSight Enhancer

A machine learning–powered tool designed to enhance low-light images using advanced processing, feature extraction, and object detection pipelines.

---

## 🚀 Features

* Low-light image enhancement
* YOLO-based object detection
* Video frame processing
* Feature extraction
* Model comparison & performance metrics
* Clean UI with multi-step workflow
* Upload → Process → Detect 

---

## 🛠️ Tech Stack

**Frontend:** React + TypeScript + Vite
**ML Modules:** Custom YOLO Model Loader, Feature Extractor
**Workers:** Web Workers for parallel processing
**Utilities:** Image enhancement tools, metrics calculator

---

## 📂 Project Structure

```
├── components/
├── services/
│   ├── imageUtils.ts
│   ├── yoloDetection.ts
│   ├── featureExtraction.ts
│   ├── modelTraining.ts
│   └── pipelineService.ts
├── App.tsx
├── index.tsx
├── metadata.json
└── README.md
```

---

## 🔧 How to Run Locally

### 1. Install dependencies

```
npm install
```

### 2. Start development server

```
npm run dev
```

### 3. Build for production

```
npm run build
```

---

## 📸 Usage Steps

1. Upload image
2. Choose processing pipeline
3. Run enhancement
4. Run object detection
5. Export output

---

## 🤝 Contributing

Pull requests are welcome!


