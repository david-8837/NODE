/**
 * Grey/white rendering of the home-screen Micro Pad's geometry.
 * Shared by the header and welcome/finish sidebar so neither can drift into a
 * different enclosure or key layout. The React connection screen reads the same
 * JSON geometry. No dependency on the interactive home-screen component.
 */
export function homeMicroPadMarkup(geometry) {
  const { case: shell, plate, indicator, dial, keys } = geometry;
  const lines = [
    `<rect data-part="case" x="${shell.x}" y="${shell.y}" width="${shell.width}" height="${shell.height}" rx="${shell.radius}" fill="#ffffff" stroke="#aaaaaa" stroke-width="2"/>`,
    `<rect data-part="inner-frame" x="${plate.x}" y="${plate.y}" width="${plate.width}" height="${plate.height}" rx="${plate.radius}" fill="#ebebeb"/>`,
    `<circle data-part="status-light" cx="${indicator.cx}" cy="${indicator.cy}" r="${indicator.radius}" fill="#888888"/>`,
    `<circle data-part="dial" cx="${dial.cx}" cy="${dial.cy}" r="${dial.radius}" fill="#fafafa" stroke="#999999" stroke-width="2"/>`,
    `<line data-part="dial-marker" x1="${dial.cx - dial.markerHalfLength}" y1="${dial.cy}" x2="${dial.cx + dial.markerHalfLength}" y2="${dial.cy}" stroke="#999999" stroke-width="2" stroke-linecap="round"/>`,
  ];
  for (const y of keys.rows) {
    for (const x of keys.columns) {
      lines.push(`<rect data-part="key" x="${x}" y="${y}" width="${keys.width}" height="${keys.height}" rx="${keys.radius}" fill="#ffffff" stroke="#aaaaaa" stroke-width="2"/>`);
    }
  }
  return lines.join('\n');
}

/** Refresh the marked group in an editable SVG without touching its typography. */
export function syncDeviceArtwork(svg, geometry) {
  const pattern = /(<g id="micro-pad"[^>]*>)[\s\S]*?(\n\s*<\/g>)/;
  if (!pattern.test(svg)) throw new Error('SVG is missing the micro-pad artwork group');
  return svg.replace(pattern, (_, open, close) => `${open}\n${homeMicroPadMarkup(geometry)}${close}`);
}
