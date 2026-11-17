; NODE studio — custom NSIS pages.
;
; electron-builder's assisted installer does not insert a welcome page of its own;
; it only emits one when this `customWelcomePage` macro is defined. The artwork on
; that page is installerSidebar.bmp (164 x 314), set via nsis.installerSidebar.

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to NODE studio"
  !define MUI_WELCOMEPAGE_TITLE_3LINES
  !define MUI_WELCOMEPAGE_TEXT "This will install NODE studio on your computer.$\r$\n$\r$\nUpdating an existing installation? Your profiles, key assignments and settings are kept.$\r$\n$\r$\nBefore you start configuring, connect your Micro Pad with a USB cable. The configurator stays locked until the pad is detected and its firmware is verified.$\r$\n$\r$\nClick Next to continue."

  !insertmacro MUI_PAGE_WELCOME

  ; Undefine so these strings cannot leak into the uninstaller welcome page.
  ; Guarded because MUI may already have consumed them.
  !ifdef MUI_WELCOMEPAGE_TEXT
    !undef MUI_WELCOMEPAGE_TEXT
  !endif
  !ifdef MUI_WELCOMEPAGE_TITLE_3LINES
    !undef MUI_WELCOMEPAGE_TITLE_3LINES
  !endif
  !ifdef MUI_WELCOMEPAGE_TITLE
    !undef MUI_WELCOMEPAGE_TITLE
  !endif
!macroend
