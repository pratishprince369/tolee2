/**
 * Generates an image file from a text-only post with a styled background
 * using pure HTML5 Canvas (zero external dependencies).
 */

export interface BackgroundStyle {
  id: string;
  name: string;
  bgCss: string; // CSS background for UI preview
  textColor: string;
  // Canvas rendering specs
  type: 'solid' | 'linear';
  colors: string[]; // For gradient [color1, color2] or solid [color1]
  angle?: number;   // 135 deg default
}

export const TEXT_CARD_BACKGROUNDS: BackgroundStyle[] = [
  {
    id: 'tolee-teal',
    name: 'Tolee Teal',
    bgCss: 'linear-gradient(135deg, #0a7c85 0%, #14b8a6 100%)',
    textColor: '#ffffff',
    type: 'linear',
    colors: ['#0a7c85', '#14b8a6'],
    angle: 135,
  },
  {
    id: 'dark-slate',
    name: 'Black Velvet',
    bgCss: '#18191a',
    textColor: '#ffffff',
    type: 'solid',
    colors: ['#18191a'],
  },
  {
    id: 'mint-breeze',
    name: 'Mint Breeze',
    bgCss: 'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)',
    textColor: '#ffffff',
    type: 'linear',
    colors: ['#0d9488', '#2dd4bf'],
    angle: 135,
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    bgCss: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
    textColor: '#ffffff',
    type: 'linear',
    colors: ['#f97316', '#ec4899'],
    angle: 135,
  },
  {
    id: 'neon-violet',
    name: 'Neon Violet',
    bgCss: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
    textColor: '#ffffff',
    type: 'linear',
    colors: ['#8b5cf6', '#d946ef'],
    angle: 135,
  },
  {
    id: 'crimson-red',
    name: 'Crimson Red',
    bgCss: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
    textColor: '#ffffff',
    type: 'linear',
    colors: ['#be123c', '#e11d48'],
    angle: 135,
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    bgCss: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
    textColor: '#ffffff',
    type: 'linear',
    colors: ['#1e3a8a', '#0284c7'],
    angle: 135,
  },
  {
    id: 'cosmic-dark',
    name: 'Cosmic Dark',
    bgCss: 'linear-gradient(135deg, #09090b 0%, #1e1b4b 100%)',
    textColor: '#ffffff',
    type: 'linear',
    colors: ['#09090b', '#1e1b4b'],
    angle: 135,
  },
  {
    id: 'mint-light',
    name: 'Soft Mint',
    bgCss: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
    textColor: '#0f766e',
    type: 'linear',
    colors: ['#f0fdfa', '#ccfbf1'],
    angle: 135,
  },
  {
    id: 'plain-white',
    name: 'Clean White',
    bgCss: '#ffffff',
    textColor: '#111827',
    type: 'solid',
    colors: ['#ffffff'],
  },
];

/**
 * Renders the text on canvas and returns a high-res JPEG File.
 */
export async function renderTextCardToBlob(
  text: string,
  style: BackgroundStyle,
  authorName?: string
): Promise<{ file: File; url: string }> {
  return new Promise((resolve, reject) => {
    try {
      const width = 1080;
      const height = 1080; // Standard 1:1 Instagram/Facebook style card
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      // 1. Draw Background
      if (style.type === 'solid') {
        ctx.fillStyle = style.colors[0] || '#18191a';
        ctx.fillRect(0, 0, width, height);
      } else {
        // Linear gradient (135deg: top-left to bottom-right)
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, style.colors[0]);
        gradient.addColorStop(1, style.colors[1] || style.colors[0]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Subtle ambient overlay or border if light
      if (style.id === 'plain-white' || style.id === 'mint-light') {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, width - 4, height - 4);
      }

      // 2. Compute dynamic font size based on text length
      const cleanText = (text || '').trim();
      const length = cleanText.length;

      let fontSize = 68;
      let lineHeight = 88;
      if (length > 250) {
        fontSize = 38;
        lineHeight = 52;
      } else if (length > 150) {
        fontSize = 46;
        lineHeight = 62;
      } else if (length > 70) {
        fontSize = 56;
        lineHeight = 74;
      }

      ctx.fillStyle = style.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

      // 3. Word wrapping
      const maxLineWidth = width - 160; // 80px padding on each side
      const paragraphs = cleanText.split('\n');
      const lines: string[] = [];

      for (const para of paragraphs) {
        if (!para.trim()) {
          lines.push('');
          continue;
        }
        const words = para.split(/\s+/);
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxLineWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
      }

      // 4. Calculate vertical start to center all text block
      const totalTextHeight = lines.length * lineHeight;
      let startY = (height - totalTextHeight) / 2 + lineHeight / 2;

      // Draw each line
      for (const line of lines) {
        ctx.fillText(line, width / 2, startY);
        startY += lineHeight;
      }

      // 5. Subtle Tolee footer watermark at bottom center
      ctx.save();
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = style.textColor === '#ffffff' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.35)';
      ctx.textAlign = 'center';
      ctx.fillText('tolee.in', width / 2, height - 48);
      ctx.restore();

      // 6. Convert canvas to blob & File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create image blob'));
            return;
          }
          const file = new File([blob], `tolee-text-card-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          const url = URL.createObjectURL(blob);
          resolve({ file, url });
        },
        'image/jpeg',
        0.95
      );
    } catch (err) {
      reject(err);
    }
  });
}
