; electron-builder's assisted template includes a welcome page only when this
; macro is defined. Standard MUI pages are skipped automatically for /S installs.
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to NØDE Studio"
  !define MUI_WELCOMEPAGE_TEXT "Your keys. Your flow.$\r$\n$\r$\nSet up Grid Macro 1 Studio to configure your macropad, create profiles, and make your workspace your own.$\r$\n$\r$\nYour existing profiles and settings will be kept when you update.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend
