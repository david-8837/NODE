# Windows installer artwork

The `.svg` files are the editable artwork sources. The matching `.bmp` files are the
24-bit uncompressed Windows bitmaps consumed by electron-builder's NSIS wizard:

| File | Size | Where it appears |
|---|---|---|
| `installerSidebar.bmp` | 164 × 314 | Welcome page, finish page, uninstaller |
| `installerHeader.bmp` | 150 × 57 | Wizard page header |

The artwork is **monochrome** (black and white only). `tests/installerBranding.test.ts`
enforces the exact dimensions, 24-bit depth and the absence of any colour cast in
both the SVG sources and the decoded BMP pixels.

## Welcome page

`installer.nsh` defines the `customWelcomePage` macro and is wired up through
`build.nsis.include` in `package.json`. electron-builder's assisted installer emits
**no** welcome page unless that macro exists, so this file is what adds the branded
welcome screen. Its text reminds the user that profiles are preserved and that the
Micro Pad must be connected before the configurator unlocks.

The silent install used by CI (`/S`) skips the page, but makensis still compiles it,
so a syntax error fails the Windows build.

## Regenerating the bitmaps

Only needed when an `.svg` source changes. The renderer is one-off tooling and is
deliberately not a project dependency:

```bash
npm install --no-save --no-package-lock @resvg/resvg-js
node windows-installer/render.mjs
```

This writes both `.bmp` files at their exact required sizes and enlarged PNGs into
`previews/` for visual review. `resvg` is used because ImageMagick's SVG delegate is
missing in some environments; ImageMagick is still used for the PNG → 24-bit BMP
encode. DejaVu Sans is loaded explicitly so text renders without fontconfig.

The installed application has no dependency on these files; they are only used when
building the Windows installer.
