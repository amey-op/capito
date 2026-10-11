import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ManifestIcon {
  src: string;
  sizes: string;
  type?: string;
  purpose?: string;
}

const publicDir = join(process.cwd(), 'public');
const manifest = JSON.parse(readFileSync(join(publicDir, 'manifest.webmanifest'), 'utf8')) as {
  name: string;
  start_url: string;
  display: string;
  icons: ManifestIcon[];
};

describe('web app manifest', () => {
  it('names the app and opens standalone at /start', () => {
    expect(manifest.name).toBe('Capito');
    expect(manifest.start_url).toBe('/start');
    expect(manifest.display).toBe('standalone');
  });

  it('lists a 192 and a 512 icon', () => {
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('every listed icon exists in public/', () => {
    for (const icon of manifest.icons) {
      expect(existsSync(join(publicDir, icon.src.replace(/^\//, '')))).toBe(true);
    }
  });
});
