/**
 * Renders the installer artwork sources to the 24-bit Windows bitmaps that
 * electron-builder's NSIS wizard consumes, plus enlarged PNG previews.
 *
 * One-off tooling, deliberately not a project dependency:
 *   npm install --no-save --no-package-lock @resvg/resvg-js
 *   node windows-installer/render.mjs
 *
 * ImageMagick's SVG delegate is not available in every environment, so resvg is
 * used for the raster step and ImageMagick only for the PNG -> 24-bit BMP encode.
 * The committed .bmp files are the build inputs; regeneration is only needed when
 * the .svg sources change.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const previewDir = path.join(here, 'previews');
mkdirSync(previewDir, { recursive: true });

const fontFiles = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
];

/** NSIS requires these exact pixel dimensions. */
const targets = [
  { svg: 'installer-sidebar.svg', bmp: 'installerSidebar.bmp', width: 164, height: 314, previewScale: 3 },
  { svg: 'installer-header.svg', bmp: 'installerHeader.bmp', width: 150, height: 57, previewScale: 5 },
];

function render(svgSource, fitWidth) {
  const renderer = new Resvg(svgSource, {
    fitTo: { mode: 'width', value: fitWidth },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'DejaVu Sans' },
  });
  return renderer.render().asPng();
}

for (const target of targets) {
  const svg = readFileSync(path.join(here, target.svg), 'utf8');

  // Exact-size raster for the wizard.
  const png = render(svg, target.width);
  const temporaryPng = path.join(previewDir, `${target.bmp}.native.png`);
  writeFileSync(temporaryPng, png);
  const bmpPath = path.join(here, target.bmp);
  execFileSync('convert', [temporaryPng, '-alpha', 'off', '-type', 'TrueColor', `BMP3:${bmpPath}`]);
  rmSync(temporaryPng, { force: true });

  // Enlarged preview so the artwork can actually be reviewed.
  const previewPng = render(svg, target.width * target.previewScale);
  const previewPath = path.join(previewDir, target.svg.replace(/\.svg$/, '-preview.png'));
  writeFileSync(previewPath, previewPng);

  console.log(`${target.bmp}: ${target.width}x${target.height} -> ${bmpPath}`);
  console.log(`  preview: ${previewPath}`);
}
