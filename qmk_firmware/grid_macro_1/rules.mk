# rules.mk - QMK Native RP2040 Build Configuration for Grid Macro 1 (Ultra-Low Latency)
MCU = RP2040
BOOTLOADER = rp2040

# Ultra-Low Latency Eager Debouncing (0.0ms Keypress Latency)
DEBOUNCE_TYPE = sym_eager_pr

# Build Options
BOOTMAGIC_ENABLE = yes       # Virtual DIP switch configuration
MOUSEKEY_ENABLE = yes        # Mouse keys
EXTRAKEY_ENABLE = yes        # Audio control and System control
CONSOLE_ENABLE = no          # Console for debug
COMMAND_ENABLE = no          # Commands for debug and configuration
NKRO_ENABLE = yes            # USB N-Key Rollover
BACKLIGHT_ENABLE = no        # Custom matrix backlight
RGBLIGHT_ENABLE = yes        # Enable WS2812 RGB underglow/indicator
RGBLIGHT_DRIVER = ws2812     # Native RP2040 PIO WS2812 driver
WS2812_DRIVER = vendor       # RP2040 PIO driver
ENCODER_ENABLE = yes         # Hardware Quadrature Encoder
RAW_ENABLE = yes             # Raw HID for Web Configurator / VIA live updates
VIA_ENABLE = yes             # VIA Configurator support
DYNAMIC_KEYMAP_ENABLE = yes  # Dynamic EEPROM keymap
LTO_ENABLE = yes             # Link Time Optimization for compact binary
