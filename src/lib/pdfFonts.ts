// Persian font loader for jsPDF
// Uses Vazirmatn font for proper Persian/Arabic rendering

const VAZIRMATN_FONT_URL = 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/ttf/Vazirmatn-Regular.ttf';

let fontBase64Cache: string | null = null;

export async function loadVazirmatnFont(): Promise<string> {
  if (fontBase64Cache) {
    return fontBase64Cache;
  }

  try {
    const response = await fetch(VAZIRMATN_FONT_URL);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    fontBase64Cache = base64;
    return base64;
  } catch (error) {
    console.error('Failed to load Vazirmatn font:', error);
    throw error;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function registerVazirmatnFont(doc: any, fontBase64: string): void {
  // Add the font to the VFS (Virtual File System)
  doc.addFileToVFS('Vazirmatn-Regular.ttf', fontBase64);
  // Register the font
  doc.addFont('Vazirmatn-Regular.ttf', 'Vazirmatn', 'normal');
}

// Utility to reverse Persian text for RTL rendering in jsPDF
// jsPDF doesn't support RTL natively, so we need to reverse the text
export function prepareRtlText(text: string): string {
  if (!text) return '';
  
  // Check if text contains RTL characters
  const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (!rtlRegex.test(text)) {
    return text;
  }
  
  // Split by spaces to preserve word boundaries, then reverse
  const words = text.split(' ');
  return words.reverse().join(' ');
}
