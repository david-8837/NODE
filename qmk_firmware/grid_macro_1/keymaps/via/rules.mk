# VIA Keymap Rules
VIA_ENABLE = yes
ENCODER_MAP_ENABLE = yes

# Explicit opt-in for laboratory builds only. Never enable in releases until
# flash layout, migration, firmware build, and physical recovery are validated.
ifeq ($(strip $(NODE_EXPERIMENTAL_LAYER_LIGHTING)),yes)
    OPT_DEFS += -DNODE_EXPERIMENTAL_LAYER_LIGHTING
    LDFLAGS += -Wl,--defsym=FLASH_LEN=0x1fc000
    SRC += lighting_store.c lighting_controller.c lighting_protocol.c lighting_rp2040_flash.c lighting_rp2040_hardware.c lighting_qmk_hooks.c
endif
