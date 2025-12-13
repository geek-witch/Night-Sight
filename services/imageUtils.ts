
/**
 * Utility service to handle image processing logic in the browser.
 * Uses OpenCV.js to replicate Python cv2 logic exactly.
 */

declare global {
  interface Window {
    cv: any;
    cvIsReady: boolean;
  }
}

// --- Core Image Data Helpers ---

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

/**
 * Checks if OpenCV is ready
 */
export const isOpenCVReady = () => {
  return !!(window.cv && window.cvIsReady);
};

/**
 * Waits for OpenCV to be ready
 */
export const waitForOpenCV = async (timeout = 10000): Promise<void> => {
  const start = Date.now();
  while (!isOpenCVReady()) {
    if (Date.now() - start > timeout) {
      throw new Error("OpenCV initialization timed out");
    }
    await new Promise(r => setTimeout(r, 100));
  }
};

/**
 * Helper to convert HTMLImageElement to OpenCV Mat
 */
const imgToMat = (img: HTMLImageElement): any => {
  const cv = window.cv;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context failed");
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  return cv.matFromImageData(imageData);
};

/**
 * Helper to convert OpenCV Mat to Data URL
 */
const matToUrl = (mat: any): string => {
  const cv = window.cv;
  const canvas = document.createElement('canvas');
  const w = mat.cols;
  const h = mat.rows;
  canvas.width = w;
  canvas.height = h;
  
  cv.imshow(canvas, mat);
  return canvas.toDataURL('image/jpeg', 0.9);
};

/**
 * Manual implementation of LUT (Look Up Table)
 * Replaces cv.LUT which is often missing or problematic in JS builds.
 */
const applyLutManual = (src: any, dst: any, lut: Uint8Array) => {
  // Ensure we are working with raw data
  // src.data and dst.data return an array
  const srcData = src.data;
  const dstData = dst.data;
  const len = srcData.length;
  
  for (let i = 0; i < len; i++) {
    dstData[i] = lut[srcData[i]];
  }
};

// --- Filters implementing exact Python Logic ---

/**
 * Filter 1: Full Enhancement
 * Python logic:
 * def enhancement_filter(img, gamma=1.8):
 *     # Input 'img' is BGR
 *     lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
 *     L,A,B = cv2.split(lab)
 *     clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
 *     L_clahe = clahe.apply(L)
 *     lab_clahe = cv2.merge((L_clahe,A,B))
 *     enhanced = cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2BGR)
 *
 *     # Gamma correction
 *     invGamma = 1.0/gamma
 *     table = np.array([(i/255.0)**invGamma*255 for i in np.arange(256)]).astype('uint8')
 *     gamma_corrected = cv2.LUT(enhanced, table)
 *
 * 
 *     return gamma_corrected # Returns BGR
 */
export const applyCompositeEnhancement = (img: HTMLImageElement): string => {
  const cv = window.cv;
  
  // Cleanups to ensure no memory leaks
  const matsToDelete: any[] = [];
  
  try {
    const src = imgToMat(img); matsToDelete.push(src); // RGBA
    const bgr = new cv.Mat(); matsToDelete.push(bgr);
    const lab = new cv.Mat(); matsToDelete.push(lab);
    const labPlanes = new cv.MatVector(); matsToDelete.push(labPlanes);
    const enhancedBgr = new cv.Mat(); matsToDelete.push(enhancedBgr);
    const gammaCorrectedBgr = new cv.Mat(); matsToDelete.push(gammaCorrectedBgr);
    const finalRgb = new cv.Mat(); matsToDelete.push(finalRgb);
    
    // 0. Convert RGBA -> BGR to match Python input format
    cv.cvtColor(src, bgr, cv.COLOR_RGBA2BGR);

    // 1. LAB + CLAHE
    // Python: lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    cv.cvtColor(bgr, lab, cv.COLOR_BGR2Lab);
    
    // Python: L,A,B = cv2.split(lab)
    cv.split(lab, labPlanes);
    
    let l_channel = labPlanes.get(0);
    
    // Python: clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    let clahe = new cv.CLAHE(3.0, new cv.Size(8, 8));
    clahe.apply(l_channel, l_channel);
    clahe.delete();
    
    labPlanes.set(0, l_channel);
    
    // Python: lab_clahe = cv2.merge((L_clahe,A,B))
    cv.merge(labPlanes, lab);
    
    // Python: enhanced = cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2BGR)
    cv.cvtColor(lab, enhancedBgr, cv.COLOR_Lab2BGR);
    l_channel.delete();

    // 2. Gamma Correction
    const gamma = 1.8;
    const invGamma = 1.0 / gamma;
    
    // Python: table = np.array([(i/255.0)**invGamma*255 ...]).astype('uint8')
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      // Use Math.floor to match numpy .astype('uint8') truncation
      let val = Math.pow(i / 255.0, invGamma) * 255;
      lut[i] = Math.floor(val); 
    }
    
    // Initialize gammaCorrected mat
    gammaCorrectedBgr.create(enhancedBgr.rows, enhancedBgr.cols, enhancedBgr.type());
    applyLutManual(enhancedBgr, gammaCorrectedBgr, lut);
    
    // Final Output: Convert BGR -> RGB for Browser Display
    // Note: Smoothing and Sharpening have been removed as per request
    cv.cvtColor(gammaCorrectedBgr, finalRgb, cv.COLOR_BGR2RGB);

    return matToUrl(finalRgb);

  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    matsToDelete.forEach(m => m.delete());
  }
};

