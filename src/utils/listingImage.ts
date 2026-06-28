interface ListingImageInput {
  imageUrl?: string | null;
  images?: Array<string | undefined | null>;
  title?: string | null;
  category?: string | null;
}

const imagePalette = [
  ["#0f172a", "#38bdf8"],
  ["#1f2937", "#f59e0b"],
  ["#312e81", "#a78bfa"],
  ["#14532d", "#4ade80"],
  ["#7c2d12", "#fb7185"],
  ["#0f766e", "#22d3ee"],
];

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickText(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 3).join(" ").slice(0, 24) || "Item";
}

export function resolveListingImageUrl(input: ListingImageInput): string {
  const explicitImage = [input.imageUrl, ...(input.images ?? [])].find(
    (value): value is string => Boolean(value?.trim()),
  );
  if (explicitImage) {
    return explicitImage.trim();
  }

  const label = pickText(input.title?.trim() || input.category?.trim() || "Item");
  const palette = imagePalette[hashString(label) % imagePalette.length];
  const text = escapeXml(label);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="${text}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette[0]}" />
          <stop offset="100%" stop-color="${palette[1]}" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#bg)" rx="48" />
      <circle cx="680" cy="120" r="92" fill="rgba(255,255,255,0.10)" />
      <circle cx="130" cy="500" r="140" fill="rgba(255,255,255,0.08)" />
      <text x="64" y="332" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700">
        ${text}
      </text>
      <text x="64" y="392" fill="rgba(255,255,255,0.82)" font-family="Arial, Helvetica, sans-serif" font-size="26">
        Course marketplace item
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
