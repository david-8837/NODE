# Windows installer artwork

The `.svg` files are the editable artwork sources. The matching `.bmp` files are the 24-bit Windows bitmaps consumed by electron-builder's NSIS wizard:

- `installerSidebar.bmp`: 164 × 314 px, shown on welcome and finish pages.
- `installerHeader.bmp`: 150 × 57 px, shown in the wizard header.

The installed application has no dependency on these files; they are only used when building the Windows installer.

`installer.nsh` supplies electron-builder's `customWelcomePage` hook: the assisted
installer template does not add an install welcome page by default. The standard
NSIS welcome page is skipped for silent installs; the rest of the installer and
uninstaller flow remains controlled by electron-builder.

After editing an SVG, render it at its native dimensions and export a 24-bit
uncompressed BMP (no alpha channel) to the matching bitmap filename. Verify the
result with the installer asset tests and check it in a Windows installer build.
