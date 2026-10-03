import type { Block } from '@/lib/builder-types';

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function rgbToHex(rgb: string, fallback: string): string {
  const match = rgb.match(/[\d.]+/g);
  if (!match || match.length < 3) return fallback;
  const [r, g, b] = match.map(Number);
  return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')}`;
}

export interface ImportedCanvas {
  background: string;
  blocks: Block[];
  widthPx: number;
  heightPx: number;
}

/** Renders the given HTML off-screen, measures every meaningful element, and
 *  turns it into a flat list of independently movable text/image blocks. */
export async function importHtmlToBlocks(html: string, canvasWidthPx: number): Promise<ImportedCanvas> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-99999px';
  iframe.style.top = '0';
  iframe.style.width = `${canvasWidthPx}px`;
  iframe.style.height = '100px';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Failed to load HTML for import.'));
      iframe.srcdoc = html;
    });

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !doc.body || !win) {
      throw new Error('Could not read the generated HTML.');
    }

    // Give images a moment to lay out before measuring.
    await new Promise((resolve) => setTimeout(resolve, 200));

    const fullHeight = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, 100);
    iframe.style.height = `${fullHeight}px`;
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const bodyBg = win.getComputedStyle(doc.body).backgroundColor;
    const background = rgbToHex(bodyBg, '#ffffff');

    const blocks: Block[] = [];
    let z = 1;

    const toBase = (rect: DOMRect) => ({
      x: pct(rect.left, canvasWidthPx),
      y: pct(rect.top, fullHeight),
      width: pct(rect.width, canvasWidthPx),
      height: pct(rect.height, fullHeight),
    });

    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'NOSCRIPT']);

    function walk(el: Element) {
      for (const child of Array.from(el.children)) {
        if (SKIP_TAGS.has(child.tagName)) continue;

        if (child.tagName === 'IMG') {
          const img = child as HTMLImageElement;
          const rect = img.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const style = win!.getComputedStyle(img);
            blocks.push({
              id: newId(),
              type: 'image',
              ...toBase(rect),
              zIndex: z++,
              content: img.src,
              alt: img.alt || '',
              borderRadius: parseFloat(style.borderRadius) || 0,
            });
          }
          continue;
        }

        const hasDirectText = Array.from(child.childNodes).some(
          (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim().length > 0
        );
        const hasImgDescendant = !!child.querySelector('img');

        if (hasDirectText && !hasImgDescendant) {
          const rect = child.getBoundingClientRect();
          const text = (child as HTMLElement).innerText?.trim();
          if (rect.width > 0 && rect.height > 0 && text) {
            const style = win!.getComputedStyle(child as HTMLElement);
            blocks.push({
              id: newId(),
              type: 'text',
              ...toBase(rect),
              zIndex: z++,
              content: text,
              fontSize: parseFloat(style.fontSize) || 16,
              textAlign: (['left', 'center', 'right'].includes(style.textAlign) ? style.textAlign : 'left') as
                | 'left'
                | 'center'
                | 'right',
              color: rgbToHex(style.color, '#222222'),
            });
            continue;
          }
        }

        walk(child);
      }
    }

    walk(doc.body);

    return { background, blocks, widthPx: canvasWidthPx, heightPx: fullHeight };
  } finally {
    document.body.removeChild(iframe);
  }
}
