/* grid_macro_1.h - Layout Macro Definition */
#pragma once

#include "quantum.h"

#define LAYOUT_grid_macro_1( \
    enc_sw, \
    k00, k01, k02, \
    k10, k11, k12, \
    k20, k21, k22  \
) { \
    { k00,    k01,    k02    }, \
    { k10,    k11,    k12    }, \
    { k20,    k21,    k22    }, \
    { enc_sw, KC_NO,  KC_NO  }  \
}