/**
 * Filter 2: YUV Histogram Equalization
 * Python logic:
 * def selected_filters(img):
 *     # Input 'img' is RGB
 *     img_yuv = cv2.cvtColor(img, cv2.COLOR_RGB2YUV)
 *     img_yuv[:,:,0] = cv2.equalizeHist(img_yuv[:,:,0])
 *     results['hist_eq'] = cv2.cvtColor(img_yuv, cv2.COLOR_YUV2RGB)
 */
export const applyHistogramEqualization = (img: HTMLImageElement): string => {
  const cv = window.cv;
  const matsToDelete: any[] = [];

  try {
    const src = imgToMat(img); matsToDelete.push(src); // RGBA
    const rgb = new cv.Mat(); matsToDelete.push(rgb);
    const yuv = new cv.Mat(); matsToDelete.push(yuv);
    const yuvPlanes = new cv.MatVector(); matsToDelete.push(yuvPlanes);
    const result = new cv.Mat(); matsToDelete.push(result);

    // Ensure RGB input
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);

    // Python: img_yuv = cv2.cvtColor(img, cv2.COLOR_RGB2YUV)
    cv.cvtColor(rgb, yuv, cv.COLOR_RGB2YUV);
    
    // Python: img_yuv[:,:,0] = cv2.equalizeHist(img_yuv[:,:,0])
    cv.split(yuv, yuvPlanes);
    let y_channel = yuvPlanes.get(0);
    cv.equalizeHist(y_channel, y_channel);
    yuvPlanes.set(0, y_channel);
    cv.merge(yuvPlanes, yuv);
    
    // Python: results['hist_eq'] = cv2.cvtColor(img_yuv, cv2.COLOR_YUV2RGB)
    cv.cvtColor(yuv, result, cv.COLOR_YUV2RGB);
    
    y_channel.delete();
    
    return matToUrl(result);
  } finally {
    matsToDelete.forEach(m => m.delete());
  }
};

/**
 * Filter 3: Gamma Only
 * Python logic:
 * # Input 'img' is RGB
 * gamma = 1.8
 * invGamma = 1.0 / gamma
 * table = np.array(...).astype('uint8')
 * results['gamma'] = cv2.LUT(img, table)
 */
export const applyGamma = (img: HTMLImageElement, gamma: number): string => {
  const cv = window.cv;
  const matsToDelete: any[] = [];

  try {
    const src = imgToMat(img); matsToDelete.push(src);
    const rgb = new cv.Mat(); matsToDelete.push(rgb);
    const result = new cv.Mat(); matsToDelete.push(result);

    // Ensure RGB input
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    
    const invGamma = 1.0 / gamma;
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      // Matches python numpy astype('uint8') logic
      lut[i] = Math.floor(Math.pow(i / 255.0, invGamma) * 255);
    }
    
    result.create(rgb.rows, rgb.cols, rgb.type());
    applyLutManual(rgb, result, lut);
    
    return matToUrl(result);
  } finally {
    matsToDelete.forEach(m => m.delete());
  }
};
