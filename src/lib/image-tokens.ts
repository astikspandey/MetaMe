export interface ImageToken {
  raw: string;
  query: string;
  x?: number;
  y?: number;
  r?: number;
}

// {img:"query"} or {img:"query" loc:"97(x)","100(y)","30(r)"}
const IMG_TOKEN_RE = /\{img:"([^"]+)"(?:\s*loc:"(-?[\d.]+)\(x\)"\s*,\s*"(-?[\d.]+)\(y\)"\s*,\s*"(-?[\d.]+)\(r\)")?\}/g;

export function extractImageTokens(text: string): ImageToken[] {
  const tokens: ImageToken[] = [];
  for (const match of text.matchAll(IMG_TOKEN_RE)) {
    tokens.push({
      raw: match[0],
      query: match[1],
      x: match[2] !== undefined ? Number(match[2]) : undefined,
      y: match[3] !== undefined ? Number(match[3]) : undefined,
      r: match[4] !== undefined ? Number(match[4]) : undefined,
    });
  }
  return tokens;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildImgTag(token: ImageToken, imageUrl: string, alt: string, credit?: string): string {
  const safeAlt = escapeAttr(alt);
  const creditAttr = credit ? ` data-credit="${escapeAttr(credit)}"` : '';
  if (token.x !== undefined && token.y !== undefined) {
    const rotation = token.r ?? 0;
    return `<img src="${imageUrl}" alt="${safeAlt}"${creditAttr} style="position:absolute;left:${token.x}%;top:${token.y}%;transform:translate(-50%,-50%) rotate(${rotation}deg);max-width:35%;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);" />`;
  }
  return `<img src="${imageUrl}" alt="${safeAlt}"${creditAttr} style="max-width:100%;border-radius:8px;margin:12px 0;" />`;
}

/** Ensures absolutely-positioned image tokens anchor to the full page. */
export function ensureRelativeBody(html: string): string {
  const style = '<style>body{position:relative;}</style>';
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${style}</head>`);
  }
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${style}`);
  }
  return `${style}${html}`;
}
