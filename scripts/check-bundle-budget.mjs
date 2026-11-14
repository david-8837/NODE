import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outputDirectory = path.resolve('dist');
const appGzipBudgetBytes = 200 * 1024;
const totalGzipBudgetBytes = 2.5 * 1024 * 1024;

function findJavaScriptAssets(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findJavaScriptAssets(entryPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
  });
}

function findInlineScripts(html) {
  const scripts = [];
  const lowerHtml = html.toLowerCase();
  const closingTag = '</script>';
  let cursor = 0;

  while (cursor < html.length) {
    const start = lowerHtml.indexOf('<script', cursor);
    if (start === -1) break;
    const openingEnd = lowerHtml.indexOf('>', start);
    if (openingEnd === -1) break;
    const closingStart = lowerHtml.indexOf(closingTag, openingEnd + 1);
    if (closingStart === -1) break;

    const openingTag = lowerHtml
      .slice(start, openingEnd + 1)
      .split(' ')
      .join('')
      .split('\n')
      .join('')
      .split('\t')
      .join('')
      .split('\r')
      .join('');
    const body = html.slice(openingEnd + 1, closingStart);
    if (!openingTag.includes('src=') && body.trim()) scripts.push(body);
    cursor = closingStart + closingTag.length;
  }

  return scripts;
}

if (!statSync(outputDirectory, { throwIfNoEntry: false })?.isDirectory()) {
  console.error('Production output is missing; run `npm run build` first.');
  process.exit(1);
}

const javascriptAssets = findJavaScriptAssets(outputDirectory);
if (javascriptAssets.length === 0) {
  console.error(`No JavaScript assets found in ${outputDirectory}.`);
  process.exit(1);
}

const results = javascriptAssets.map((filePath) => {
  const sourceBytes = readFileSync(filePath);
  return {
    file: path.relative(outputDirectory, filePath),
    sourceBytes: sourceBytes.length,
    gzipBytes: gzipSync(sourceBytes, { level: 9 }).length,
  };
});

const htmlPath = path.join(outputDirectory, 'index.html');
if (statSync(htmlPath, { throwIfNoEntry: false })?.isFile()) {
  const inlineScripts = findInlineScripts(readFileSync(htmlPath, 'utf8'));
  inlineScripts.forEach((script, index) => {
    const sourceBytes = Buffer.from(script);
    results.push({
      file: `index.html#inline-script-${index + 1}`,
      sourceBytes: sourceBytes.length,
      gzipBytes: gzipSync(sourceBytes, { level: 9 }).length,
    });
  });
}

const totalGzipBytes = results.reduce((sum, asset) => sum + asset.gzipBytes, 0);
const appGzipBytes = results
  .filter((asset) => asset.file.startsWith('assets/') && !asset.file.startsWith('assets/vendor-'))
  .reduce((sum, asset) => sum + asset.gzipBytes, 0);

for (const asset of results) {
  console.log(
    `dist/${asset.file}: ${(asset.sourceBytes / 1024).toFixed(1)} KiB raw, ` +
      `${(asset.gzipBytes / 1024).toFixed(1)} KiB gzip`
  );
}
console.log(
  `App bundle gzip: ${(appGzipBytes / 1024).toFixed(1)} / ` +
    `${(appGzipBudgetBytes / 1024).toFixed(0)} KiB`
);
console.log(
  `Total shipped JavaScript gzip: ${(totalGzipBytes / 1024 / 1024).toFixed(2)} / ` +
    `${(totalGzipBudgetBytes / 1024 / 1024).toFixed(1)} MiB`
);

if (appGzipBytes > appGzipBudgetBytes) {
  console.error('Application bundle gzip budget exceeded.');
  process.exitCode = 1;
}
if (totalGzipBytes > totalGzipBudgetBytes) {
  console.error('Total shipped JavaScript gzip budget exceeded.');
  process.exitCode = 1;
}
