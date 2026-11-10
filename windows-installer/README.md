# Windows installer artwork

The `.svg` files are the editable artwork sources. The matching `.bmp` files are the 24-bit Windows bitmaps consumed by electron-builder's NSIS wizard:

- `installerSidebar.bmp`: 164 × 314 px, shown on welcome and finish pages.
- `installerHeader.bmp`: 150 × 57 px, shown in the wizard header.

The installed application has no dependency on these files; they are only used when building the Windows installer.
