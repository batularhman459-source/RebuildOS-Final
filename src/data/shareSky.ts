import type { Sky } from '../core/sky';
import { STAR_SIZE } from '../core/sky';

/**
 * Your sky as a picture (1080 × 1350, the shape Instagram and WhatsApp show best), shared
 * through the phone's share sheet, or downloaded where sharing files isn't possible.
 */

const W = 1080;
const H = 1350;
const STAR = 'M12 2C12.6 8.2 15.8 11.4 22 12C15.8 12.6 12.6 15.8 12 22C11.4 15.8 8.2 12.6 2 12C8.2 11.4 11.4 8.2 12 2Z';
const FILL = { good: '#F49A70', okay: '#E8906A', rough: '#C98563', none: 'rgba(255,255,255,0.25)' } as const;

export function drawSky(sky: Sky, count: number, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#121110';
  c.fillRect(0, 0, W, H);
  const glow = c.createRadialGradient(W / 2, H * 0.52, 0, W / 2, H * 0.52, W * 0.75);
  glow.addColorStop(0, 'rgba(238,125,82,0.42)');
  glow.addColorStop(0.35, 'rgba(238,125,82,0.18)');
  glow.addColorStop(1, 'rgba(18,17,16,0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  // Fit the sky into the middle of the picture.
  const box = { x: 90, y: 330, w: W - 180, h: H - 560 };
  const scale = Math.min(box.w / width, box.h / height);
  const ox = box.x + (box.w - width * scale) / 2;
  const oy = box.y + (box.h - height * scale) / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy + y * scale;

  c.strokeStyle = 'rgba(255,227,204,0.22)';
  c.lineWidth = 2;
  for (const [a, b] of sky.links) {
    const p = sky.nodes[a]!;
    const q = sky.nodes[b]!;
    c.beginPath();
    c.moveTo(px(p.x), py(p.y));
    c.lineTo(px(q.x), py(q.y));
    c.stroke();
  }
  const path = new Path2D(STAR);
  for (const n of sky.nodes) {
    const size = (STAR_SIZE[n.kind] + (n.today && n.kind !== 'none' ? 8 : 0)) * scale;
    c.save();
    c.translate(px(n.x) - size / 2, py(n.y) - size / 2);
    c.scale(size / 24, size / 24);
    c.fillStyle = n.today && n.kind !== 'none' ? '#FFE3CC' : FILL[n.kind];
    c.fill(path);
    c.restore();
  }

  c.fillStyle = '#FFFFFF';
  c.font = '300 150px Sora, system-ui, sans-serif';
  c.fillText(String(count), 90, 230);
  const numberWidth = c.measureText(String(count)).width;
  c.font = '400 44px "Roboto Flex", system-ui, sans-serif';
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.fillText(count === 1 ? 'day counted' : 'days counted', 90 + numberWidth + 24, 228);
  c.fillStyle = 'rgba(255,255,255,0.74)';
  c.font = '400 36px "Roboto Flex", system-ui, sans-serif';
  c.fillText('Rough days count too.', 90, H - 110);
  c.fillStyle = '#FFFFFF';
  c.font = '600 40px Sora, system-ui, sans-serif';
  c.fillText('RebuildOS', 90, H - 160);
  return canvas;
}

export async function shareSky(sky: Sky, count: number, width: number, height: number): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const canvas = drawSky(sky, count, width, height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return 'cancelled';
  const file = new File([blob], 'my-sky.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My sky', text: `${count} days counted.` });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-sky.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
