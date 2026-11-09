import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  X,
  Search,
} from 'lucide-react';

type KeySlotId =
  | 'dial-tl'
  | 'r1c2'
  | 'r1c3'
  | 'knob-tr'
  | 'r2c1'
  | 'r2c2'
  | 'r2c3'
  | 'r2c4'
  | 'r3c1'
  | 'r3c2'
  | 'r3c3'
  | 'r3c4'
  | 'btn-bl'
  | 'r4c2'
  | 'r4c3'
  | 'r4c4';

type MappingTabId = 'Basic' | 'Action' | 'Multi-A' | 'Smart-A';
type EncoderSubActionId = 'cw' | 'press' | 'ccw';

interface EncoderSubBinding {
  label: string;
  binding: string;
}

interface KeyAssignment {
  label: string;
  actionType:
    | 'Basic input'
    | 'Shortcut'
    | 'Multi-step action'
    | 'Smart Action'
    | 'Layer Cycle';
  binding: string;
  iconId?: string;
  encoderActions?: Record<EncoderSubActionId, EncoderSubBinding>;
}

type LayerKeymap = Record<KeySlotId, KeyAssignment>;

function formatEncoderShortLabel(text: string): string {
  const clean = text.trim();
  if (!clean) return '—';
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 2).toLowerCase()}...`;
}

function getEncoderActions(
  assignment: KeyAssignment,
  slotId: KeySlotId
): Record<EncoderSubActionId, EncoderSubBinding> {
  if (assignment.encoderActions) {
    return assignment.encoderActions;
  }
  if (slotId === 'dial-tl') {
    return {
      cw: { label: 'vo...', binding: 'volume +' },
      press: { label: 'pl...', binding: 'play' },
      ccw: { label: 'vo...', binding: 'volume -' },
    };
  }
  return {
    cw: { label: 'vo...', binding: 'volume +' },
    press: { label: 'pl...', binding: 'play' },
    ccw: { label: 'vo...', binding: 'volume -' },
  };
}

interface ProfileData {
  id: string;
  name: string;
  color: string;
  layers: LayerKeymap[];
}

interface PresetItem {
  id: string;
  title: string;
  description: string;
  author: string;
  hasPreview: boolean;
  layerKeymap: LayerKeymap;
}

interface BasicTileItem {
  id: string;
  top?: string;
  main: string;
  listLabel?: string;
  macropadLabel: string;
  isClearIcon?: boolean;
  arrowDir?: 'right' | 'left' | 'down' | 'up';
  iconId?: string;
  emoji?: string;
}

type MultiGestureKey = 'onTap' | 'doubleTap' | 'onHold' | 'tapHold';
type SmartActionSubTab = 'Text' | 'Cmd' | 'Web' | 'App';

function formatCustomTileText(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    const line1 = words[0].length > 7 ? `${words[0].slice(0, 5)}..` : words[0];
    const rest = words.slice(1).join(' ');
    const line2 = rest.length > 6 ? `${rest.slice(0, 5)}..` : rest;
    return `${line1}\n${line2}`;
  }
  const single = words[0] || 'Action';
  return single.length > 7 ? `${single.slice(0, 5)}..` : single;
}

const SELECTABLE_ICON_LIST: { id: string; keywords: string }[] = [
  { id: 'copy-plus', keywords: 'copy duplicate plus add layer' },
  { id: 'layers-plus', keywords: 'layers stack plus add' },
  { id: 'plus-square', keywords: 'plus add new square' },
  { id: 'stop-square', keywords: 'stop square media' },
  { id: 'rows-two', keywords: 'rows pause bars list' },
  { id: 'type-square', keywords: 'text type font t' },
  { id: 'diamonds', keywords: 'diamonds grid component' },
  { id: 'circle-fill', keywords: 'circle record dot' },
  { id: 'square-fill', keywords: 'square box' },
  { id: 'globe', keywords: 'globe web browser internet url' },
  { id: 'sparkles', keywords: 'sparkles magic smart ai star' },
  { id: 'play-square', keywords: 'play video media square' },
  { id: 'image', keywords: 'image photo picture gallery' },
  { id: 'refresh', keywords: 'refresh reload sync rotate' },
  { id: 'arrow-left', keywords: 'arrow left back previous' },
  { id: 'arrow-right', keywords: 'arrow right next forward' },
  { id: 'grid-four', keywords: 'grid dashboard apps' },
  { id: 'lock', keywords: 'lock security privacy' },
  { id: 'chat-bubble', keywords: 'chat message comment' },
  { id: 'clock', keywords: 'clock time timer history' },
  { id: 'pause-circle', keywords: 'pause media wait' },
  { id: 'zap', keywords: 'zap bolt lightning flash action' },
  { id: 'maximize', keywords: 'maximize fullscreen expand' },
  { id: 'apps-plus', keywords: 'apps grid add widget' },
  { id: 'hexagon-nut', keywords: 'settings gear config nut' },
  { id: 'minimize', keywords: 'minimize shrink window' },
  { id: 'moon', keywords: 'moon dark night sleep' },
  { id: 'framer-bolt', keywords: 'framer bolt design' },
  { id: 'database', keywords: 'database storage server' },
  { id: 'play-triangle', keywords: 'play start run triangle' },
  { id: 'num-0', keywords: '0 zero number' },
  { id: 'num-1', keywords: '1 one number' },
  { id: 'num-2', keywords: '2 two number' },
  { id: 'num-3', keywords: '3 three number' },
  { id: 'num-4', keywords: '4 four number' },
  { id: 'num-5', keywords: '5 five number' },
  { id: 'num-6', keywords: '6 six number' },
  { id: 'num-7', keywords: '7 seven number' },
  { id: 'num-8', keywords: '8 eight number' },
  { id: 'num-9', keywords: '9 nine number' },
  { id: 'terminal', keywords: 'terminal command cmd shell' },
  { id: 'volume', keywords: 'volume audio sound speaker' },
];

const SELECTABLE_EMOJI_LIST: { emoji: string; keywords: string }[] = [
  { emoji: '🚀', keywords: 'rocket launch fast app' },
  { emoji: '⚡', keywords: 'zap bolt lightning fast' },
  { emoji: '🔥', keywords: 'fire hot trend' },
  { emoji: '✨', keywords: 'sparkles magic clean' },
  { emoji: '🎯', keywords: 'target goal focus' },
  { emoji: '💡', keywords: 'idea bulb light' },
  { emoji: '🎨', keywords: 'art design palette color' },
  { emoji: '🎵', keywords: 'music note audio song' },
  { emoji: '🎧', keywords: 'headphones audio listen' },
  { emoji: '🎬', keywords: 'video movie clapper cut' },
  { emoji: '📸', keywords: 'camera screenshot photo' },
  { emoji: '💻', keywords: 'laptop computer code dev' },
  { emoji: '🖥️', keywords: 'desktop monitor screen' },
  { emoji: '⌨️', keywords: 'keyboard type key' },
  { emoji: '🖱️', keywords: 'mouse click cursor' },
  { emoji: '🕹️', keywords: 'joystick game control' },
  { emoji: '🎮', keywords: 'gamepad controller play' },
  { emoji: '📁', keywords: 'folder file directory' },
  { emoji: '📌', keywords: 'pin bookmark save' },
  { emoji: '🔍', keywords: 'search find zoom' },
  { emoji: '🔒', keywords: 'lock secure password' },
  { emoji: '🔓', keywords: 'unlock open' },
  { emoji: '🔔', keywords: 'bell notification alert' },
  { emoji: '⏱️', keywords: 'stopwatch timer speed' },
  { emoji: '✅', keywords: 'check done complete' },
  { emoji: '⭐', keywords: 'star favorite bookmark' },
  { emoji: '❤️', keywords: 'heart like love' },
  { emoji: '💎', keywords: 'diamond gem premium' },
  { emoji: '🧠', keywords: 'brain ai smart think' },
  { emoji: '🤖', keywords: 'robot bot automation' },
  { emoji: '🛠️', keywords: 'tools build settings' },
  { emoji: '⚙️', keywords: 'gear settings config' },
  { emoji: '🌐', keywords: 'globe web internet browser' },
  { emoji: '📡', keywords: 'satellite stream broadcast' },
  { emoji: '🔋', keywords: 'battery power energy' },
  { emoji: '☕', keywords: 'coffee break cup' },
];

interface BasicSection {
  title: string;
  listPreview: string;
  items: BasicTileItem[];
}

const BASIC_KEY_SECTIONS: BasicSection[] = [
  {
    title: 'Alphanumerics',
    listPreview: '[ blank, A, B, C, D, E... ]',
    items: [
      { id: 'none', main: '', listLabel: 'blank', macropadLabel: '', isClearIcon: true },
      { id: 'A', main: 'A', macropadLabel: 'A' },
      { id: 'B', main: 'B', macropadLabel: 'B' },
      { id: 'C', main: 'C', macropadLabel: 'C' },
      { id: 'D', main: 'D', macropadLabel: 'D' },
      { id: 'E', main: 'E', macropadLabel: 'E' },
      { id: 'F', main: 'F', macropadLabel: 'F' },
      { id: 'G', main: 'G', macropadLabel: 'G' },
      { id: 'H', main: 'H', macropadLabel: 'H' },
      { id: 'I', main: 'I', macropadLabel: 'I' },
      { id: 'J', main: 'J', macropadLabel: 'J' },
      { id: 'K', main: 'K', macropadLabel: 'K' },
      { id: 'L', main: 'L', macropadLabel: 'L' },
      { id: 'M', main: 'M', macropadLabel: 'M' },
      { id: 'N', main: 'N', macropadLabel: 'N' },
      { id: 'O', main: 'O', macropadLabel: 'O' },
      { id: 'P', main: 'P', macropadLabel: 'P' },
      { id: 'Q', main: 'Q', macropadLabel: 'Q' },
      { id: 'R', main: 'R', macropadLabel: 'R' },
      { id: 'S', main: 'S', macropadLabel: 'S' },
      { id: 'T', main: 'T', macropadLabel: 'T' },
      { id: 'U', main: 'U', macropadLabel: 'U' },
      { id: 'V', main: 'V', macropadLabel: 'V' },
      { id: 'W', main: 'W', macropadLabel: 'W' },
      { id: 'X', main: 'X', macropadLabel: 'X' },
      { id: 'Y', main: 'Y', macropadLabel: 'Y' },
      { id: 'Z', main: 'Z', macropadLabel: 'Z' },
      { id: '1', top: '!', main: '1', listLabel: '1', macropadLabel: '1' },
      { id: '2', top: '@', main: '2', listLabel: '2', macropadLabel: '2' },
      { id: '3', top: '#', main: '3', listLabel: '3', macropadLabel: '3' },
      { id: '4', top: '$', main: '4', listLabel: '4', macropadLabel: '4' },
      { id: '5', top: '%', main: '5', listLabel: '5', macropadLabel: '5' },
      { id: '6', top: '^', main: '6', listLabel: '6', macropadLabel: '6' },
      { id: '7', top: '&', main: '7', listLabel: '7', macropadLabel: '7' },
      { id: '8', top: '*', main: '8', listLabel: '8', macropadLabel: '8' },
      { id: '9', top: '(', main: '9', listLabel: '9', macropadLabel: '9' },
      { id: '0', top: ')', main: '0', listLabel: '0', macropadLabel: '0' },
    ],
  },
  {
    title: 'Glyphs',
    listPreview: '[ -, =, [, ], \\, NUHS... ]',
    items: [
      { id: 'minus', top: '_', main: '-', listLabel: '-', macropadLabel: '-' },
      { id: 'equal', top: '+', main: '=', listLabel: '=', macropadLabel: '=' },
      { id: 'lbracket', top: '{', main: '[', listLabel: '[', macropadLabel: '[' },
      { id: 'rbracket', top: '}', main: ']', listLabel: ']', macropadLabel: ']' },
      { id: 'backslash', top: '|', main: '\\', listLabel: '\\', macropadLabel: '\\' },
      { id: 'nuhs', main: 'NUHS', listLabel: 'NUHS', macropadLabel: '#' },
      { id: 'semicolon', top: ':', main: ';', listLabel: ';', macropadLabel: ';' },
      { id: 'quote', top: '"', main: "'", listLabel: "'", macropadLabel: "'" },
      { id: 'grave', top: '~', main: '`', listLabel: '`', macropadLabel: '`' },
      { id: 'comma', top: '<', main: ',', listLabel: ',', macropadLabel: ',' },
      { id: 'plus-glyph', main: '+', listLabel: '+', macropadLabel: '+' },
      { id: 'hyphen-glyph', main: '-', listLabel: '-', macropadLabel: '-' },
      { id: 'eq-glyph', main: '=', listLabel: '=', macropadLabel: '=' },
      { id: 'ast-glyph', main: '*', listLabel: '*', macropadLabel: '*' },
      { id: 'period', top: '>', main: '.', listLabel: '.', macropadLabel: '.' },
      { id: 'slash', top: '?', main: '/', listLabel: '/', macropadLabel: '/' },
      { id: 'pipe2', top: '|', main: '\\', listLabel: '\\', macropadLabel: '\\' },
    ],
  },
  {
    title: 'Modifiers',
    listPreview: '[ enter, esc, back, tab, space, ctrl... ]',
    items: [
      { id: 'enter', main: 'enter', macropadLabel: 'ent' },
      { id: 'esc', main: 'esc', macropadLabel: 'esc' },
      { id: 'back', main: 'back', macropadLabel: 'bksp' },
      { id: 'tab', main: 'tab', macropadLabel: 'tab' },
      { id: 'space', main: 'space', macropadLabel: 'spc' },
      { id: 'ctrl', main: 'ctrl', macropadLabel: 'ctrl' },
      { id: 'shift', main: 'shift', macropadLabel: 'shft' },
      { id: 'alt', main: 'alt', macropadLabel: 'alt' },
      { id: 'win', main: 'win', macropadLabel: 'win' },
      { id: 'rctrl', main: 'right\nctrl', listLabel: 'right ctrl', macropadLabel: 'rctl' },
      { id: 'rshift', main: 'right\nshift', listLabel: 'right shift', macropadLabel: 'rshf' },
      { id: 'ralt', main: 'right\nalt', listLabel: 'right alt', macropadLabel: 'ralt' },
      { id: 'rwin', main: 'right\nwin', listLabel: 'right win', macropadLabel: 'rwin' },
      { id: 'lock', main: 'lock', macropadLabel: 'lock' },
      { id: 'scrolllock', main: 'scroll lock', macropadLabel: 'scrl' },
      { id: 'numlock', main: 'num lock', macropadLabel: 'num' },
      {
        id: 'lscrolllock',
        main: 'locking\nscroll lock',
        listLabel: 'locking scroll lock',
        macropadLabel: 'lscr',
      },
      { id: 'prtsc', main: 'print\nscreen', listLabel: 'print screen', macropadLabel: 'prts' },
      { id: 'pause', main: 'pause', macropadLabel: 'paus' },
      { id: 'insert', main: 'insert', macropadLabel: 'ins' },
      { id: 'home', main: 'home', macropadLabel: 'home' },
      { id: 'pgup', main: 'page up', macropadLabel: 'pgup' },
      { id: 'pgdn', main: 'page\ndown', listLabel: 'page down', macropadLabel: 'pgdn' },
      { id: 'delete', main: 'delete', macropadLabel: 'del' },
      { id: 'end', main: 'end', macropadLabel: 'end' },
      { id: 'arr-r', main: '→', listLabel: 'right arrow', macropadLabel: '→', arrowDir: 'right' },
      { id: 'arr-l', main: '←', listLabel: 'left arrow', macropadLabel: '←', arrowDir: 'left' },
      { id: 'arr-d', main: '↓', listLabel: 'down arrow', macropadLabel: '↓', arrowDir: 'down' },
      { id: 'arr-u', main: '↑', listLabel: 'up arrow', macropadLabel: '↑', arrowDir: 'up' },
    ],
  },
  {
    title: 'Function keys (F)',
    listPreview: '[ F1, F2, F3, F4, F5, F6... ]',
    items: Array.from({ length: 24 }, (_, i) => ({
      id: `F${i + 1}`,
      main: `F${i + 1}`,
      macropadLabel: `F${i + 1}`,
    })),
  },
  {
    title: 'Number pad',
    listPreview: '[ /, *, -, +, num enter, 1... ]',
    items: [
      { id: 'num-div', main: '/', macropadLabel: '/' },
      { id: 'num-mul', main: '*', macropadLabel: '*' },
      { id: 'num-sub', main: '-', macropadLabel: '-' },
      { id: 'num-add', main: '+', macropadLabel: '+' },
      { id: 'num-ent', main: 'num enter', macropadLabel: 'nent' },
      { id: 'num-1', main: '1', macropadLabel: '1' },
      { id: 'num-2', main: '2', macropadLabel: '2' },
      { id: 'num-3', main: '3', macropadLabel: '3' },
      { id: 'num-4', main: '4', macropadLabel: '4' },
      { id: 'num-5', main: '5', macropadLabel: '5' },
      { id: 'num-6', main: '6', macropadLabel: '6' },
      { id: 'num-7', main: '7', macropadLabel: '7' },
      { id: 'num-8', main: '8', macropadLabel: '8' },
      { id: 'num-9', main: '9', macropadLabel: '9' },
      { id: 'num-0', main: '0', macropadLabel: '0' },
      { id: 'num-dot', main: '.', macropadLabel: '.' },
      { id: 'num-eq', main: '=', macropadLabel: '=' },
      { id: 'num-comma', main: ',', macropadLabel: ',' },
    ],
  },
  {
    title: 'Media keys',
    listPreview: '[ mute, volume +, volume -, next track,...',
    items: [
      { id: 'mute', main: 'mute', macropadLabel: 'mute' },
      { id: 'vol-up', main: 'volume +', macropadLabel: 'vol+' },
      { id: 'vol-dn', main: 'volume -', macropadLabel: 'vol-' },
      { id: 'next-trk', main: 'next track', macropadLabel: 'next' },
      {
        id: 'prev-trk',
        main: 'previous\ntrack',
        listLabel: 'previous track',
        macropadLabel: 'prev',
      },
      { id: 'm-stop', main: 'media stop', macropadLabel: 'stop' },
      { id: 'play', main: 'play', macropadLabel: 'play' },
      {
        id: 'ffwd',
        main: 'fast\nforward',
        listLabel: 'fast forward',
        macropadLabel: 'ffwd',
      },
      { id: 'rwnd', main: 'rewind', macropadLabel: 'rwnd' },
    ],
  },
  {
    title: 'Extra Keys',
    listPreview: '[ power down, sleep, stop, bright up, b...',
    items: [
      {
        id: 'pwr',
        main: 'power\ndown',
        listLabel: 'power down',
        macropadLabel: 'pwr',
      },
      { id: 'slp', main: 'sleep', macropadLabel: 'slp' },
      { id: 'stop-ex', main: 'stop', macropadLabel: 'stop' },
      { id: 'brt-up', main: 'bright up', macropadLabel: 'brt+' },
      {
        id: 'brt-dn',
        main: 'bright\ndown',
        listLabel: 'bright down',
        macropadLabel: 'brt-',
      },
    ],
  },
  {
    title: 'Layer Keys',
    listPreview: '[ Layer 1, Layer 2, Layer 3, Layer 4, La...',
    items: [
      { id: 'lyr-1', main: 'Layer 1', macropadLabel: 'L1' },
      { id: 'lyr-2', main: 'Layer 2', macropadLabel: 'L2' },
      { id: 'lyr-3', main: 'Layer 3', macropadLabel: 'L3' },
      { id: 'lyr-4', main: 'Layer 4', macropadLabel: 'L4' },
      { id: 'lyr-5', main: 'Layer 5', macropadLabel: 'L5' },
      { id: 'lyr-6', main: 'Layer 6', macropadLabel: 'L6' },
      {
        id: 'tlyr-1',
        main: 'Temp Layer\n1',
        listLabel: 'Temp Layer 1',
        macropadLabel: 'TL1',
      },
      {
        id: 'tlyr-2',
        main: 'Temp Layer\n2',
        listLabel: 'Temp Layer 2',
        macropadLabel: 'TL2',
      },
      {
        id: 'tlyr-3',
        main: 'Temp Layer\n3',
        listLabel: 'Temp Layer 3',
        macropadLabel: 'TL3',
      },
      {
        id: 'tlyr-4',
        main: 'Temp Layer\n4',
        listLabel: 'Temp Layer 4',
        macropadLabel: 'TL4',
      },
      {
        id: 'tlyr-5',
        main: 'Temp Layer\n5',
        listLabel: 'Temp Layer 5',
        macropadLabel: 'TL5',
      },
      {
        id: 'tlyr-6',
        main: 'Temp Layer\n6',
        listLabel: 'Temp Layer 6',
        macropadLabel: 'TL6',
      },
    ],
  },
  {
    title: 'Profile Keys',
    listPreview: '[ Profile 1, Profile 2, Profile 3, Profile ...',
    items: [
      { id: 'prf-1', main: 'Profile 1', macropadLabel: 'P1' },
      { id: 'prf-2', main: 'Profile 2', macropadLabel: 'P2' },
      { id: 'prf-3', main: 'Profile 3', macropadLabel: 'P3' },
      { id: 'prf-4', main: 'Profile 4', macropadLabel: 'P4' },
      { id: 'prf-5', main: 'Profile 5', macropadLabel: 'P5' },
      { id: 'prf-6', main: 'Profile 6', macropadLabel: 'P6' },
    ],
  },
  {
    title: 'Internal',
    listPreview: '[ Show Cheat-Sheet, Show Cheat-Sheet ...',
    items: [
      {
        id: 'cs-show',
        main: 'Show\nCheat-\nSheet',
        listLabel: 'Show Cheat-Sheet',
        macropadLabel: 'CS',
      },
      {
        id: 'cs-hold',
        main: 'Show\nCheat-\nSheet Hold',
        listLabel: 'Show Cheat-Sheet Hold',
        macropadLabel: 'CSH',
      },
      {
        id: 'cs-hide',
        main: 'Hide\nCheat-\nSheet',
        listLabel: 'Hide Cheat-Sheet',
        macropadLabel: 'HCS',
      },
      {
        id: 'cs-tog',
        main: 'Toggle\nCheat-\nSheet',
        listLabel: 'Toggle Cheat-Sheet',
        macropadLabel: 'TCS',
      },
    ],
  },
];

const INITIAL_LAYER_1: LayerKeymap = {
  'dial-tl': {
    label: 'Vol',
    actionType: 'Shortcut',
    binding: 'Volume / Play',
    encoderActions: {
      cw: { label: 'vo...', binding: 'volume +' },
      press: { label: 'pl...', binding: 'play' },
      ccw: { label: 'vo...', binding: 'volume -' },
    },
  },
  r1c2: { label: 'esc', actionType: 'Basic input', binding: 'esc' },
  r1c3: { label: 'tab', actionType: 'Basic input', binding: 'tab' },
  'knob-tr': {
    label: 'Vol',
    actionType: 'Shortcut',
    binding: 'Volume / Play',
    encoderActions: {
      cw: { label: 'vo...', binding: 'volume +' },
      press: { label: 'pl...', binding: 'play' },
      ccw: { label: 'vo...', binding: 'volume -' },
    },
  },
  r2c1: { label: 'Q', actionType: 'Basic input', binding: 'Q' },
  r2c2: { label: 'W', actionType: 'Basic input', binding: 'W' },
  r2c3: { label: 'E', actionType: 'Basic input', binding: 'E' },
  r2c4: { label: 'R', actionType: 'Basic input', binding: 'R' },
  r3c1: { label: 'A', actionType: 'Basic input', binding: 'A' },
  r3c2: { label: 'S', actionType: 'Basic input', binding: 'S' },
  r3c3: { label: 'D', actionType: 'Basic input', binding: 'D' },
  r3c4: { label: 'F', actionType: 'Basic input', binding: 'F' },
  'btn-bl': { label: 'Lyr', actionType: 'Layer Cycle', binding: 'Layer 2' },
  r4c2: { label: 'Z', actionType: 'Basic input', binding: 'Z' },
  r4c3: { label: 'X', actionType: 'Basic input', binding: 'X' },
  r4c4: { label: 'C', actionType: 'Basic input', binding: 'C' },
};

const PRESET_LIBRARY: PresetItem[] = [
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    description: 'Install this layer to use with the ChatGPT app.',
    author: 'Work Louder',
    hasPreview: false,
    layerKeymap: {
      ...INITIAL_LAYER_1,
      r1c2: { label: 'new', actionType: 'Shortcut', binding: 'Cmd+N (New Chat)' },
      r1c3: { label: 'find', actionType: 'Shortcut', binding: 'Cmd+K (Search)' },
      r2c1: { label: '⌘Spc', actionType: 'Shortcut', binding: 'Companion Bar' },
      r2c2: { label: 'Voice', actionType: 'Multi-step action', binding: 'Toggle Voice Mode' },
      r2c3: { label: 'Copy', actionType: 'Shortcut', binding: 'Cmd+Shift+C' },
      r2c4: { label: 'Regen', actionType: 'Shortcut', binding: 'Cmd+Shift+R' },
    },
  },
  {
    id: 'framer',
    title: 'Framer',
    description: 'This is a great preset for getting started with Framer.',
    author: 'Work Louder',
    hasPreview: true,
    layerKeymap: {
      ...INITIAL_LAYER_1,
      r2c1: { label: 'F', actionType: 'Basic input', binding: 'Frame (F)' },
      r2c2: { label: 'S', actionType: 'Basic input', binding: 'Stack (S)' },
      r2c3: { label: 'G', actionType: 'Basic input', binding: 'Grid (G)' },
      r2c4: { label: 'T', actionType: 'Basic input', binding: 'Text (T)' },
      r3c1: { label: 'I', actionType: 'Basic input', binding: 'Insert (I)' },
      r3c2: { label: '⌘P', actionType: 'Shortcut', binding: 'Preview (Cmd+P)' },
      r3c3: { label: '⌘K', actionType: 'Shortcut', binding: 'Quick Actions' },
      r3c4: { label: 'Pub', actionType: 'Multi-step action', binding: 'Publish Site' },
    },
  },
  {
    id: 'figma',
    title: 'Figma',
    description: 'This is a great preset for getting started with Figma.',
    author: 'Work Louder',
    hasPreview: true,
    layerKeymap: {
      ...INITIAL_LAYER_1,
      r2c1: { label: 'F', actionType: 'Basic input', binding: 'Frame Tool (F)' },
      r2c2: { label: 'R', actionType: 'Basic input', binding: 'Rectangle (R)' },
      r2c3: { label: 'P', actionType: 'Basic input', binding: 'Pen Tool (P)' },
      r2c4: { label: 'T', actionType: 'Basic input', binding: 'Text Tool (T)' },
      r3c1: { label: '⌘G', actionType: 'Shortcut', binding: 'Group Selection' },
      r3c2: { label: '⇧A', actionType: 'Shortcut', binding: 'Auto Layout' },
      r3c3: { label: '⌥⌘K', actionType: 'Shortcut', binding: 'Create Component' },
      r3c4: { label: '⌘/', actionType: 'Multi-step action', binding: 'Quick Actions' },
    },
  },
  {
    id: 'illustrator',
    title: 'Illustrator',
    description: 'This is a great preset for getting started with Adobe Illustrator.',
    author: 'Preset Author',
    hasPreview: true,
    layerKeymap: {
      ...INITIAL_LAYER_1,
      r2c1: { label: 'V', actionType: 'Basic input', binding: 'Selection (V)' },
      r2c2: { label: 'A', actionType: 'Basic input', binding: 'Direct Select (A)' },
      r2c3: { label: 'P', actionType: 'Basic input', binding: 'Pen Tool (P)' },
      r2c4: { label: 'M', actionType: 'Basic input', binding: 'Rectangle (M)' },
      r3c1: { label: '⇧M', actionType: 'Shortcut', binding: 'Shape Builder' },
      r3c2: { label: 'I', actionType: 'Basic input', binding: 'Eyedropper (I)' },
      r3c3: { label: '⌘G', actionType: 'Shortcut', binding: 'Group' },
      r3c4: { label: '⌘Y', actionType: 'Shortcut', binding: 'Outline View' },
    },
  },
  {
    id: 'photoshop',
    title: 'Photoshop',
    description: 'This preset is great for getting started with Adobe Photoshop.',
    author: 'Preset Author',
    hasPreview: true,
    layerKeymap: {
      ...INITIAL_LAYER_1,
      r2c1: { label: 'B', actionType: 'Basic input', binding: 'Brush Tool (B)' },
      r2c2: { label: 'E', actionType: 'Basic input', binding: 'Eraser (E)' },
      r2c3: { label: 'L', actionType: 'Basic input', binding: 'Lasso Tool (L)' },
      r2c4: { label: 'W', actionType: 'Basic input', binding: 'Object Select (W)' },
      r3c1: { label: '[', actionType: 'Basic input', binding: 'Brush Smaller' },
      r3c2: { label: ']', actionType: 'Basic input', binding: 'Brush Larger' },
      r3c3: { label: '⌘T', actionType: 'Shortcut', binding: 'Free Transform' },
      r3c4: { label: '⌘J', actionType: 'Shortcut', binding: 'Duplicate Layer' },
    },
  },
  {
    id: 'premiere',
    title: 'Premiere',
    description: 'This preset is great for getting started with Adobe Premiere Pro.',
    author: 'Work Louder',
    hasPreview: true,
    layerKeymap: {
      ...INITIAL_LAYER_1,
      r2c1: { label: 'V', actionType: 'Basic input', binding: 'Selection (V)' },
      r2c2: { label: 'C', actionType: 'Basic input', binding: 'Razor Tool (C)' },
      r2c3: { label: 'I', actionType: 'Basic input', binding: 'Mark In (I)' },
      r2c4: { label: 'O', actionType: 'Basic input', binding: 'Mark Out (O)' },
      r3c1: { label: 'J', actionType: 'Basic input', binding: 'Shuttle Left' },
      r3c2: { label: 'K', actionType: 'Basic input', binding: 'Stop / Pause' },
      r3c3: { label: 'L', actionType: 'Basic input', binding: 'Shuttle Right' },
      r3c4: { label: '⌘M', actionType: 'Shortcut', binding: 'Export Media' },
    },
  },
  {
    id: 'blender',
    title: 'Blender',
    description: 'This preset is great for getting started with Blender 3D.',
    author: 'Work Louder',
    hasPreview: true,
    layerKeymap: {
      ...INITIAL_LAYER_1,
      r2c1: { label: 'G', actionType: 'Basic input', binding: 'Grab / Move (G)' },
      r2c2: { label: 'R', actionType: 'Basic input', binding: 'Rotate (R)' },
      r2c3: { label: 'S', actionType: 'Basic input', binding: 'Scale (S)' },
      r2c4: { label: 'E', actionType: 'Basic input', binding: 'Extrude (E)' },
      r3c1: { label: 'I', actionType: 'Basic input', binding: 'Inset Faces (I)' },
      r3c2: { label: '⌃B', actionType: 'Shortcut', binding: 'Bevel (Ctrl+B)' },
      r3c3: { label: '⌃R', actionType: 'Shortcut', binding: 'Loop Cut (Ctrl+R)' },
      r3c4: { label: 'F12', actionType: 'Shortcut', binding: 'Render Image' },
    },
  },
  {
    id: 'davinci',
    title: 'DaVinci',
    description: 'This preset is great for getting started with DaVinci.',
    author: 'Work Louder',
    hasPreview: true,
    layerKeymap: {
      ...INITIAL_LAYER_1,
      r2c1: { label: 'A', actionType: 'Basic input', binding: 'Selection Mode (A)' },
      r2c2: { label: 'B', actionType: 'Basic input', binding: 'Blade Mode (B)' },
      r2c3: { label: 'T', actionType: 'Basic input', binding: 'Trim Edit Mode (T)' },
      r2c4: { label: '⌘B', actionType: 'Shortcut', binding: 'Split Clip' },
      r3c1: { label: '⌥S', actionType: 'Shortcut', binding: 'Add Serial Node' },
      r3c2: { label: '⌥P', actionType: 'Shortcut', binding: 'Add Parallel Node' },
      r3c3: { label: '⌘D', actionType: 'Shortcut', binding: 'Disable Node' },
      r3c4: { label: '⌃F', actionType: 'Shortcut', binding: 'Full Screen Viewer' },
    },
  },
  {
    id: 'affinity',
    title: 'Affinity',
    description: 'This preset is great for getting started with Affinity.',
    author: 'Work Louder',
    hasPreview: true,
    layerKeymap: {
      ...INITIAL_LAYER_1,
      r2c1: { label: 'V', actionType: 'Basic input', binding: 'Move Tool (V)' },
      r2c2: { label: 'A', actionType: 'Basic input', binding: 'Node Tool (A)' },
      r2c3: { label: 'P', actionType: 'Basic input', binding: 'Pen Tool (P)' },
      r2c4: { label: 'N', actionType: 'Basic input', binding: 'Pencil Tool (N)' },
      r3c1: { label: 'M', actionType: 'Basic input', binding: 'Shape Tool (M)' },
      r3c2: { label: 'T', actionType: 'Basic input', binding: 'Artistic Text (T)' },
      r3c3: { label: 'G', actionType: 'Basic input', binding: 'Fill Tool (G)' },
      r3c4: { label: '⌘E', actionType: 'Shortcut', binding: 'Merge Down' },
    },
  },
];

const INITIAL_PROFILES: ProfileData[] = [
  {
    id: 'default',
    name: 'Default Profile',
    color: '#0051ff',
    layers: [INITIAL_LAYER_1],
  },
];

const TIPS = [
  {
    lines: ['Actions can contain other', 'actions or smart-actions'],
    dot: 0,
  },
  {
    lines: [
      'You can switch to another layer',
      'when holding a key by assigning',
      'a temp-layer to it',
    ],
    dot: 1,
  },
  {
    lines: ['You can open your favorite app', 'with a smart-action'],
    dot: 1,
  },
  {
    lines: ['Multiactions can contain actions', 'and smart-actions'],
    dot: 1,
  },
  {
    lines: ['If you need more layers you can', 'create another profile'],
    dot: 2,
  },
  {
    lines: ['You can assign icons to actions,', 'multiactions and smart-actions'],
    dot: 2,
  },
];

export default function App() {
  const [activeNav, setActiveNav] = useState<'Keymap' | 'Preset' | 'Settings'>('Keymap');
  const [profiles, setProfiles] = useState<ProfileData[]>(INITIAL_PROFILES);
  const [activeProfileIndex, setActiveProfileIndex] = useState(0);
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<KeySlotId | null>(null);
  const [selectedEncoderSub, setSelectedEncoderSub] =
    useState<EncoderSubActionId | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Key Mapping states (4-button stack + full-height right sidebar drawer)
  const [mappingStackExpanded, setMappingStackExpanded] = useState(false);
  const [hoveredMappingType, setHoveredMappingType] = useState<
    'Basic Key' | 'Action' | 'Multiaction' | 'Smart Action' | null
  >(null);
  const [mappingDrawerOpen, setMappingDrawerOpen] = useState(false);
  const [mappingTab, setMappingTab] = useState<MappingTabId>('Basic');
  const [mappingSearch, setMappingSearch] = useState('');
  const [mappingViewMode, setMappingViewMode] = useState<'list' | 'grid'>('grid');
  const [expandedListSections, setExpandedListSections] = useState<Record<string, boolean>>({});

  // Custom created items for Action, Multi-A, Smart-A
  const [customItemsByTab, setCustomItemsByTab] = useState<
    Record<Exclude<MappingTabId, 'Basic'>, BasicTileItem[]>
  >({
    Action: [],
    'Multi-A': [],
    'Smart-A': [],
  });
  const [creatorModalTab, setCreatorModalTab] = useState<
    Exclude<MappingTabId, 'Basic'> | null
  >(null);
  const [editingCustomItemId, setEditingCustomItemId] = useState<string | null>(null);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomBinding, setNewCustomBinding] = useState('');
  const [selectedIconId, setSelectedIconId] = useState<string | undefined>(undefined);
  const [selectedEmoji, setSelectedEmoji] = useState<string | undefined>(undefined);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerTab, setIconPickerTab] = useState<'Icon' | 'Emoji'>('Icon');
  const [iconPickerSearch, setIconPickerSearch] = useState('');

  // Multiaction editor states
  const [multiGestures, setMultiGestures] = useState<
    Record<MultiGestureKey, string>
  >({
    onTap: '',
    doubleTap: '',
    onHold: '',
    tapHold: '',
  });
  const [tappingTermMs, setTappingTermMs] = useState('250');
  const [activeGestureDropdown, setActiveGestureDropdown] =
    useState<MultiGestureKey | null>(null);
  const [gestureKeySearch, setGestureKeySearch] = useState('');
  const [expandedGestureSection, setExpandedGestureSection] = useState<
    string | null
  >(null);

  // Smart Action editor states
  const [smartSubTab, setSmartSubTab] = useState<SmartActionSubTab>('Text');
  const [smartTextValue, setSmartTextValue] = useState('');
  const [smartCmdValue, setSmartCmdValue] = useState('');
  const [smartWebValue, setSmartWebValue] = useState('');
  const [smartAppValue, setSmartAppValue] = useState('');
  const [smartAppDropdownOpen, setSmartAppDropdownOpen] = useState(false);
  const [enableCommandActions, setEnableCommandActions] = useState(true);

  // Action editor states (Interactive keyboard recorder + Advance mode)
  const [actionAdvanceMode, setActionAdvanceMode] = useState(false);
  const [actionRecordingStatus, setActionRecordingStatus] = useState<
    'idle' | 'recording' | 'confirmed'
  >('idle');
  const [actionTokens, setActionTokens] = useState<
    { id: string; label: string; kind: 'text' | 'modifier' | 'special' }[]
  >([]);
  const [actionAdvanceSteps, setActionAdvanceSteps] = useState<
    {
      id: string;
      keyLabel: string;
      mode: 'press-release' | 'press';
      delayAfterActive?: boolean;
      delayAfterMs?: string;
    }[]
  >([
    {
      id: 'adv-step-1',
      keyLabel: '',
      mode: 'press-release',
      delayAfterActive: false,
      delayAfterMs: '200',
    },
  ]);
  const [activeAdvanceStepDropdown, setActiveAdvanceStepDropdown] = useState<
    string | null
  >(null);
  const [hoveredDelayStepId, setHoveredDelayStepId] = useState<string | null>(
    null
  );
  const [editingDelayStepId, setEditingDelayStepId] = useState<string | null>(
    null
  );
  const [hoveredModeStepId, setHoveredModeStepId] = useState<string | null>(
    null
  );
  const [draggingAdvStep, setDraggingAdvStep] = useState<{
    id: string;
    offsetY: number;
  } | null>(null);
  const advStepDragRef = useRef<{
    id: string;
    startY: number;
  } | null>(null);
  const lastBackspaceTimeRef = useRef<number>(0);

  const [editLayoutModalOpen, setEditLayoutModalOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<
    'profiles' | 'layers' | 'mapping' | 'drawer-mapping' | null
  >(null);
  const [tipIndex, setTipIndex] = useState(0);

  // Drag-and-drop & Drawer Tile Selection state
  const [selectedDrawerTile, setSelectedDrawerTile] = useState<{
    item: BasicTileItem;
    sourceTab: MappingTabId;
  } | null>(null);
  const [flashedTileId, setFlashedTileId] = useState<string | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const [draggedTile, setDraggedTile] = useState<{
    item: BasicTileItem;
    sourceTab: MappingTabId;
    fromSlotId?: KeySlotId;
    fromSubAction?: EncoderSubActionId;
    x: number;
    y: number;
  } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    slotId: KeySlotId;
    subAction?: EncoderSubActionId;
  } | null>(null);
  const dragSessionRef = useRef<{
    item: BasicTileItem;
    sourceTab: MappingTabId;
    fromSlotId?: KeySlotId;
    fromSubAction?: EncoderSubActionId;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    isDragging: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  // Subtle corner-held circular swing for floating dragged keycap
  const dragRawBobY = useMotionValue(0);
  const dragRawRotate = useMotionValue(0);
  const dragSpringBobY = useSpring(dragRawBobY, {
    stiffness: 300,
    damping: 20,
    mass: 0.6,
  });
  const dragSpringRotate = useSpring(dragRawRotate, {
    stiffness: 260,
    damping: 18,
    mass: 0.65,
  });
  const dragTiltDecayTimeoutRef = useRef<number | null>(null);

  // Refs for outside-click closing of Profiles & Layers popovers and main canvas bounds
  const keymapMainRef = useRef<HTMLElement | null>(null);
  const profileContainerRef = useRef<HTMLDivElement | null>(null);
  const layersContainerRef = useRef<HTMLDivElement | null>(null);

  // Movable Macropad + "Edit layout" unit state (clamped to blank canvas area)
  const [macropadOffset, setMacropadOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDraggingMacropad, setIsDraggingMacropad] = useState(false);
  const macropadDragRef = useRef<{
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    isMoving: boolean;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Preset view state
  const [presetSearch, setPresetSearch] = useState('');
  const [presetOs, setPresetOs] = useState<'mac' | 'win'>('win');
  const [previewPreset, setPreviewPreset] = useState<PresetItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings view state
  const [allowAnalytics, setAllowAnalytics] = useState(false);
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [allowTerminalSmartActions, setAllowTerminalSmartActions] = useState(true);
  const [allowDeviceNotifications, setAllowDeviceNotifications] = useState(true);

  // Undo / Redo stacks
  const [history, setHistory] = useState<ProfileData[][]>([]);
  const [redoStack, setRedoStack] = useState<ProfileData[][]>([]);

  // Hardware layout configuration
  const [swapTopRowEncoders, setSwapTopRowEncoders] = useState(false);
  const [dialAngle, setDialAngle] = useState(45);
  const [knobAngle, setKnobAngle] = useState(0);

  // Profiles & Layers extended toolbar / lighting / delete confirmation states
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [layerToolbarOpen, setLayerToolbarOpen] = useState(false);
  const [layerLightingOpen, setLayerLightingOpen] = useState(false);
  const [layerDeleteConfirm, setLayerDeleteConfirm] = useState(false);
  const [layerNames, setLayerNames] = useState<Record<string, string>>({});
  const [lightingTab, setLightingTab] = useState<'Backlight' | 'Underglow'>(
    'Backlight'
  );
  const [lightingConfig, setLightingConfig] = useState<
    Record<
      'Backlight' | 'Underglow',
      {
        preset: 'Off' | 'Solid' | 'Snake' | 'Rainbow' | 'Breath' | 'Gradient';
        light: number;
        speed: number;
        magic: number;
        hue: number;
        colorHex: string;
      }
    >
  >({
    Backlight: {
      preset: 'Solid',
      light: 100,
      speed: 50,
      magic: 100,
      hue: 0,
      colorHex: '#FFFFFF',
    },
    Underglow: {
      preset: 'Solid',
      light: 100,
      speed: 50,
      magic: 100,
      hue: 220,
      colorHex: '#FFFFFF',
    },
  });

  const currentProfile = profiles[activeProfileIndex] || profiles[0];
  const currentLayer =
    currentProfile.layers[activeLayerIndex] || currentProfile.layers[0];
  const currentLayerNameKey = `${currentProfile.id}-${activeLayerIndex}`;
  const currentLayerName = layerNames[currentLayerNameKey] ?? '';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2200);
  };

  const pushState = (nextProfiles: ProfileData[]) => {
    setHistory((prev) => [...prev.slice(-19), profiles]);
    setRedoStack([]);
    setProfiles(nextProfiles);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [profiles, ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    setProfiles(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory((prev) => [...prev, profiles]);
    setRedoStack((prev) => prev.slice(1));
    setProfiles(next);
  };

  const handleAddLayer = () => {
    if (currentProfile.layers.length >= 8) return;
    const clonedLayer: LayerKeymap = JSON.parse(JSON.stringify(currentLayer));
    const nextProfiles = profiles.map((p, idx) =>
      idx === activeProfileIndex
        ? { ...p, layers: [...p.layers, clonedLayer] }
        : p
    );
    pushState(nextProfiles);
    setActiveLayerIndex(currentProfile.layers.length);
    setLayerToolbarOpen(true);
    setLayerDeleteConfirm(false);
  };

  const handleRemoveLayer = (layerIdx: number) => {
    if (currentProfile.layers.length <= 1) {
      const resetLayer: LayerKeymap = JSON.parse(JSON.stringify(INITIAL_LAYER_1));
      const nextProfiles = profiles.map((p, idx) =>
        idx === activeProfileIndex ? { ...p, layers: [resetLayer] } : p
      );
      pushState(nextProfiles);
      setLayerDeleteConfirm(false);
      setLayerToolbarOpen(false);
      return;
    }
    const nextProfiles = profiles.map((p, idx) =>
      idx === activeProfileIndex
        ? { ...p, layers: p.layers.filter((_, i) => i !== layerIdx) }
        : p
    );
    pushState(nextProfiles);
    setActiveLayerIndex(Math.max(0, activeLayerIndex - 1));
    setLayerDeleteConfirm(false);
  };

  const handleUpdateKeyAssignment = (
    slotId: KeySlotId,
    updates: Partial<KeyAssignment>
  ) => {
    const nextProfiles = profiles.map((p, pIdx) => {
      if (pIdx !== activeProfileIndex) return p;
      const nextLayers = p.layers.map((layer, lIdx) => {
        if (lIdx !== activeLayerIndex) return layer;
        return {
          ...layer,
          [slotId]: {
            ...layer[slotId],
            ...updates,
          },
        };
      });
      return { ...p, layers: nextLayers };
    });
    pushState(nextProfiles);
  };

  const assignItemToSlot = (
    item: BasicTileItem,
    targetSlot: KeySlotId,
    subOverride?: EncoderSubActionId,
    tabOverride?: MappingTabId
  ) => {
    const effectiveTab = tabOverride || mappingTab;
    const actionTypeMap: Record<MappingTabId, KeyAssignment['actionType']> = {
      Basic: 'Basic input',
      Action: 'Shortcut',
      'Multi-A': 'Multi-step action',
      'Smart-A': 'Smart Action',
    };
    const displayBinding =
      item.listLabel || item.main.replace(/\n/g, ' ') || 'blank';

    if (targetSlot === 'dial-tl' || targetSlot === 'knob-tr') {
      const subTarget = subOverride || selectedEncoderSub;
      if (!subTarget) return;
      const existingActions = getEncoderActions(
        currentLayer[targetSlot],
        targetSlot
      );
      const updatedActions: Record<EncoderSubActionId, EncoderSubBinding> = {
        ...existingActions,
        [subTarget]: {
          label: item.isClearIcon ? '—' : formatEncoderShortLabel(displayBinding),
          binding: item.isClearIcon ? 'blank' : displayBinding,
        },
      };
      handleUpdateKeyAssignment(targetSlot, {
        actionType: actionTypeMap[effectiveTab],
        encoderActions: updatedActions,
      });
      showToast(
        `Assigned "${displayBinding}" to ${
          targetSlot === 'dial-tl' ? 'Dial' : 'Knob'
        } (${subTarget.toUpperCase()})`
      );
      return;
    }

    if (targetSlot === 'btn-bl') {
      handleUpdateKeyAssignment(targetSlot, {
        label: item.isClearIcon ? '' : item.macropadLabel,
        binding: item.isClearIcon ? 'blank' : displayBinding,
        actionType: actionTypeMap[effectiveTab],
        iconId: item.isClearIcon ? undefined : item.iconId,
      });
      return;
    }

    handleUpdateKeyAssignment(targetSlot, {
      label: item.isClearIcon ? '' : item.macropadLabel,
      binding: item.isClearIcon ? 'blank' : displayBinding,
      actionType: actionTypeMap[effectiveTab],
      iconId: item.isClearIcon ? undefined : item.iconId,
    });
    showToast(`Assigned "${displayBinding}" to ${targetSlot.toUpperCase()}`);
  };

  const swapMacropadSlots = (
    slotA: KeySlotId,
    slotB: KeySlotId,
    subA?: EncoderSubActionId,
    subB?: EncoderSubActionId
  ) => {
    if (slotA === slotB && subA === subB) return;

    const nextProfiles = profiles.map((p, pIdx) => {
      if (pIdx !== activeProfileIndex) return p;
      const nextLayers = p.layers.map((layer, lIdx) => {
        if (lIdx !== activeLayerIndex) return layer;
        const copy: LayerKeymap = JSON.parse(JSON.stringify(layer));

        if (subA && subB) {
          const actionsA = getEncoderActions(
            copy[slotA],
            slotA as 'dial-tl' | 'knob-tr'
          );
          const actionsB = getEncoderActions(
            copy[slotB],
            slotB as 'dial-tl' | 'knob-tr'
          );
          const entryA = { ...actionsA[subA] };
          const entryB = { ...actionsB[subB] };
          if (slotA === slotB) {
            copy[slotA].encoderActions = {
              ...actionsA,
              [subA]: entryB,
              [subB]: entryA,
            };
          } else {
            copy[slotA].encoderActions = { ...actionsA, [subA]: entryB };
            copy[slotB].encoderActions = { ...actionsB, [subB]: entryA };
          }
          return copy;
        }

        if (subA && !subB) {
          const actionsA = getEncoderActions(
            copy[slotA],
            slotA as 'dial-tl' | 'knob-tr'
          );
          const entryA = { ...actionsA[subA] };
          const itemB = { ...copy[slotB] };
          const isBEmpty =
            !itemB.iconId &&
            (!itemB.label || itemB.label === '—' || itemB.binding === 'blank');
          copy[slotA].encoderActions = {
            ...actionsA,
            [subA]: {
              label: isBEmpty
                ? '—'
                : formatEncoderShortLabel(itemB.binding || itemB.label),
              binding: isBEmpty ? 'blank' : itemB.binding,
            },
          };
          copy[slotB] = {
            ...itemB,
            label:
              entryA.binding === 'blank' || entryA.label === '—'
                ? ''
                : entryA.binding,
            binding: entryA.binding,
            iconId: undefined,
          };
          return copy;
        }

        if (!subA && subB) {
          const itemA = { ...copy[slotA] };
          const actionsB = getEncoderActions(
            copy[slotB],
            slotB as 'dial-tl' | 'knob-tr'
          );
          // Moving rectangular key onto encoder popup sub-button sets the encoder sub-button and leaves the source rectangular key empty
          copy[slotA] = {
            ...itemA,
            label: '',
            binding: 'blank',
            iconId: undefined,
          };
          copy[slotB].encoderActions = {
            ...actionsB,
            [subB]: {
              label: formatEncoderShortLabel(itemA.binding || itemA.label),
              binding: itemA.binding || itemA.label,
            },
          };
          return copy;
        }

        const temp = { ...copy[slotA] };
        copy[slotA] = { ...copy[slotB] };
        copy[slotB] = temp;
        return copy;
      });
      return { ...p, layers: nextLayers };
    });

    pushState(nextProfiles);
    const labelA = currentLayer[slotA]?.label || 'empty';
    const labelB = currentLayer[slotB]?.label || 'empty';
    showToast(`Switched "${labelA}" ⇄ "${labelB}"`);
  };

  const clampMacropadOffset = (
    rawOffsetX: number,
    rawOffsetY: number
  ): { x: number; y: number } => {
    const container = keymapMainRef.current;
    if (!container) return { x: rawOffsetX, y: rawOffsetY };

    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (W === 0 || H === 0) return { x: rawOffsetX, y: rawOffsetY };

    const leftEncoderSlot: 'dial-tl' | 'knob-tr' = !swapTopRowEncoders
      ? 'dial-tl'
      : 'knob-tr';
    const rightEncoderSlot: 'dial-tl' | 'knob-tr' = !swapTopRowEncoders
      ? 'knob-tr'
      : 'dial-tl';
    const isLeftPopupOpen = selectedKey === leftEncoderSlot;
    const isRightPopupOpen = selectedKey === rightEncoderSlot;

    const halfPadLeft = isLeftPopupOpen ? 286 : 114;
    const halfPadRight = isRightPopupOpen ? 286 : 114;
    const halfPadTop = 114;
    const halfPadBottom = 138; // includes "Edit layout" button underneath

    // Safe blank-area bounds avoiding Top Bar (Profiles, Layers, Key Mapping) and Right Drawer
    const topSafeY = layerToolbarOpen
      ? layerLightingOpen
        ? 152
        : 148
      : 112;
    const bottomSafeY = H - 18;
    const leftSafeX = 22;
    const rightSafeX = mappingDrawerOpen ? W - 344 : W - 22;

    const minOffsetX = leftSafeX + halfPadLeft - W / 2;
    const maxOffsetX = Math.max(minOffsetX, rightSafeX - halfPadRight - W / 2);
    const minOffsetY = topSafeY + halfPadTop - H / 2;
    const maxOffsetY = Math.max(minOffsetY, bottomSafeY - halfPadBottom - H / 2);

    let x = Math.min(maxOffsetX, Math.max(minOffsetX, rawOffsetX));
    let y = Math.min(maxOffsetY, Math.max(minOffsetY, rawOffsetY));

    // Avoid bottom-left "Tip:" text area (left: 0..275px, bottom: H-96..H)
    const tipZoneRight = 275;
    const tipZoneTop = H - 96;
    const padLeftEdge = W / 2 + x - halfPadLeft;
    const padBottomEdge = H / 2 + y + halfPadBottom;

    if (padLeftEdge < tipZoneRight && padBottomEdge > tipZoneTop) {
      const pushRightX = tipZoneRight + halfPadLeft - W / 2;
      const pushUpY = tipZoneTop - halfPadBottom - H / 2;
      const distRight = Math.abs(pushRightX - x);
      const distUp = Math.abs(pushUpY - y);

      if (distUp <= distRight && pushUpY >= minOffsetY) {
        y = pushUpY;
      } else if (pushRightX <= maxOffsetX) {
        x = pushRightX;
      } else {
        y = Math.max(minOffsetY, pushUpY);
      }
    }

    // Avoid top-right "+" / stack button when drawer is closed (right: W-95..W, top: 0..115)
    if (!mappingDrawerOpen) {
      const plusZoneLeft = W - 96;
      const plusZoneBottom = mappingStackExpanded ? 310 : 118;
      const padRightEdge = W / 2 + x + halfPadRight;
      const padTopEdge = H / 2 + y - halfPadTop;
      if (padRightEdge > plusZoneLeft && padTopEdge < plusZoneBottom) {
        const pushLeftX = plusZoneLeft - halfPadRight - W / 2;
        const pushDownY = plusZoneBottom + halfPadTop - H / 2;
        if (Math.abs(pushLeftX - x) < Math.abs(pushDownY - y)) {
          x = Math.max(minOffsetX, pushLeftX);
        } else {
          y = Math.min(maxOffsetY, pushDownY);
        }
      }
    }

    return { x, y };
  };

  // Re-clamp macropad position if drawer or toolbar opens/closes or window resizes
  useEffect(() => {
    setMacropadOffset((prev) => clampMacropadOffset(prev.x, prev.y));
  }, [
    mappingDrawerOpen,
    layerToolbarOpen,
    layerLightingOpen,
    selectedKey,
    swapTopRowEncoders,
  ]);

  // Close Profile dropdown & Layer toolbar when tapping on any blank area outside them
  useEffect(() => {
    const handleDocumentPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (
        profileMenuOpen &&
        profileContainerRef.current &&
        !profileContainerRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
        setDeletingProfileId(null);
      }

      if (
        layerToolbarOpen &&
        layersContainerRef.current &&
        !layersContainerRef.current.contains(target)
      ) {
        setLayerToolbarOpen(false);
        setLayerLightingOpen(false);
        setLayerDeleteConfirm(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  }, [profileMenuOpen, layerToolbarOpen]);

  // Keyboard recording listener for Action editing when Advance mode is OFF
  useEffect(() => {
    if (
      creatorModalTab !== 'Action' ||
      actionAdvanceMode ||
      actionRecordingStatus !== 'recording'
    ) {
      return;
    }

    const handleActionKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Ignore key auto-repeat for modifier/lock keys
      if (
        e.repeat &&
        (e.key === 'Control' ||
          e.key === 'Shift' ||
          e.key === 'Alt' ||
          e.key === 'Meta' ||
          e.key === 'CapsLock' ||
          e.key === 'NumLock')
      ) {
        return;
      }

      // 1. Handle Backspace special rules:
      // - Double-tap Backspace -> deletes the whole thing
      // - Single letter + Backspace -> deletes everything
      // - Two or more letters + Backspace -> deletes the 1 letter just written
      // - Otherwise -> adds a "+" and "backspace" token
      if (e.key === 'Backspace') {
        const now = Date.now();
        const isDoubleTap = now - lastBackspaceTimeRef.current < 420;
        lastBackspaceTimeRef.current = now;

        setActionTokens((prev) => {
          const lastToken = prev[prev.length - 1];
          if (
            isDoubleTap ||
            (lastToken &&
              lastToken.kind === 'special' &&
              lastToken.label === 'backspace')
          ) {
            return [];
          }
          if (lastToken && lastToken.kind === 'text') {
            if (lastToken.label.length <= 1) {
              // Single letter + backspace -> delete everything
              return [];
            }
            // Two or more letters + backspace -> delete the one letter just written
            return [
              ...prev.slice(0, -1),
              {
                ...lastToken,
                label: lastToken.label.slice(0, -1),
              },
            ];
          }
          return [
            ...prev,
            {
              id: `tok-${now}-${Math.random()}`,
              label: 'backspace',
              kind: 'special',
            },
          ];
        });
        return;
      }

      lastBackspaceTimeRef.current = 0;

      // 2. Handle Modifiers (Green pills: ctrl, win, shift, alt)
      if (
        e.key === 'Control' ||
        e.key === 'Meta' ||
        e.key === 'Shift' ||
        e.key === 'Alt'
      ) {
        const modLabel =
          e.key === 'Control'
            ? 'ctrl'
            : e.key === 'Meta'
            ? 'win'
            : e.key === 'Shift'
            ? 'shift'
            : 'alt';

        setActionTokens((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.kind === 'modifier' && last.label === modLabel) {
            return prev;
          }
          return [
            ...prev,
            {
              id: `tok-${Date.now()}-${Math.random()}`,
              label: modLabel,
              kind: 'modifier',
            },
          ];
        });
        return;
      }

      // 3. Handle CapsLock & NumLock
      if (e.code === 'CapsLock' || e.key === 'CapsLock') {
        setActionTokens((prev) => [
          ...prev,
          {
            id: `tok-${Date.now()}-${Math.random()}`,
            label: 'caps lock',
            kind: 'special',
          },
        ]);
        return;
      }
      if (e.code === 'NumLock' || e.key === 'NumLock') {
        setActionTokens((prev) => [
          ...prev,
          {
            id: `tok-${Date.now()}-${Math.random()}`,
            label: 'num lock',
            kind: 'special',
          },
        ]);
        return;
      }

      // 4. Handle Numpad keys
      if (e.code.startsWith('Numpad') || e.location === 3) {
        const numpadMap: Record<string, string> = {
          Numpad0: 'num 0',
          Numpad1: 'num 1',
          Numpad2: 'num 2',
          Numpad3: 'num 3',
          Numpad4: 'num 4',
          Numpad5: 'num 5',
          Numpad6: 'num 6',
          Numpad7: 'num 7',
          Numpad8: 'num 8',
          Numpad9: 'num 9',
          NumpadAdd: 'num +',
          NumpadSubtract: 'num -',
          NumpadMultiply: 'num *',
          NumpadDivide: 'num /',
          NumpadDecimal: 'num .',
          NumpadEnter: 'num enter',
        };
        const npLabel =
          numpadMap[e.code] || `num ${e.key.toLowerCase()}`;
        setActionTokens((prev) => [
          ...prev,
          {
            id: `tok-${Date.now()}-${Math.random()}`,
            label: npLabel,
            kind: 'special',
          },
        ]);
        return;
      }

      // 5. Handle other non-character special keys
      if (e.key.length > 1) {
        const specialMap: Record<string, string> = {
          Enter: 'enter',
          Tab: 'tab',
          Escape: 'esc',
          Delete: 'delete',
          Insert: 'insert',
          Home: 'home',
          End: 'end',
          PageUp: 'page up',
          PageDown: 'page down',
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        };
        const spLabel = specialMap[e.key] || e.key.toLowerCase();
        setActionTokens((prev) => [
          ...prev,
          {
            id: `tok-${Date.now()}-${Math.random()}`,
            label: spLabel,
            kind: 'special',
          },
        ]);
        return;
      }

      // 6. Handle Space or printable characters (letters/words/digits/symbols)
      if (e.key === ' ') {
        setActionTokens((prev) => {
          const last = prev[prev.length - 1];
          // If typing words, combine into the current text token or add space
          if (last && last.kind === 'text') {
            return prev;
          }
          return [
            ...prev,
            {
              id: `tok-${Date.now()}-${Math.random()}`,
              label: 'space',
              kind: 'special',
            },
          ];
        });
        return;
      }

      const char = e.key;
      setActionTokens((prev) => {
        const last = prev[prev.length - 1];
        // Combine consecutive typed letters/words into a single purple pill,
        // unless preceded by a modifier or special key (e.g. ctrl + v, win + shift + s)
        if (last && last.kind === 'text') {
          const prevBeforeLast = prev[prev.length - 2];
          const isSingleKeyAfterModifier =
            last.label.length === 1 &&
            prevBeforeLast &&
            prevBeforeLast.kind === 'modifier' &&
            (e.ctrlKey || e.metaKey || e.altKey);
          if (!isSingleKeyAfterModifier) {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                label: last.label + char,
              },
            ];
          }
        }
        return [
          ...prev,
          {
            id: `tok-${Date.now()}-${Math.random()}`,
            label: char,
            kind: 'text',
          },
        ];
      });
    };

    window.addEventListener('keydown', handleActionKeyDown);
    return () => {
      window.removeEventListener('keydown', handleActionKeyDown);
    };
  }, [creatorModalTab, actionAdvanceMode, actionRecordingStatus]);

  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      // 1. Handle keycap tile drag with subtle corner-held circular swing
      const session = dragSessionRef.current;
      if (session) {
        const dist = Math.hypot(
          e.clientX - session.startX,
          e.clientY - session.startY
        );
        if (!session.isDragging && dist >= 4) {
          session.isDragging = true;
          suppressNextClickRef.current = true;
          dragRawRotate.jump(0);
          dragRawBobY.jump(0);
          dragSpringRotate.jump(0);
          dragSpringBobY.jump(0);
        }
        if (session.isDragging) {
          const vx = e.clientX - session.lastX;
          session.lastX = e.clientX;
          session.lastY = e.clientY;

          // Subtle circular motion as if held at the corner when dragging left/right
          const clampedVx = Math.max(-14, Math.min(14, vx));
          const subtleRotate = clampedVx * 0.45; // max ±6.3 deg
          const subtleArcY = -Math.abs(clampedVx) * 0.16; // gentle 0..2.2px circular lift

          dragRawRotate.set(subtleRotate);
          dragRawBobY.set(subtleArcY);

          if (dragTiltDecayTimeoutRef.current) {
            window.clearTimeout(dragTiltDecayTimeoutRef.current);
          }
          dragTiltDecayTimeoutRef.current = window.setTimeout(() => {
            dragRawRotate.set(0);
            dragRawBobY.set(0);
          }, 55);

          setDraggedTile({
            item: session.item,
            sourceTab: session.sourceTab,
            fromSlotId: session.fromSlotId,
            fromSubAction: session.fromSubAction,
            x: e.clientX,
            y: e.clientY,
          });
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const subEl = el?.closest(
            '[data-drop-encoder-sub]'
          ) as HTMLElement | null;
          if (subEl) {
            const slotId = subEl.getAttribute(
              'data-drop-slot'
            ) as KeySlotId | null;
            const subAction = subEl.getAttribute(
              'data-drop-encoder-sub'
            ) as EncoderSubActionId | null;
            if (slotId && subAction) {
              setDragOverTarget({ slotId, subAction });
              return;
            }
          }
          const slotEl = el?.closest('[data-drop-slot]') as HTMLElement | null;
          if (slotEl) {
            const slotId = slotEl.getAttribute(
              'data-drop-slot'
            ) as KeySlotId | null;
            if (slotId) {
              setDragOverTarget({ slotId });
              return;
            }
          }
          setDragOverTarget(null);
        }
        return;
      }

      // 2. Handle dragging/reordering an Advance Mode "Assign Key" capsule via the 6-dot handle
      const advDrag = advStepDragRef.current;
      if (advDrag) {
        const dy = e.clientY - advDrag.startY;
        const swapThreshold = 54;
        if (Math.abs(dy) >= swapThreshold) {
          const dir = dy > 0 ? 1 : -1;
          let didSwap = false;
          setActionAdvanceSteps((prev) => {
            const idx = prev.findIndex((s) => s.id === advDrag.id);
            const targetIdx = idx + dir;
            if (idx === -1 || targetIdx < 0 || targetIdx >= prev.length) {
              return prev;
            }
            didSwap = true;
            const next = [...prev];
            const [moved] = next.splice(idx, 1);
            next.splice(targetIdx, 0, moved);
            return next;
          });
          if (didSwap) {
            advDrag.startY += dir * swapThreshold;
          }
        }
        setDraggingAdvStep({
          id: advDrag.id,
          offsetY: e.clientY - advDrag.startY,
        });
        return;
      }

      // 3. Handle moving the Macropad + "Edit layout" unit in the blank area
      const padDrag = macropadDragRef.current;
      if (padDrag) {
        const dx = e.clientX - padDrag.startX;
        const dy = e.clientY - padDrag.startY;
        if (!padDrag.isMoving && Math.hypot(dx, dy) >= 4) {
          padDrag.isMoving = true;
          suppressNextClickRef.current = true;
          setIsDraggingMacropad(true);
        }
        if (padDrag.isMoving) {
          const nextClamped = clampMacropadOffset(
            padDrag.initialOffsetX + dx,
            padDrag.initialOffsetY + dy
          );
          setMacropadOffset(nextClamped);
        }
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (advStepDragRef.current) {
        advStepDragRef.current = null;
        setDraggingAdvStep(null);
      }

      if (macropadDragRef.current) {
        if (macropadDragRef.current.isMoving) {
          setTimeout(() => {
            suppressNextClickRef.current = false;
          }, 40);
        }
        macropadDragRef.current = null;
        setIsDraggingMacropad(false);
      }

      const session = dragSessionRef.current;
      if (!session) return;
      if (dragTiltDecayTimeoutRef.current) {
        window.clearTimeout(dragTiltDecayTimeoutRef.current);
      }
      if (session.isDragging) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const subEl = el?.closest('[data-drop-encoder-sub]') as HTMLElement | null;
        if (subEl) {
          const slotId = subEl.getAttribute('data-drop-slot') as KeySlotId | null;
          const subAction = subEl.getAttribute(
            'data-drop-encoder-sub'
          ) as EncoderSubActionId | null;
          if (slotId && subAction) {
            if (session.fromSlotId) {
              swapMacropadSlots(
                session.fromSlotId,
                slotId,
                session.fromSubAction,
                subAction
              );
            } else {
              assignItemToSlot(
                session.item,
                slotId,
                subAction,
                session.sourceTab
              );
            }
          }
        } else {
          const slotEl = el?.closest('[data-drop-slot]') as HTMLElement | null;
          if (slotEl) {
            const slotId = slotEl.getAttribute('data-drop-slot') as KeySlotId | null;
            if (slotId) {
              if (session.fromSlotId) {
                swapMacropadSlots(
                  session.fromSlotId,
                  slotId,
                  session.fromSubAction,
                  undefined
                );
              } else {
                assignItemToSlot(
                  session.item,
                  slotId,
                  undefined,
                  session.sourceTab
                );
              }
            }
          }
        }
        setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 40);
      }
      dragSessionRef.current = null;
      setDraggedTile(null);
      setDragOverTarget(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  });

  const handleStartTileDrag = (
    e: React.PointerEvent,
    item: BasicTileItem,
    sourceTab: MappingTabId = mappingTab
  ) => {
    if (e.button !== 0) return;
    dragSessionRef.current = {
      item,
      sourceTab,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      isDragging: false,
    };
  };

  const handleStartMacropadMove = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // Only move the macropad when holding the black outer part (not any key or encoder button)
    if ((e.target as HTMLElement).closest('button')) return;
    if (dragSessionRef.current) return;
    macropadDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: macropadOffset.x,
      initialOffsetY: macropadOffset.y,
      isMoving: false,
    };
  };

  const handleResetMacropadCenter = (e: React.MouseEvent) => {
    // Double-clicking on the black outer part returns the macropad to the center
    if ((e.target as HTMLElement).closest('button')) return;
    setMacropadOffset({ x: 0, y: 0 });
  };

  const handleStartMacropadKeyDrag = (
    e: React.PointerEvent,
    slotId: KeySlotId,
    subAction?: EncoderSubActionId
  ) => {
    if (e.button !== 0) return;
    // Do not allow dragging from circular button or encoder bodies directly
    if (
      slotId === 'btn-bl' ||
      ((slotId === 'dial-tl' || slotId === 'knob-tr') && !subAction)
    ) {
      return;
    }

    const assignment = currentLayer[slotId];
    if (
      !subAction &&
      !assignment?.iconId &&
      (!assignment?.label ||
        assignment.label === '—' ||
        assignment.binding === 'blank')
    ) {
      return;
    }

    let displayLabel = assignment?.label || slotId.toUpperCase();
    let displayBinding = assignment?.binding || displayLabel;

    if (subAction && (slotId === 'dial-tl' || slotId === 'knob-tr')) {
      const actions = getEncoderActions(assignment, slotId);
      const subEntry = actions[subAction];
      if (!subEntry || subEntry.label === '—' || subEntry.binding === 'blank') {
        return;
      }
      displayLabel = subEntry.label || subAction.toUpperCase();
      displayBinding = subEntry.binding || displayLabel;
    }

    const previewItem: BasicTileItem = {
      id: `macropad-drag-${slotId}-${subAction || 'main'}`,
      main: displayLabel,
      macropadLabel: displayLabel,
      listLabel: displayBinding,
      iconId: subAction ? undefined : assignment?.iconId,
    };

    dragSessionRef.current = {
      item: previewItem,
      sourceTab: 'Basic',
      fromSlotId: slotId,
      fromSubAction: subAction,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      isDragging: false,
    };
  };

  const handleSelectKey = (slotId: KeySlotId) => {
    if (suppressNextClickRef.current) return;
    if (slotId === 'dial-tl' || slotId === 'knob-tr') {
      if (slotId === 'dial-tl') {
        setDialAngle((a) => (a + 30) % 360);
      } else {
        setKnobAngle((a) => (a + 45) % 360);
      }
      if (selectedKey === slotId && !selectedEncoderSub) {
        setSelectedKey(null);
      } else {
        setSelectedKey(slotId);
        setSelectedEncoderSub(null);
      }
      return;
    }
    if (selectedDrawerTile && !selectedKey && slotId !== 'btn-bl') {
      assignItemToSlot(
        selectedDrawerTile.item,
        slotId,
        undefined,
        selectedDrawerTile.sourceTab
      );
      setSelectedDrawerTile(null);
      return;
    }
    setSelectedKey(slotId);
    setSelectedEncoderSub(null);
    setMappingDrawerOpen(true);
    setMappingStackExpanded(false);
    setHoveredMappingType(null);
  };

  const handleSelectEncoderSubAction = (
    slotId: 'dial-tl' | 'knob-tr',
    subAction: EncoderSubActionId
  ) => {
    if (suppressNextClickRef.current) return;
    if (selectedDrawerTile) {
      assignItemToSlot(
        selectedDrawerTile.item,
        slotId,
        subAction,
        selectedDrawerTile.sourceTab
      );
      setSelectedDrawerTile(null);
      return;
    }
    setSelectedKey(slotId);
    setSelectedEncoderSub(subAction);
    setMappingDrawerOpen(true);
    setMappingStackExpanded(false);
    setHoveredMappingType(null);
  };

  const handleOpenDrawerWithTab = (tab: MappingTabId) => {
    setMappingTab(tab);
    setMappingDrawerOpen(true);
    setMappingStackExpanded(false);
    setHoveredMappingType(null);
  };

  const triggerTileFlash = (tileId: string) => {
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    setFlashedTileId(tileId);
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashedTileId((prev) => (prev === tileId ? null : prev));
    }, 240);
  };

  const handleAssignTileFromDrawer = (item: BasicTileItem) => {
    if (suppressNextClickRef.current) return;
    triggerTileFlash(item.id);
    setSelectedDrawerTile((prev) =>
      prev?.item.id === item.id ? null : { item, sourceTab: mappingTab }
    );
    if (
      selectedKey &&
      ((selectedKey !== 'dial-tl' && selectedKey !== 'knob-tr') ||
        selectedEncoderSub)
    ) {
      assignItemToSlot(
        item,
        selectedKey,
        selectedEncoderSub || undefined,
        mappingTab
      );
    }
  };

  const toggleListSection = (title: string) => {
    setExpandedListSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleOpenCreatorEditor = (
    tab: Exclude<MappingTabId, 'Basic'>,
    existingItem?: BasicTileItem
  ) => {
    setCreatorModalTab(tab);
    setIconPickerOpen(false);
    setIconPickerSearch('');
    setActiveGestureDropdown(null);
    setActiveAdvanceStepDropdown(null);
    setGestureKeySearch('');
    setExpandedGestureSection(null);
    setSmartAppDropdownOpen(false);

    if (existingItem) {
      setEditingCustomItemId(existingItem.id);
      setNewCustomName(existingItem.main);
      setSelectedIconId(existingItem.iconId);
      setSelectedEmoji(existingItem.emoji);
      setNewCustomBinding(existingItem.listLabel || '');
      if (tab === 'Action') {
        setActionAdvanceMode(false);
        const rawSeq = existingItem.listLabel || '';
        const match = rawSeq.match(/\((.+)\)$/);
        const seqStr = match ? match[1] : '';
        if (seqStr) {
          const parts = seqStr.split(' + ').map((s) => s.trim()).filter(Boolean);
          setActionTokens(
            parts.map((lbl, idx) => ({
              id: `tok-init-${idx}`,
              label: lbl,
              kind: ['ctrl', 'control', 'win', 'shift', 'alt', 'cmd'].includes(
                lbl.toLowerCase()
              )
                ? 'modifier'
                : 'text',
            }))
          );
          setActionRecordingStatus('confirmed');
        } else {
          setActionTokens([]);
          setActionRecordingStatus('idle');
        }
      }
    } else {
      setEditingCustomItemId(null);
      setSelectedIconId(undefined);
      setSelectedEmoji(undefined);
      if (tab === 'Multi-A') {
        setNewCustomName('My Multiaction');
        setMultiGestures({
          onTap: '',
          doubleTap: '',
          onHold: '',
          tapHold: '',
        });
        setTappingTermMs('250');
      } else if (tab === 'Smart-A') {
        setNewCustomName('My Smart action');
        setSmartSubTab('Text');
        setSmartTextValue('');
        setSmartCmdValue('');
        setSmartWebValue('');
        setSmartAppValue('');
      } else {
        setNewCustomName('My Action');
        setNewCustomBinding('');
        setActionAdvanceMode(false);
        setActionRecordingStatus('idle');
        setActionTokens([]);
        setActionAdvanceSteps([
          {
            id: 'adv-step-1',
            keyLabel: '',
            mode: 'press-release',
            delayAfterActive: false,
            delayAfterMs: '200',
          },
        ]);
      }
    }
  };

  const handleSaveCustomItem = () => {
    if (!creatorModalTab) return;
    if (creatorModalTab === 'Action') {
      const hasAssignedKeys = actionAdvanceMode
        ? actionAdvanceSteps.some((s) => !!s.keyLabel.trim())
        : actionTokens.length > 0;
      if (!hasAssignedKeys) return;
    } else if (creatorModalTab === 'Multi-A') {
      const hasGesture = Object.values(multiGestures).some((v) => !!v.trim());
      if (!hasGesture) return;
    } else if (creatorModalTab === 'Smart-A') {
      const val =
        smartSubTab === 'Text'
          ? smartTextValue
          : smartSubTab === 'Cmd'
          ? smartCmdValue
          : smartSubTab === 'Web'
          ? smartWebValue
          : smartAppValue;
      if (!val.trim()) return;
    }

    const defaultName =
      creatorModalTab === 'Multi-A'
        ? 'My Multiaction'
        : creatorModalTab === 'Smart-A'
        ? 'My Smart action'
        : 'My Action';
    const finalName = newCustomName.trim() || defaultName;

    let summaryBinding = finalName;
    if (creatorModalTab === 'Multi-A') {
      const parts = Object.entries(multiGestures)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`);
      summaryBinding =
        parts.length > 0 ? `${finalName} (${parts.join(', ')})` : finalName;
    } else if (creatorModalTab === 'Smart-A') {
      const val =
        smartSubTab === 'Text'
          ? smartTextValue
          : smartSubTab === 'Cmd'
          ? smartCmdValue
          : smartSubTab === 'Web'
          ? smartWebValue
          : smartAppValue;
      summaryBinding = val.trim()
        ? `${finalName} (${smartSubTab}: ${val.trim()})`
        : finalName;
    } else if (creatorModalTab === 'Action') {
      if (actionAdvanceMode) {
        const advParts: string[] = [];
        actionAdvanceSteps.forEach((s, idx) => {
          if (s.keyLabel.trim()) {
            advParts.push(s.keyLabel.trim());
          }
          if (
            idx < actionAdvanceSteps.length - 1 &&
            s.delayAfterActive &&
            s.delayAfterMs?.trim()
          ) {
            advParts.push(`${s.delayAfterMs.trim()}ms`);
          }
        });
        summaryBinding =
          advParts.length > 0
            ? `${finalName} (${advParts.join(' + ')})`
            : finalName;
      } else if (actionTokens.length > 0) {
        const tokenCombo = actionTokens.map((t) => t.label).join(' + ');
        summaryBinding = `${finalName} (${tokenCombo})`;
      } else if (newCustomBinding.trim()) {
        summaryBinding = `${finalName} (${newCustomBinding.trim()})`;
      }
    }

    const created: BasicTileItem = {
      id: editingCustomItemId || `custom-${Date.now()}`,
      main: finalName,
      listLabel: summaryBinding,
      macropadLabel: selectedEmoji ? selectedEmoji : finalName,
      iconId: selectedIconId,
      emoji: selectedEmoji,
    };

    setCustomItemsByTab((prev) => {
      const list = prev[creatorModalTab];
      const exists = list.some((i) => i.id === created.id);
      return {
        ...prev,
        [creatorModalTab]: exists
          ? list.map((i) => (i.id === created.id ? created : i))
          : [...list, created],
      };
    });

    setIconPickerOpen(false);
    setActiveGestureDropdown(null);
    setActiveAdvanceStepDropdown(null);
    setCreatorModalTab(null);
    showToast(`Saved "${finalName}"`);
  };

  const handleDiscardCustomItem = () => {
    if (!creatorModalTab) return;
    handleOpenCreatorEditor(creatorModalTab);
    showToast('Discarded unsaved changes');
  };

  const handleDeleteCustomItem = () => {
    if (!creatorModalTab) return;
    if (editingCustomItemId) {
      setCustomItemsByTab((prev) => ({
        ...prev,
        [creatorModalTab]: prev[creatorModalTab].filter(
          (i) => i.id !== editingCustomItemId
        ),
      }));
      showToast('Deleted item');
    }
    setIconPickerOpen(false);
    setActiveGestureDropdown(null);
    setCreatorModalTab(null);
  };

  const handleInstallPreset = (preset: PresetItem) => {
    const clonedLayer: LayerKeymap = JSON.parse(JSON.stringify(preset.layerKeymap));
    const nextProfiles = profiles.map((p, idx) => {
      if (idx !== activeProfileIndex) return p;
      return {
        ...p,
        layers: [...p.layers, clonedLayer],
      };
    });
    pushState(nextProfiles);
    setActiveLayerIndex(currentProfile.layers.length);
    setPreviewPreset(null);
    setActiveNav('Keymap');
    showToast(
      `Installed ${preset.title} preset on Layer ${currentProfile.layers.length + 1}`
    );
  };

  const handleDuplicateProfile = (idx: number) => {
    const source = profiles[idx];
    const duplicated: ProfileData = {
      id: `prof-${Date.now()}`,
      name: `${source.name} Copy`,
      color: source.color,
      layers: JSON.parse(JSON.stringify(source.layers)),
    };
    const next = [...profiles, duplicated];
    pushState(next);
    setActiveProfileIndex(next.length - 1);
    setActiveLayerIndex(0);
    showToast(`Duplicated "${source.name}"`);
  };

  const handleExportProfile = (idx: number) => {
    const source = profiles[idx];
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(source, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute(
      'download',
      `${source.name.toLowerCase().replace(/\s+/g, '-')}.json`
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(`Exported "${source.name}"`);
  };

  const handleAddProfile = () => {
    const nextProf: ProfileData = {
      id: `prof-${Date.now()}`,
      name: '',
      color: '#0051ff',
      layers: [JSON.parse(JSON.stringify(INITIAL_LAYER_1))],
    };
    const next = [...profiles, nextProf];
    pushState(next);
    setActiveProfileIndex(next.length - 1);
    setActiveLayerIndex(0);
    setDeletingProfileId(null);
  };

  const handleUpdateCurrentProfileName = (newName: string) => {
    const next = profiles.map((p, idx) =>
      idx === activeProfileIndex ? { ...p, name: newName } : p
    );
    setProfiles(next);
  };

  const handleConfirmDeleteProfile = (idx: number) => {
    if (profiles.length <= 1) {
      const resetProf: ProfileData = {
        id: `prof-${Date.now()}`,
        name: 'Default Profile',
        color: '#0051ff',
        layers: [JSON.parse(JSON.stringify(INITIAL_LAYER_1))],
      };
      pushState([resetProf]);
      setActiveProfileIndex(0);
      setActiveLayerIndex(0);
      setDeletingProfileId(null);
      return;
    }
    const next = profiles.filter((_, i) => i !== idx);
    pushState(next);
    setActiveProfileIndex((prev) =>
      prev >= next.length ? Math.max(0, next.length - 1) : prev
    );
    setActiveLayerIndex(0);
    setDeletingProfileId(null);
  };

  const hueToHex = (h: number): string => {
    const s = 1;
    const l = 0.5;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }
    const toHex = (n: number) =>
      Math.round((n + m) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const handleImportProfile = () => {
    const imported: ProfileData = {
      id: `imported-${Date.now()}`,
      name: 'Imported Profile',
      color: '#0051ff',
      layers: [JSON.parse(JSON.stringify(PRESET_LIBRARY[2].layerKeymap))],
    };
    const next = [...profiles, imported];
    pushState(next);
    setActiveProfileIndex(next.length - 1);
    setActiveLayerIndex(0);
    setProfileMenuOpen(false);
    showToast('Imported profile configuration');
  };

  const filteredPresets = PRESET_LIBRARY.filter(
    (p) =>
      p.title.toLowerCase().includes(presetSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(presetSearch.toLowerCase())
  );

  const filteredBasicSections = BASIC_KEY_SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter(
      (item) =>
        !mappingSearch.trim() ||
        item.main.toLowerCase().includes(mappingSearch.toLowerCase()) ||
        (item.listLabel &&
          item.listLabel.toLowerCase().includes(mappingSearch.toLowerCase())) ||
        (item.top && item.top.toLowerCase().includes(mappingSearch.toLowerCase())) ||
        sec.title.toLowerCase().includes(mappingSearch.toLowerCase())
    ),
  })).filter((sec) => sec.items.length > 0);

  return (
    <div className="h-screen w-full bg-[#efefef] flex flex-col select-none relative overflow-hidden">
      {/* TOP NAVIGATION BAR */}
      <header className="h-[38px] w-full bg-[#000000] flex items-center justify-between pl-[18px] pr-0 shrink-0 z-40">
        {/* Left Zone: Brand Logo + Undo/Redo */}
        <div className="flex items-center gap-[22px] shrink-0 min-w-[140px]">
          <button
            onClick={() => {
              setActiveNav('Keymap');
              setSelectedKey(null);
              setMappingDrawerOpen(false);
              setMappingStackExpanded(false);
            }}
            className="flex items-center gap-[3px] text-white hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
            title="Creator Micro 2 Studio"
          >
            <svg
              width="32"
              height="14"
              viewBox="0 0 32 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.2 2.5V11.5M0.2 7H8.2"
                stroke="white"
                strokeWidth="2.1"
                strokeLinecap="square"
              />
              <path d="M15.2 2.2L19.6 7L15.2 11.8L10.8 7L15.2 2.2Z" fill="white" />
              <path
                d="M23.2 8.2L25.4 10.8L30.5 3.4"
                stroke="white"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {activeNav === 'Keymap' && (
            <div className="flex items-center gap-[9px]">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                title="Undo"
                className={`w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer ${
                  history.length > 0
                    ? 'text-[#b0b0b0] hover:text-white'
                    : 'text-[#6c6c6c] hover:text-[#909090]'
                }`}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5.5 3.5L2.5 6.5L5.5 9.5" />
                  <path d="M2.5 6.5H10C12.2091 6.5 14 8.29086 14 10.5C14 12.7091 12.2091 14.5 10 14.5H6" />
                </svg>
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                title="Redo"
                className={`w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer ${
                  redoStack.length > 0
                    ? 'text-[#b0b0b0] hover:text-white'
                    : 'text-[#6c6c6c] hover:text-[#909090]'
                }`}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.5 3.5L13.5 6.5L10.5 9.5" />
                  <path d="M13.5 6.5H6C3.79086 6.5 2 8.29086 2 10.5C2 12.7091 3.79086 14.5 6 14.5H10" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Center Zone: Keymap | Preset | Settings */}
        <nav className="flex items-center gap-[28px] text-[12.5px] tracking-[0.01em] whitespace-nowrap shrink-0">
          {(['Keymap', 'Preset', 'Settings'] as const).map((tab) => {
            const isActive = activeNav === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveNav(tab);
                  setActiveTooltip(null);
                  setProfileMenuOpen(false);
                }}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-[#cecece] hover:text-white font-normal'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </nav>

        {/* Right Zone: Blue Device Connection Pill */}
        <div className="h-full bg-[#0051ff] pl-[12px] pr-[14px] flex items-center gap-[14px] text-white shrink-0">
          <ChevronDown className="w-[13px] h-[13px] stroke-[2] text-white/95 shrink-0" />
          <span className="text-[12px] font-normal tracking-[0.01em] whitespace-nowrap">
            Creator Micro 2
          </span>
          <div className="h-[15px] w-[1px] bg-white/35" />
          <div className="flex items-center gap-[8px]">
            <svg
              width="8"
              height="13"
              viewBox="0 0 8 13"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Battery 100%"
            >
              <rect x="2.2" y="0.5" width="3.6" height="1.5" rx="0.4" fill="white" />
              <rect x="0.5" y="2" width="7" height="10.5" rx="1.2" fill="white" />
            </svg>
            <svg
              width="11"
              height="14"
              viewBox="0 0 12 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="USB Connected"
            >
              <path
                d="M6 1.5V12M6 1.5L4.3 3.5H7.7L6 1.5ZM6 9.5L2.8 7.3V4.8M6 8.2L9.2 6V4.2"
                stroke="white"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="2.8" cy="4.4" r="1.1" fill="white" />
              <rect x="8.1" y="2.8" width="2.1" height="2.1" fill="white" />
              <circle cx="6" cy="12.5" r="1.5" fill="white" />
            </svg>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* ===================================================================== */}
        {/* 1. KEYMAP VIEW                                                        */}
        {/* ===================================================================== */}
        {activeNav === 'Keymap' && (
          <motion.main
            ref={keymapMainRef}
            key="keymap-screen"
            initial={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.01, filter: 'blur(4px)' }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="flex-1 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Sub-Header Controls Bar: Profiles (left), Layers (center), Key Mapping (right) */}
            <div className="w-full px-[27px] pt-[24px] grid grid-cols-3 items-start z-20 pointer-events-none">
            {/* LEFT: Profiles */}
            <div
              ref={profileContainerRef}
              className="flex flex-col items-start relative pointer-events-auto w-fit"
            >
              <div className="flex items-center gap-[5px] text-[#666666] text-[12.5px] font-normal">
                <span>Profiles</span>
                <button
                  onClick={() =>
                    setActiveTooltip(activeTooltip === 'profiles' ? null : 'profiles')
                  }
                  onMouseEnter={() => setActiveTooltip('profiles')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="text-[#666666] hover:text-[#222] transition-colors cursor-pointer"
                  aria-label="Profiles Info"
                >
                  <InfoCircleIcon />
                </button>
              </div>

              <AnimatePresence>
                {activeTooltip === 'profiles' && (
                  <motion.div
                    key="profiles-tooltip"
                    initial={{ opacity: 0, y: -5, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute top-[25px] -left-[20px] w-[262px] bg-[#ececec] rounded-[16px] px-[18px] py-[15px] shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-black/[0.04] text-left z-40 pointer-events-none"
                  >
                    <div className="text-[13px] font-semibold text-[#666666] mb-[9px]">
                      What are Profiles?
                    </div>
                    <p className="text-[11px] leading-[1.36] text-[#686868]">
                      Profiles let you create different key configurations for different workflows. Each profile stores its own layers, key mappings, and actions. Switch profile to instantly change how your device behaves.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-[10px] flex items-center gap-[9px] relative">
                <div
                  onClick={() => {
                    if (!profileMenuOpen) setProfileMenuOpen(true);
                  }}
                  className="h-[30px] w-[142px] px-[10px] rounded-full bg-[#e2e2e2] hover:bg-[#dadada] border-[1.5px] border-transparent hover:border-[#0051ff] focus-within:border-[#0051ff] flex items-center gap-[6px] transition-all cursor-pointer"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    className="shrink-0"
                  >
                    <path
                      d="M5 0.5L9.2 5L5 9.5L0.8 5L5 0.5Z"
                      fill={currentProfile.color}
                    />
                  </svg>
                  <input
                    type="text"
                    value={currentProfile.name}
                    onChange={(e) =>
                      handleUpdateCurrentProfileName(e.target.value)
                    }
                    placeholder="Profile name..."
                    className="w-full bg-transparent text-[#6a6a6a] placeholder:text-[#9c9c9c] text-[11.5px] font-medium truncate focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => {
                    setProfileMenuOpen((o) => !o);
                    setDeletingProfileId(null);
                  }}
                  aria-label="Toggle profile list"
                  className={`w-[26px] h-[26px] rounded-full border-[1.5px] flex items-center justify-center transition-all cursor-pointer ${
                    profileMenuOpen
                      ? 'bg-[#000000] text-white border-[#000000]'
                      : 'bg-white hover:bg-neutral-50 text-[#4a4a4a] border-transparent hover:border-[#0051ff] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                  }`}
                >
                  {profileMenuOpen ? (
                    <ChevronUp className="w-[13px] h-[13px] stroke-[2]" />
                  ) : (
                    <ChevronDown className="w-[13px] h-[13px] stroke-[1.8]" />
                  )}
                </button>

                <AnimatePresence>
                  {profileMenuOpen && (
                    <motion.div
                      key="profile-dropdown-tray"
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                      style={{ transformOrigin: 'top left' }}
                      className="absolute top-[37px] left-0 w-[262px] bg-[#e4e4e4] rounded-[18px] p-[9px] shadow-[0_4px_14px_rgba(0,0,0,0.08)] border border-black/[0.03] z-40 space-y-[7px]"
                    >
                      {profiles.map((prof, idx) => {
                        const isSelected = idx === activeProfileIndex;
                        const isConfirmingDelete =
                          deletingProfileId === prof.id;

                        return (
                          <motion.div
                            key={prof.id}
                            layout
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <AnimatePresence mode="wait" initial={false}>
                              {isConfirmingDelete ? (
                                <motion.div
                                  key="confirm-delete"
                                  initial={{ opacity: 0, scale: 0.96 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.96 }}
                                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                                  className="flex items-center gap-[6px]"
                                >
                                  <button
                                    onClick={() => setDeletingProfileId(null)}
                                    className="h-[28px] px-[12px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] text-[11px] font-medium text-[#444444] shrink-0 transition-all cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleConfirmDeleteProfile(idx)}
                                    className="flex-1 h-[28px] rounded-full bg-[#dc0000] hover:bg-[#c40000] text-white text-[11px] font-semibold flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    Click to delete
                                  </button>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="normal-row"
                                  initial={{ opacity: 0, scale: 0.96 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.96 }}
                                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                                  className="flex items-center gap-[5px]"
                                >
                                  {/* 6-Dot Drag Handle Circle */}
                                  <button
                                    type="button"
                                    title="Reorder profile"
                                    className="w-[27px] h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#444444] shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-grab active:cursor-grabbing"
                                  >
                                    <svg
                                      width="10"
                                      height="12"
                                      viewBox="0 0 10 12"
                                      fill="currentColor"
                                    >
                                      <circle cx="3" cy="2.5" r="1" />
                                      <circle cx="7" cy="2.5" r="1" />
                                      <circle cx="3" cy="6" r="1" />
                                      <circle cx="7" cy="6" r="1" />
                                      <circle cx="3" cy="9.5" r="1" />
                                      <circle cx="7" cy="9.5" r="1" />
                                    </svg>
                                  </button>

                                  {/* Profile Pill (Blue in our theme when active, White when inactive) */}
                                  <button
                                    onClick={() => {
                                      setActiveProfileIndex(idx);
                                      setActiveLayerIndex(0);
                                      setDeletingProfileId(null);
                                    }}
                                    className={`flex-1 h-[27px] px-[10px] rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center gap-[6px] text-[11px] font-medium truncate transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#0051ff] text-white'
                                        : 'bg-white text-[#444444] hover:bg-neutral-50'
                                    }`}
                                  >
                                    {isSelected && (
                                      <svg
                                        width="9"
                                        height="9"
                                        viewBox="0 0 10 10"
                                        fill="none"
                                        className="shrink-0"
                                      >
                                        <path
                                          d="M5 0.5L9.2 5L5 9.5L0.8 5L5 0.5Z"
                                          fill="#ffffff"
                                        />
                                      </svg>
                                    )}
                                    <span className="truncate">
                                      {prof.name || (isSelected ? '' : 'Untitled Profile')}
                                    </span>
                                  </button>

                                  {/* Duplicate Profile */}
                                  <button
                                    onClick={() => handleDuplicateProfile(idx)}
                                    title="Duplicate profile"
                                    className="w-[27px] h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#444444] shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
                                  >
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 16 16"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.4"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <rect
                                        x="5.5"
                                        y="3.5"
                                        width="7.5"
                                        height="9.5"
                                        rx="1.5"
                                      />
                                      <path d="M3 6.5V12.5C3 13.3 3.7 14 4.5 14H10" />
                                    </svg>
                                  </button>

                                  {/* Export Profile */}
                                  <button
                                    onClick={() => handleExportProfile(idx)}
                                    title="Export profile"
                                    className="w-[27px] h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#444444] shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
                                  >
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 16 16"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.4"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M8 2.5V10.5M8 10.5L5.2 7.7M8 10.5L10.8 7.7" />
                                      <path d="M3 11.5V12.5C3 13.1 3.4 13.5 4 13.5H12C12.6 13.5 13 13.1 13 12.5V11.5" />
                                    </svg>
                                  </button>

                                  {/* Delete Profile (× button only shown when more than 1 profile exists) */}
                                  {profiles.length > 1 && (
                                    <button
                                      onClick={() => setDeletingProfileId(prof.id)}
                                      title="Delete profile"
                                      className="w-[27px] h-[27px] rounded-full bg-white hover:bg-[#dc0000] text-[#444444] hover:text-white flex items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors cursor-pointer"
                                    >
                                      <X className="w-[12px] h-[12px] stroke-[1.8]" />
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}

                      <div className="flex items-center gap-[6px]">
                        <button
                          onClick={handleAddProfile}
                          className="flex-1 h-[28px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center gap-[5px] text-[11px] font-medium text-[#444444] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
                        >
                          <Plus className="w-[11px] h-[11px] stroke-[2]" />
                          <span>Add Profile</span>
                        </button>

                        <button
                          onClick={handleImportProfile}
                          className="h-[28px] px-[10px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center gap-[5px] text-[11px] font-medium text-[#444444] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
                        >
                          <svg
                            width="10"
                            height="11"
                            viewBox="0 0 12 13"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M2 2H10" />
                            <path d="M6 11V4.5M6 4.5L3.5 7M6 4.5L8.5 7" />
                          </svg>
                          <span>Import</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* CENTER: Layers */}
            <div
              ref={layersContainerRef}
              className="flex flex-col items-center relative pointer-events-auto justify-self-center"
            >
              <div className="flex items-center gap-[5px] text-[#666666] text-[12.5px] font-normal">
                <span>Layers</span>
                <button
                  onClick={() =>
                    setActiveTooltip(activeTooltip === 'layers' ? null : 'layers')
                  }
                  onMouseEnter={() => setActiveTooltip('layers')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="text-[#666666] hover:text-[#222] transition-colors cursor-pointer"
                  aria-label="Layers Info"
                >
                  <InfoCircleIcon />
                </button>
              </div>

              <AnimatePresence>
                {activeTooltip === 'layers' && (
                  <motion.div
                    key="layers-tooltip"
                    initial={{ opacity: 0, y: -5, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute top-[25px] left-1/2 -translate-x-1/2 w-[262px] bg-[#ececec] rounded-[16px] px-[18px] py-[15px] shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-black/[0.04] text-left z-40 pointer-events-none"
                  >
                    <div className="text-[13px] font-semibold text-[#666666] mb-[9px]">
                      What is Layers?
                    </div>
                    <p className="text-[11px] leading-[1.36] text-[#686868]">
                      Layers work like programmable overlays. Each layer can contain a different set of key assignments. Activate or toggle layers to expand what a single key can do.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                layout
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="mt-[10px] flex items-center justify-center gap-[8px]"
              >
                <AnimatePresence initial={false}>
                  {currentProfile.layers.map((_, idx) => {
                    const isActive = idx === activeLayerIndex;
                    return (
                      <motion.button
                        key={idx}
                        layout
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.75 }}
                        whileTap={{ scale: 0.92 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => {
                          if (idx === activeLayerIndex) {
                            setLayerToolbarOpen((open) => {
                              if (open) {
                                setLayerLightingOpen(false);
                                setLayerDeleteConfirm(false);
                              }
                              return !open;
                            });
                          } else {
                            setActiveLayerIndex(idx);
                            setLayerToolbarOpen(true);
                            setLayerDeleteConfirm(false);
                          }
                        }}
                        title={`Layer ${idx + 1}`}
                        className={`w-[26px] h-[26px] rounded-full border-[1.5px] text-[11.5px] font-medium flex items-center justify-center transition-colors duration-200 tabular-nums cursor-pointer ${
                          isActive
                            ? layerToolbarOpen
                              ? 'bg-[#000000] border-[#000000] text-white'
                              : 'bg-[#0051ff] border-[#0051ff] text-white'
                            : 'bg-white text-[#444444] border-transparent hover:border-[#0051ff] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                        }`}
                      >
                        {idx + 1}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>

                {currentProfile.layers.length < 8 && (
                  <motion.button
                    layout
                    whileTap={{ scale: 0.92 }}
                    onClick={handleAddLayer}
                    title="Add Layer"
                    className="w-[26px] h-[26px] rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#555555] hover:bg-black/5 transition-all cursor-pointer"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    >
                      <path d="M6 1.5V10.5M1.5 6H10.5" />
                    </svg>
                  </motion.button>
                )}
              </motion.div>

              {/* LAYER ACTION TOOLBAR & LIGHTING POPOVER (Screenshots 1, 2, 3, 4) */}
              <AnimatePresence>
                {layerToolbarOpen && (
                  <motion.div
                    key="layer-action-toolbar"
                    initial={{ opacity: 0, y: -5, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-[9px] flex items-center gap-[6px] relative z-30"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {layerDeleteConfirm ? (
                        <motion.div
                          key="layer-delete-confirm"
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="flex items-center gap-[6px]"
                        >
                          <button
                            onClick={() => setLayerDeleteConfirm(false)}
                            className="h-[28px] px-[13px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] text-[11px] font-medium text-[#555555] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleRemoveLayer(activeLayerIndex)}
                            className="h-[28px] w-[184px] rounded-full bg-[#dc0000] hover:bg-[#c40000] text-white text-[11px] font-semibold flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-colors cursor-pointer"
                          >
                            Click to delete
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="layer-normal-controls"
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="flex items-center gap-[6px]"
                        >
                          {/* Layer Name Input Pill */}
                          <div className="w-[144px] h-[28px] px-[12px] rounded-full bg-[#e2e2e2] border-[1.5px] border-transparent focus-within:border-[#0051ff] flex items-center transition-colors">
                            <input
                              type="text"
                              value={currentLayerName}
                              onChange={(e) =>
                                setLayerNames((prev) => ({
                                  ...prev,
                                  [currentLayerNameKey]: e.target.value,
                                }))
                              }
                              placeholder="Layer name..."
                              className="w-full bg-transparent text-[11px] text-[#555555] placeholder:text-[#9c9c9c] focus:outline-none"
                            />
                          </div>

                          {/* Backlight / Underglow Lighting Pill Button */}
                          <button
                            onClick={() => setLayerLightingOpen((o) => !o)}
                            title="Layer lighting settings"
                            className={`w-[58px] h-[28px] rounded-full border-[1.5px] flex items-center justify-center transition-all cursor-pointer ${
                              layerLightingOpen
                                ? 'bg-[#000000] text-white border-[#000000]'
                                : 'bg-white hover:bg-neutral-50 text-[#555555] border-transparent hover:border-[#0051ff] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                            }`}
                          >
                            <svg
                              width="16"
                              height="14"
                              viewBox="0 0 18 15"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.45"
                              strokeLinecap="round"
                            >
                              <line x1="6.2" y1="11.5" x2="11.8" y2="11.5" />
                              <line x1="9" y1="5.2" x2="9" y2="7.2" />
                              <line x1="5.5" y1="6.6" x2="6.9" y2="8.0" />
                              <line x1="12.5" y1="6.6" x2="11.1" y2="8.0" />
                              <line x1="3.8" y1="9.6" x2="5.6" y2="9.6" />
                              <line x1="14.2" y1="9.6" x2="12.4" y2="9.6" />
                            </svg>
                          </button>

                          {/* Layer Settings Gear Button */}
                          <button
                            onClick={() => {
                              setLayerLightingOpen(false);
                              showToast(`Layer ${activeLayerIndex + 1} settings`);
                            }}
                            title="Layer settings"
                            className="w-[28px] h-[28px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#555555] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="3" />
                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                          </button>

                          {/* Delete Layer × Button (only shown when more than 1 layer exists; turns solid red on hover) */}
                          {currentProfile.layers.length > 1 && (
                            <button
                              onClick={() => {
                                setLayerLightingOpen(false);
                                setLayerDeleteConfirm(true);
                              }}
                              title="Delete layer"
                              className="w-[28px] h-[28px] rounded-full bg-white hover:bg-[#dc0000] text-[#555555] hover:text-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors cursor-pointer"
                            >
                              <X className="w-[13px] h-[13px] stroke-[1.8]" />
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* LIGHTING POPOVER CARD (Screenshot 2: Backlight / Underglow) */}
                    <AnimatePresence>
                      {layerLightingOpen && !layerDeleteConfirm && (
                        <motion.div
                          key="layer-lighting-popover"
                          initial={{ opacity: 0, y: -6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.96 }}
                          transition={{
                            duration: 0.2,
                            ease: [0.32, 0.72, 0, 1],
                          }}
                          style={{ transformOrigin: 'top center' }}
                          className="absolute top-[37px] left-1/2 -translate-x-[38%] w-[228px] bg-[#e2e2e2] rounded-[18px] p-[9px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-black/[0.04] z-50"
                        >
                          {/* Top Mode Toggle: Backlight | Underglow */}
                          <div className="grid grid-cols-2 gap-[6px] mb-[8px]">
                            {(['Backlight', 'Underglow'] as const).map(
                              (mode) => {
                                const isActiveMode = lightingTab === mode;
                                return (
                                  <button
                                    key={mode}
                                    onClick={() => setLightingTab(mode)}
                                    className={`h-[26px] rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] text-[10.5px] font-medium transition-all cursor-pointer ${
                                      isActiveMode
                                        ? 'bg-[#000000] text-white'
                                        : 'bg-white text-[#555555]'
                                    }`}
                                  >
                                    {mode}
                                  </button>
                                );
                              }
                            )}
                          </div>

                          {/* Presets Card */}
                          <div className="bg-[#eeeeee] rounded-[14px] p-[10px] mb-[8px]">
                            <div className="text-[11px] font-normal text-[#555555] mb-[7px] text-left">
                              Presets
                            </div>
                            <div className="grid grid-cols-3 gap-[5px]">
                              {(
                                [
                                  'Off',
                                  'Solid',
                                  'Snake',
                                  'Rainbow',
                                  'Breath',
                                  'Gradient',
                                ] as const
                              ).map((presetName) => {
                                const isActivePreset =
                                  lightingConfig[lightingTab].preset ===
                                  presetName;
                                return (
                                  <button
                                    key={presetName}
                                    onClick={() =>
                                      setLightingConfig((prev) => ({
                                        ...prev,
                                        [lightingTab]: {
                                          ...prev[lightingTab],
                                          preset: presetName,
                                        },
                                      }))
                                    }
                                    className={`h-[24px] rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] text-[10px] font-medium transition-all cursor-pointer ${
                                      isActivePreset
                                        ? 'bg-[#000000] text-white'
                                        : 'bg-white text-[#555555]'
                                    }`}
                                  >
                                    {presetName}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Settings Card */}
                          <div className="bg-[#eeeeee] rounded-[14px] p-[10px] mb-[8px]">
                            <div className="text-[11px] font-normal text-[#555555] mb-[8px] text-left">
                              Settings
                            </div>

                            {(() => {
                              const cfg = lightingConfig[lightingTab];
                              const isOff = cfg.preset === 'Off';
                              const isAnimated =
                                cfg.preset !== 'Off' && cfg.preset !== 'Solid';

                              return (
                                <div className="space-y-[8px]">
                                  {/* Light Slider */}
                                  <div
                                    className={`flex items-center gap-[8px] ${
                                      isOff
                                        ? 'opacity-35 pointer-events-none'
                                        : ''
                                    }`}
                                  >
                                    <span className="w-[38px] text-left text-[10px] text-[#555555] shrink-0">
                                      Light
                                    </span>
                                    <div className="relative flex-1 h-[14px] flex items-center">
                                      <div className="w-full h-[1.5px] bg-[#b5b5b5] rounded-full" />
                                      <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={cfg.light}
                                        onChange={(e) =>
                                          setLightingConfig((prev) => ({
                                            ...prev,
                                            [lightingTab]: {
                                              ...prev[lightingTab],
                                              light: Number(e.target.value),
                                            },
                                          }))
                                        }
                                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                                      />
                                      <div
                                        style={{
                                          left: `calc(${cfg.light}% - 5.5px)`,
                                        }}
                                        className="absolute w-[11px] h-[11px] rounded-full bg-white border border-[#444444] pointer-events-none"
                                      />
                                    </div>
                                  </div>

                                  {/* Speed Slider */}
                                  <div
                                    className={`flex items-center gap-[8px] ${
                                      !isAnimated
                                        ? 'opacity-30 pointer-events-none'
                                        : ''
                                    }`}
                                  >
                                    <span className="w-[38px] text-left text-[10px] text-[#555555] shrink-0">
                                      Speed
                                    </span>
                                    <div className="relative flex-1 h-[14px] flex items-center">
                                      <div className="w-full h-[1.5px] bg-[#b5b5b5] rounded-full" />
                                      <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={cfg.speed}
                                        onChange={(e) =>
                                          setLightingConfig((prev) => ({
                                            ...prev,
                                            [lightingTab]: {
                                              ...prev[lightingTab],
                                              speed: Number(e.target.value),
                                            },
                                          }))
                                        }
                                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                                      />
                                      <div
                                        style={{
                                          left: `calc(${cfg.speed}% - 5.5px)`,
                                        }}
                                        className="absolute w-[11px] h-[11px] rounded-full bg-white border border-[#444444] pointer-events-none"
                                      />
                                    </div>
                                  </div>

                                  {/* Magic Slider */}
                                  <div
                                    className={`flex items-center gap-[8px] ${
                                      !isAnimated
                                        ? 'opacity-30 pointer-events-none'
                                        : ''
                                    }`}
                                  >
                                    <span className="w-[38px] text-left text-[10px] text-[#555555] shrink-0">
                                      Magic
                                    </span>
                                    <div className="relative flex-1 h-[14px] flex items-center">
                                      <div className="w-full h-[1.5px] bg-[#b5b5b5] rounded-full" />
                                      <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={cfg.magic}
                                        onChange={(e) =>
                                          setLightingConfig((prev) => ({
                                            ...prev,
                                            [lightingTab]: {
                                              ...prev[lightingTab],
                                              magic: Number(e.target.value),
                                            },
                                          }))
                                        }
                                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                                      />
                                      <div
                                        style={{
                                          left: `calc(${cfg.magic}% - 5.5px)`,
                                        }}
                                        className="absolute w-[11px] h-[11px] rounded-full bg-white border border-[#444444] pointer-events-none"
                                      />
                                    </div>
                                  </div>

                                  {/* Color Rainbow Slider */}
                                  <div
                                    className={`flex items-center gap-[8px] ${
                                      isOff
                                        ? 'opacity-35 pointer-events-none'
                                        : ''
                                    }`}
                                  >
                                    <span className="w-[38px] text-left text-[10px] text-[#555555] shrink-0">
                                      Color
                                    </span>
                                    <div className="relative flex-1 h-[14px] flex items-center">
                                      <div
                                        className="w-full h-[3px] rounded-full"
                                        style={{
                                          background:
                                            'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                                        }}
                                      />
                                      <input
                                        type="range"
                                        min={0}
                                        max={360}
                                        value={cfg.hue}
                                        onChange={(e) => {
                                          const nextHue = Number(
                                            e.target.value
                                          );
                                          setLightingConfig((prev) => ({
                                            ...prev,
                                            [lightingTab]: {
                                              ...prev[lightingTab],
                                              hue: nextHue,
                                              colorHex: hueToHex(nextHue),
                                            },
                                          }));
                                        }}
                                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                                      />
                                      <div
                                        style={{
                                          left: `calc(${
                                            (cfg.hue / 360) * 100
                                          }% - 5.5px)`,
                                        }}
                                        className="absolute w-[11px] h-[11px] rounded-full bg-white border border-[#444444] pointer-events-none"
                                      />
                                    </div>
                                  </div>

                                  {/* Hex Input Pill + Swatch Circle */}
                                  <div
                                    className={`ml-[46px] h-[24px] rounded-full bg-[#e2e2e2] px-[10px] flex items-center justify-between ${
                                      isOff
                                        ? 'opacity-35 pointer-events-none'
                                        : ''
                                    }`}
                                  >
                                    <input
                                      type="text"
                                      value={cfg.colorHex}
                                      onChange={(e) =>
                                        setLightingConfig((prev) => ({
                                          ...prev,
                                          [lightingTab]: {
                                            ...prev[lightingTab],
                                            colorHex: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-[85px] bg-transparent text-[10px] text-[#555555] uppercase focus:outline-none"
                                    />
                                    <span
                                      className="w-[11px] h-[11px] rounded-full shrink-0 border border-black/10"
                                      style={{
                                        backgroundColor: cfg.colorHex,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Apply to all layers button */}
                          <button
                            onClick={() =>
                              showToast(
                                `Applied ${lightingTab.toLowerCase()} settings to all layers`
                              )
                            }
                            className="w-full h-[25px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] text-[10px] font-normal text-[#555555] flex items-center justify-center transition-all cursor-pointer"
                          >
                            Apply to all layers
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT: Key Mapping */}
            {!mappingDrawerOpen ? (
              <div className="flex flex-col items-end relative pointer-events-auto justify-self-end">
                <div className="flex items-center gap-[5px] text-[#666666] text-[12.5px] font-normal">
                  <button
                    onClick={() =>
                      setActiveTooltip(activeTooltip === 'mapping' ? null : 'mapping')
                    }
                    onMouseEnter={() => setActiveTooltip('mapping')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className="text-[#666666] hover:text-[#222] transition-colors cursor-pointer"
                    aria-label="Key Mapping Info"
                  >
                    <InfoCircleIcon />
                  </button>
                  <span>Key Mapping</span>
                </div>

                <AnimatePresence>
                  {activeTooltip === 'mapping' && (
                    <motion.div
                      key="mapping-tooltip"
                      initial={{ opacity: 0, y: -5, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute top-[25px] right-[68px] w-[235px] bg-[#ececec] rounded-[16px] px-[18px] py-[15px] shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-black/[0.04] text-left z-40 pointer-events-none"
                    >
                      <div className="text-[13px] font-semibold text-[#666666] mb-[9px]">
                        What is Key Mapping?
                      </div>
                      <p className="text-[11px] leading-[1.36] text-[#686868] mb-[8px]">
                        Assign actions to each physical key. Click a key to define what it does on the selected layer.
                      </p>
                      <div className="text-[11px] text-[#686868] mb-[3px]">
                        Keys can trigger:
                      </div>
                      <ul className="list-disc pl-[16px] text-[11px] leading-[1.36] text-[#686868]">
                        <li>Basic inputs</li>
                        <li>Shortcuts</li>
                        <li>Multi-step actions</li>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Fixed-height anchor so top row height never changes */}
                <div className="mt-[10px] w-[49px] h-[49px]" />

                {/* Floating action stack overlay — hover boundary is strictly the 49px square buttons column (NOT the text capsule) */}
                <div
                  onMouseLeave={() => {
                    setHoveredMappingType(null);
                    setMappingStackExpanded(false);
                  }}
                  className="absolute top-[28px] right-0 w-[49px] flex flex-col items-end z-30"
                >
                  {!mappingStackExpanded ? (
                    <motion.button
                      key="plus-trigger"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      onMouseEnter={() => setMappingStackExpanded(true)}
                      onClick={() => handleOpenDrawerWithTab('Basic')}
                      title="Open Key Mapping"
                      className="w-[49px] h-[49px] bg-white rounded-[11px] border-[1.5px] border-transparent hover:border-[#0051ff] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,81,255,0.18)] flex items-center justify-center text-[#333333] transition-all cursor-pointer"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      >
                        <path d="M8 2V14M2 8H14" />
                      </svg>
                    </motion.button>
                  ) : (
                    <motion.div
                      key="action-stack"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="w-[49px] flex flex-col items-end gap-[9px]"
                    >
                        {(
                          [
                            { label: 'Basic Key', tab: 'Basic', icon: 'B' },
                            { label: 'Action', tab: 'Action', icon: 'A' },
                            { label: 'Multiaction', tab: 'Multi-A', icon: 'MA' },
                            { label: 'Smart Action', tab: 'Smart-A', icon: 'S' },
                          ] as const
                        ).map((entry, idx) => {
                          const isHovered = hoveredMappingType === entry.label;
                          return (
                            <motion.div
                              key={entry.label}
                              initial={{ opacity: 0, y: -10, scale: 0.92 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.92 }}
                              transition={{
                                duration: 0.28,
                                delay: idx * 0.045,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="w-[49px] h-[49px] relative flex items-center justify-end"
                            >
                              <AnimatePresence>
                                {isHovered && (
                                  <motion.div
                                    initial={{ opacity: 0, x: 8, scale: 0.96 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 6, scale: 0.96 }}
                                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                    className="absolute right-[58px] h-[29px] px-[14px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center text-[11px] font-medium text-[#555555] whitespace-nowrap pointer-events-none"
                                  >
                                    {entry.label}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onMouseEnter={() => setHoveredMappingType(entry.label)}
                                onClick={() => handleOpenDrawerWithTab(entry.tab)}
                                className={`w-[49px] h-[49px] rounded-[11px] border-[1.5px] flex items-center justify-center transition-all cursor-pointer ${
                                  isHovered
                                    ? 'bg-[#0051ff] border-[#0051ff] text-black shadow-[0_4px_14px_rgba(0,81,255,0.35)]'
                                    : 'bg-white border-transparent hover:border-[#0051ff] text-[#444444] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                                }`}
                              >
                                <IsometricKeyIcon
                                  type={entry.icon}
                                  active={isHovered}
                                />
                              </motion.button>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                </div>
              </div>
            ) : (
              <div />
            )}
          </div>

          {/* CENTERPIECE: MOVABLE CREATOR MICRO 2 HARDWARE MACROPAD + "Edit layout" BUTTON (Clamped to blank area) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <motion.div
              animate={{ x: macropadOffset.x, y: macropadOffset.y }}
              transition={
                isDraggingMacropad
                  ? { type: 'spring', stiffness: 650, damping: 42, mass: 0.5 }
                  : { type: 'spring', stiffness: 320, damping: 30 }
              }
              className="flex flex-col items-center pointer-events-auto select-none"
            >
              <div
                onPointerDown={handleStartMacropadMove}
                onDoubleClick={handleResetMacropadCenter}
                className={
                  isDraggingMacropad ? 'cursor-grabbing' : 'cursor-grab'
                }
              >
                <MacropadDevice
                  layer={currentLayer}
                  selectedKey={selectedKey}
                  selectedEncoderSub={selectedEncoderSub}
                  dragOverTarget={dragOverTarget}
                  draggedFromSlot={draggedTile?.fromSlotId || null}
                  swapTopRowEncoders={swapTopRowEncoders}
                  dialAngle={dialAngle}
                  knobAngle={knobAngle}
                  onSelectKey={handleSelectKey}
                  onSelectEncoderSub={handleSelectEncoderSubAction}
                  onStartKeyDrag={handleStartMacropadKeyDrag}
                />
              </div>

              <button
                onClick={() => {
                  if (suppressNextClickRef.current) return;
                  setEditLayoutModalOpen(true);
                }}
                className="mt-[15px] h-[28px] px-[12px] bg-white hover:bg-neutral-50 rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-[6px] text-[#3a3a3a] text-[11px] font-medium transition-all cursor-pointer"
              >
                <svg
                  width="13"
                  height="11"
                  viewBox="0 0 13 11"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="2" cy="2" r="1" fill="#444444" />
                  <circle cx="5" cy="2" r="1" fill="#444444" />
                  <circle cx="8" cy="2" r="1" fill="#444444" />
                  <circle cx="11" cy="2" r="1" fill="#444444" />
                  <circle cx="2" cy="5.5" r="1" fill="#444444" />
                  <circle cx="5" cy="5.5" r="1" fill="#444444" />
                  <circle cx="8" cy="5.5" r="1" fill="#444444" />
                  <circle cx="11" cy="5.5" r="1" fill="#444444" />
                  <circle cx="2" cy="9" r="1" fill="#444444" />
                  <circle cx="5" cy="9" r="1" fill="#444444" />
                  <circle cx="8" cy="9" r="1" fill="#444444" />
                  <circle cx="11" cy="9" r="1" fill="#444444" />
                </svg>
                <span>Edit layout</span>
              </button>
            </motion.div>
          </div>

          {/* BOTTOM-LEFT TIP WIDGET */}
          <div className="px-[27px] pb-[24px] flex items-start">
            <div
              onClick={() => setTipIndex((i) => (i + 1) % TIPS.length)}
              className="flex items-start gap-[10px] cursor-pointer group min-h-[54px]"
              title="Click for next tip"
            >
              <div className="pt-[3px] flex flex-col gap-[5px]">
                {[0, 1, 2].map((dotIdx) => (
                  <span
                    key={dotIdx}
                    className={`w-[4px] h-[4px] rounded-full transition-colors duration-300 ${
                      TIPS[tipIndex].dot === dotIdx ? 'bg-[#9e9e9e]' : 'bg-[#d0d0d0]'
                    }`}
                  />
                ))}
              </div>

              <div className="text-[#a3a3a3] text-[11px] leading-[1.35] font-normal">
                <div className="mb-[5px]">Tip:</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tipIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: 'easeInOut' }}
                  >
                    {TIPS[tipIndex].lines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* FULL-HEIGHT RIGHT KEY MAPPING DRAWER (FLUSH TO NAVBAR)          */}
          {/* =============================================================== */}
          <AnimatePresence>
            {mappingDrawerOpen && (
              <motion.aside
                key="key-mapping-drawer"
                initial={{ x: '100%', opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-0 bottom-0 right-0 w-[332px] bg-[#efefef] rounded-l-[20px] rounded-r-none shadow-[-8px_0_24px_rgba(0,0,0,0.08)] border-l border-black/[0.04] flex flex-col z-30 overflow-hidden"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {creatorModalTab ? (
                    /* =========================================================== */
                    /* IN-DRAWER EDITOR: MULTI ACTION EDITING / ACTION EDITING     */
                    /* =========================================================== */
                    <motion.div
                      key={`creator-editor-${creatorModalTab}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.26, ease: 'easeInOut' }}
                      className="flex-1 flex flex-col overflow-y-auto px-[15px] pt-[18px] pb-[16px] relative"
                    >
                      {/* Top Header: <- (left) | Title (i) (center) */}
                    <div className="flex items-center justify-between shrink-0 mb-[16px] relative">
                      <button
                        onClick={() => {
                          setIconPickerOpen(false);
                          setActiveGestureDropdown(null);
                          setCreatorModalTab(null);
                        }}
                        aria-label="Back to Key Mapping"
                        className="w-6 h-6 rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#555555] hover:text-black transition-all cursor-pointer"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M13 8H3M3 8L7 4M3 8L7 12" />
                        </svg>
                      </button>

                      <div className="flex items-center gap-[5px] text-[#555555] text-[12.5px] font-medium">
                        <span>
                          {creatorModalTab === 'Multi-A'
                            ? 'Multi Action editing'
                            : 'Action editing'}
                        </span>
                        <button
                          onMouseEnter={() => setActiveTooltip('drawer-mapping')}
                          onMouseLeave={() => setActiveTooltip(null)}
                          onClick={() =>
                            setActiveTooltip(
                              activeTooltip === 'drawer-mapping'
                                ? null
                                : 'drawer-mapping'
                            )
                          }
                          className="text-[#666666] hover:text-[#222] cursor-pointer"
                        >
                          <InfoCircleIcon />
                        </button>
                      </div>

                      <div className="w-6" />

                      <AnimatePresence>
                        {activeTooltip === 'drawer-mapping' && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.96 }}
                            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                            className="absolute top-[28px] right-[4px] w-[226px] bg-[#ececec] rounded-[16px] px-[18px] py-[15px] shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-black/[0.04] text-left z-50 pointer-events-none"
                          >
                            <div className="text-[13px] font-semibold text-[#5e5e5e] mb-[7px]">
                              {creatorModalTab === 'Multi-A'
                                ? 'Multi Action editing'
                                : 'Action editing'}
                            </div>
                            <p className="text-[11px] leading-[1.36] text-[#686868]">
                              {creatorModalTab === 'Multi-A'
                                ? 'Configure up to 4 gesture triggers (On Tap, Double Tap, On Hold, Tap + Hold) and assign an icon.'
                                : 'Create a custom Smart Action or macro, pick an icon or emoji, and save it to your library.'}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Identity Row: 62x62 Icon Button + Name Input + Save/Discard/Delete */}
                    <div className="flex items-start gap-[10px] shrink-0 relative">
                      <button
                        onClick={() => setIconPickerOpen((o) => !o)}
                        title="Select Icon or Emoji"
                        className="w-[62px] h-[62px] rounded-[12px] bg-[#2f2f2f] hover:bg-[#252525] border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-white shrink-0 transition-all cursor-pointer"
                      >
                        {selectedIconId ? (
                          <CustomPickerIcon id={selectedIconId} size={26} />
                        ) : selectedEmoji ? (
                          <span className="text-[26px] leading-none">
                            {selectedEmoji}
                          </span>
                        ) : (
                          <svg
                            width="26"
                            height="26"
                            viewBox="0 0 26 26"
                            fill="none"
                            stroke="white"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          >
                            <circle cx="13" cy="13" r="11" />
                            <path d="M13 8.5V17.5M8.5 13H17.5" />
                          </svg>
                        )}
                      </button>

                      <div className="flex-1 flex flex-col gap-[8px] min-w-0">
                        {/* Editable Name Input Pill */}
                        <div className="h-[25px] rounded-full bg-[#e2e2e2] px-[10px] flex items-center gap-[6px]">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="#666666"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="shrink-0"
                          >
                            <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" />
                          </svg>
                          <input
                            type="text"
                            value={newCustomName}
                            onChange={(e) => setNewCustomName(e.target.value)}
                            placeholder={
                              creatorModalTab === 'Multi-A'
                                ? 'My Multiaction'
                                : creatorModalTab === 'Smart-A'
                                ? 'My Smart action'
                                : 'My Action'
                            }
                            className="w-full bg-transparent text-[11px] text-[#444444] placeholder:text-[#888888] focus:outline-none"
                          />
                        </div>

                        {/* Save (Green Hover) | Discard (Yellow/Orange Hover) | Delete (Red Hover) */}
                        {(() => {
                          const canSave =
                            creatorModalTab === 'Action'
                              ? actionAdvanceMode
                                ? actionAdvanceSteps.some(
                                    (s) => !!s.keyLabel.trim()
                                  )
                                : actionTokens.length > 0
                              : creatorModalTab === 'Multi-A'
                              ? Object.values(multiGestures).some(
                                  (v) => !!v.trim()
                                )
                              : !!(smartSubTab === 'Text'
                                  ? smartTextValue.trim()
                                  : smartSubTab === 'Cmd'
                                  ? smartCmdValue.trim()
                                  : smartSubTab === 'Web'
                                  ? smartWebValue.trim()
                                  : smartAppValue.trim());
                          const canDelete = !!editingCustomItemId;

                          return (
                            <div className="grid grid-cols-3 gap-[6px]">
                              <button
                                type="button"
                                disabled={!canSave}
                                onClick={handleSaveCustomItem}
                                className={`h-[29px] rounded-full text-[10.5px] font-medium transition-colors ${
                                  canSave
                                    ? 'bg-white text-[#444444] hover:bg-[#2ec27e] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer'
                                    : 'bg-[#dadada] text-[#b0b0b0] cursor-not-allowed'
                                }`}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                disabled={!canSave}
                                onClick={handleDiscardCustomItem}
                                className={`h-[29px] rounded-full text-[10.5px] font-medium transition-colors ${
                                  canSave
                                    ? 'bg-white text-[#444444] hover:bg-[#f59e0b] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer'
                                    : 'bg-[#dadada] text-[#b0b0b0] cursor-not-allowed'
                                }`}
                              >
                                Discard
                              </button>
                              <button
                                type="button"
                                disabled={!canDelete}
                                onClick={handleDeleteCustomItem}
                                className={`h-[29px] rounded-full text-[10.5px] font-medium transition-colors ${
                                  canDelete
                                    ? 'bg-white text-[#444444] hover:bg-[#e01b24] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer'
                                    : 'bg-[#dadada] text-[#b0b0b0] cursor-not-allowed'
                                }`}
                              >
                                Delete
                              </button>
                            </div>
                          );
                        })()}
                      </div>

                      {/* ======================================================= */}
                      {/* SELECT ICON / EMOJI POPOVER DRAWER (Screenshot 2)       */}
                      {/* ======================================================= */}
                      <AnimatePresence>
                        {iconPickerOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.96 }}
                            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                            className="absolute top-[68px] left-0 w-[216px] bg-[#efefef] rounded-[18px] p-[11px] shadow-[0_8px_28px_rgba(0,0,0,0.16)] border border-black/[0.06] z-50"
                          >
                            <div className="flex items-center justify-between mb-[10px]">
                              <button
                                onClick={() => setIconPickerOpen(false)}
                                className="w-[22px] h-[22px] rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#555555] hover:text-black transition-all cursor-pointer"
                              >
                                <X className="w-[13px] h-[13px] stroke-[1.8]" />
                              </button>
                              <span className="text-[11px] font-medium text-[#555555]">
                                Select Icon
                              </span>
                              <div className="w-5" />
                            </div>

                            {/* Icon | Emoji Segmented Toggle */}
                            <div className="h-[26px] rounded-full bg-white flex overflow-hidden mb-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                              {(['Icon', 'Emoji'] as const).map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setIconPickerTab(t)}
                                  className={`flex-1 h-full text-[10.5px] font-medium transition-colors cursor-pointer ${
                                    iconPickerTab === t
                                      ? 'bg-[#000000] text-white rounded-full'
                                      : 'text-[#555555] hover:text-black'
                                  }`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>

                            {/* Search Icon / Emoji */}
                            <div className="h-[25px] rounded-full bg-white px-[9px] flex items-center gap-[5px] mb-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                              <Search className="w-[10px] h-[10px] text-[#666666] stroke-[2] shrink-0" />
                              <input
                                type="text"
                                value={iconPickerSearch}
                                onChange={(e) => setIconPickerSearch(e.target.value)}
                                placeholder={
                                  iconPickerTab === 'Icon'
                                    ? 'Search icon'
                                    : 'Search emoji'
                                }
                                className="w-full bg-transparent text-[10px] text-[#333333] placeholder:text-[#a0a0a0] focus:outline-none"
                              />
                            </div>

                            {/* Grid of Real Icons or Real Emojis */}
                            <div className="bg-white rounded-[14px] p-[8px] h-[196px] overflow-y-auto list-accordion-scroll grid grid-cols-6 gap-[6px] content-start">
                              {iconPickerTab === 'Icon'
                                ? SELECTABLE_ICON_LIST.filter(
                                    (ic) =>
                                      !iconPickerSearch.trim() ||
                                      ic.keywords
                                        .toLowerCase()
                                        .includes(iconPickerSearch.toLowerCase()) ||
                                      ic.id
                                        .toLowerCase()
                                        .includes(iconPickerSearch.toLowerCase())
                                  ).map((ic) => {
                                    const isChosen = selectedIconId === ic.id;
                                    return (
                                      <button
                                        key={ic.id}
                                        onClick={() => {
                                          setSelectedIconId(ic.id);
                                          setSelectedEmoji(undefined);
                                          setIconPickerOpen(false);
                                        }}
                                        title={ic.id}
                                        className={`w-[26px] h-[26px] rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                                          isChosen
                                            ? 'bg-[#0051ff] text-white'
                                            : 'bg-[#dcdcdc] text-[#444444] hover:bg-[#0051ff] hover:text-white'
                                        }`}
                                      >
                                        <CustomPickerIcon id={ic.id} size={13} />
                                      </button>
                                    );
                                  })
                                : SELECTABLE_EMOJI_LIST.filter(
                                    (em) =>
                                      !iconPickerSearch.trim() ||
                                      em.keywords
                                        .toLowerCase()
                                        .includes(iconPickerSearch.toLowerCase()) ||
                                      em.emoji.includes(iconPickerSearch)
                                  ).map((em) => {
                                    const isChosen = selectedEmoji === em.emoji;
                                    return (
                                      <button
                                        key={em.emoji}
                                        onClick={() => {
                                          setSelectedEmoji(em.emoji);
                                          setSelectedIconId(undefined);
                                          setIconPickerOpen(false);
                                        }}
                                        title={em.keywords.split(' ')[0]}
                                        className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[14px] transition-colors cursor-pointer ${
                                          isChosen
                                            ? 'bg-[#0051ff] text-white'
                                            : 'bg-[#efefef] hover:bg-[#0051ff]'
                                        }`}
                                      >
                                        {em.emoji}
                                      </button>
                                    );
                                  })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Notched Center Horizontal Divider Line */}
                    <div className="my-[12px] w-full shrink-0">
                      <svg
                        width="100%"
                        height="12"
                        viewBox="0 0 302 12"
                        fill="none"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M 0 1.5 H 136 C 142 1.5 144 10 151 10 C 158 10 160 1.5 166 1.5 H 302"
                          stroke="#dcdcdc"
                          strokeWidth="1.2"
                        />
                      </svg>
                    </div>

                    {/* ========================================================= */}
                    {/* EDITOR BODY: MULTI-A vs SMART-A vs ACTION                 */}
                    {/* ========================================================= */}
                    {creatorModalTab === 'Multi-A' ? (
                      <div className="flex-1 flex flex-col">
                        {/* 4 Gesture Assignment Rows */}
                        <div className="space-y-[7px] mb-[12px]">
                          {(
                            [
                              { key: 'onTap', label: 'On Tap' },
                              { key: 'doubleTap', label: 'Double Tap' },
                              { key: 'onHold', label: 'On Hold' },
                              { key: 'tapHold', label: 'Tap + Hold' },
                            ] as { key: MultiGestureKey; label: string }[]
                          ).map((gesture) => {
                            const isDropdownOpen =
                              activeGestureDropdown === gesture.key;
                            const assignedVal = multiGestures[gesture.key];
                            return (
                              <div
                                key={gesture.key}
                                className="h-[44px] rounded-full border border-[#dedede] bg-transparent pl-[14px] pr-[8px] flex items-center justify-between relative"
                              >
                                <span className="text-[11px] text-[#555555] font-normal">
                                  {gesture.label}
                                </span>

                                <div className="flex items-center gap-[5px] relative">
                                  <button
                                    onClick={() => {
                                      if (isDropdownOpen) {
                                        setActiveGestureDropdown(null);
                                      } else {
                                        setActiveGestureDropdown(gesture.key);
                                        setGestureKeySearch('');
                                      }
                                    }}
                                    className={`w-[126px] h-[25px] rounded-full bg-white px-[11px] flex items-center justify-between text-[10px] text-[#555555] shadow-[0_1px_2px_rgba(0,0,0,0.03)] border transition-colors cursor-pointer ${
                                      isDropdownOpen
                                        ? 'border-[#0051ff]'
                                        : 'border-transparent hover:border-[#0051ff]'
                                    }`}
                                  >
                                    <span className="truncate">
                                      {assignedVal || 'Click to assign'}
                                    </span>
                                    {isDropdownOpen ? (
                                      <ChevronUp className="w-[11px] h-[11px] text-[#444] shrink-0" />
                                    ) : (
                                      <ChevronDown className="w-[11px] h-[11px] text-[#444] shrink-0" />
                                    )}
                                  </button>

                                  <button
                                    onClick={() =>
                                      setMultiGestures((prev) => ({
                                        ...prev,
                                        [gesture.key]: '',
                                      }))
                                    }
                                    title="Clear assignment"
                                    className="w-[24px] h-[24px] rounded-full bg-white hover:bg-neutral-100 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#777777] hover:text-black shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all cursor-pointer"
                                  >
                                    <X className="w-[11px] h-[11px] stroke-[1.7]" />
                                  </button>

                                  {/* ================================================= */}
                                  {/* CLICK TO ASSIGN KEY DROPDOWN (Screenshots 3-5)    */}
                                  {/* ================================================= */}
                                  <AnimatePresence>
                                    {isDropdownOpen && (
                                      <motion.div
                                        initial={{ opacity: 0, y: -4, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                        transition={{
                                          duration: 0.16,
                                          ease: [0.32, 0.72, 0, 1],
                                        }}
                                        className="absolute top-[30px] left-0 w-[154px] bg-white rounded-[16px] shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-black/[0.05] overflow-hidden z-50"
                                      >
                                        {/* Top Search Bar */}
                                        <div className="h-[30px] bg-[#e6e6e6] px-[10px] flex items-center gap-[6px]">
                                          <Search className="w-[10.5px] h-[10.5px] text-[#555555] stroke-[2] shrink-0" />
                                          <input
                                            type="text"
                                            value={gestureKeySearch}
                                            onChange={(e) =>
                                              setGestureKeySearch(e.target.value)
                                            }
                                            placeholder="Search a key"
                                            className="w-full bg-transparent text-[10px] text-[#333333] placeholder:text-[#9c9c9c] focus:outline-none"
                                          />
                                        </div>

                                        {/* Accordion Categories with Blue Hover & Active */}
                                        <div className="max-h-[268px] overflow-y-auto list-accordion-scroll divide-y divide-[#eeeeee]">
                                          {BASIC_KEY_SECTIONS.map((sec) => {
                                            const matchingItems = sec.items.filter(
                                              (it) => {
                                                if (!gestureKeySearch.trim())
                                                  return true;
                                                const q =
                                                  gestureKeySearch.toLowerCase();
                                                const lbl = (
                                                  it.listLabel ||
                                                  it.main.replace(/\n/g, ' ')
                                                ).toLowerCase();
                                                return lbl.includes(q);
                                              }
                                            );
                                            if (matchingItems.length === 0)
                                              return null;

                                            const isSecOpen =
                                              expandedGestureSection === sec.title ||
                                              !!gestureKeySearch.trim();

                                            return (
                                              <div key={sec.title}>
                                                <button
                                                  onClick={() =>
                                                    setExpandedGestureSection(
                                                      expandedGestureSection ===
                                                        sec.title
                                                        ? null
                                                        : sec.title
                                                    )
                                                  }
                                                  className={`w-full h-[30px] px-[11px] flex items-center justify-between text-[10.5px] font-normal transition-colors cursor-pointer ${
                                                    isSecOpen
                                                      ? 'bg-[#0051ff] text-white'
                                                      : 'bg-white text-[#555555] hover:bg-[#0051ff] hover:text-white'
                                                  }`}
                                                >
                                                  <span className="truncate">
                                                    {sec.title}
                                                  </span>
                                                  {isSecOpen ? (
                                                    <ChevronUp className="w-[11px] h-[11px] shrink-0" />
                                                  ) : (
                                                    <ChevronDown className="w-[11px] h-[11px] shrink-0" />
                                                  )}
                                                </button>

                                                <AnimatePresence initial={false}>
                                                  {isSecOpen && (
                                                    <motion.div
                                                      initial={{ height: 0, opacity: 0 }}
                                                      animate={{ height: 'auto', opacity: 1 }}
                                                      exit={{ height: 0, opacity: 0 }}
                                                      transition={{
                                                        duration: 0.2,
                                                        ease: [0.22, 1, 0.36, 1],
                                                      }}
                                                      className="bg-white py-[2px] overflow-hidden"
                                                    >
                                                      {matchingItems.map((it) => {
                                                        const itemName =
                                                          it.listLabel ||
                                                          it.main.replace(/\n/g, ' ');
                                                        return (
                                                          <button
                                                            key={it.id}
                                                            onClick={() => {
                                                              setMultiGestures(
                                                                (prev) => ({
                                                                  ...prev,
                                                                  [gesture.key]:
                                                                    it.isClearIcon
                                                                      ? ''
                                                                      : itemName,
                                                                })
                                                              );
                                                              setActiveGestureDropdown(
                                                                null
                                                              );
                                                            }}
                                                            className="w-full h-[26px] px-[12px] text-left text-[10.5px] text-[#555555] hover:bg-[#0051ff] hover:text-white transition-colors flex items-center cursor-pointer"
                                                          >
                                                            {itemName}
                                                          </button>
                                                        );
                                                      })}
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Tapping term (ms) — aligned inside under Click to assign */}
                        <div className="pl-[14px] pr-[8px] flex items-center justify-between mb-[10px]">
                          <span className="text-[10.5px] text-[#555555]">
                            Tapping term (ms)
                          </span>
                          <div className="w-[155px] flex items-center justify-start">
                            <div
                              onClick={(e) => {
                                const inp = e.currentTarget.querySelector(
                                  'input'
                                ) as HTMLInputElement | null;
                                inp?.focus();
                              }}
                              className="h-[25px] px-[11px] rounded-full bg-white flex items-center gap-[12px] text-[10.5px] text-[#555555] shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-text"
                            >
                              <input
                                type="text"
                                inputMode="numeric"
                                value={tappingTermMs}
                                onChange={(e) =>
                                  setTappingTermMs(
                                    e.target.value.replace(/[^0-9]/g, '')
                                  )
                                }
                                onBlur={() => {
                                  if (!tappingTermMs.trim()) {
                                    setTappingTermMs('250');
                                  }
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') {
                                    if (!tappingTermMs.trim()) {
                                      setTappingTermMs('250');
                                    }
                                    e.currentTarget.blur();
                                  }
                                }}
                                style={{
                                  width: `${Math.max(
                                    2,
                                    (tappingTermMs || '250').length
                                  )}ch`,
                                }}
                                className="min-w-[20px] max-w-[44px] bg-transparent text-left text-[10.5px] text-[#444444] focus:outline-none tabular-nums"
                              />
                              <span className="text-[#555555] select-none">
                                ms
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pl-[6px] text-[10.5px] text-[#555555] mb-[14px]">
                          Hold 1sec to perform the assigned function
                        </div>

                        {/* Dashed Hint Box */}
                        <div className="flex-1 min-h-[190px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[26px] py-[20px] flex flex-col justify-center">
                          <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
                            Hint
                          </h4>
                          <p className="text-[10.5px] leading-[1.36] text-[#666666] mb-[22px]">
                            Assign a key or action to each gesture — tap, double-tap, hold, and tap + hold — then bind the multiaction to a button.
                          </p>
                          <button
                            onClick={() =>
                              showToast('Multiactions documentation opened')
                            }
                            className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black text-center cursor-pointer"
                          >
                            Discover more about Multiactions
                          </button>
                        </div>
                      </div>
                    ) : creatorModalTab === 'Smart-A' ? (
                      /* ========================================================= */
                      /* SMART ACTION EDITOR (Text | Cmd | Web | App)              */
                      /* ========================================================= */
                      <div className="flex-1 flex flex-col">
                        {/* 4 Sub-Tab Pills with Blue Hover */}
                        <div className="grid grid-cols-4 gap-[6px] mb-[10px] shrink-0">
                          {(['Text', 'Cmd', 'Web', 'App'] as const).map((sub) => {
                            const isSubActive = smartSubTab === sub;
                            return (
                              <button
                                key={sub}
                                onClick={() => setSmartSubTab(sub)}
                                className={`h-[26px] rounded-full text-[10.5px] font-medium border-[1.5px] transition-all cursor-pointer ${
                                  isSubActive
                                    ? 'bg-[#000000] text-white border-[#000000] hover:border-[#0051ff]'
                                    : 'bg-white text-[#444444] border-transparent hover:border-[#0051ff] hover:text-[#0051ff]'
                                }`}
                              >
                                {sub}
                              </button>
                            );
                          })}
                        </div>

                        <AnimatePresence mode="wait" initial={false}>
                          {/* Sub-Tab 1: Text (Screenshot 6) */}
                          {smartSubTab === 'Text' && (
                            <motion.div
                              key="smart-sub-text"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.24, ease: 'easeInOut' }}
                              className="flex-1 flex flex-col"
                            >
                              <textarea
                                value={smartTextValue}
                                onChange={(e) => setSmartTextValue(e.target.value)}
                                placeholder="Add your text here..."
                                className="w-full h-[112px] rounded-[14px] bg-[#e2e2e2] p-[12px] text-[10.5px] text-[#333333] placeholder:text-[#9c9c9c] resize-none focus:outline-none focus:ring-1 focus:ring-[#0051ff] mb-[12px] shrink-0"
                              />
                              <div className="flex-1 min-h-[210px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[26px] py-[20px] flex flex-col justify-center">
                                <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
                                  Hint
                                </h4>
                                <p className="text-[10.5px] leading-[1.36] text-[#666666] mb-[22px]">
                                  Type or paste any phrase. When you press the assigned key, Input types it out for you.
                                </p>
                                <button
                                  onClick={() =>
                                    showToast('Smart Actions documentation opened')
                                  }
                                  className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black text-center cursor-pointer"
                                >
                                  Discover more about Smart Actions
                                </button>
                              </div>
                            </motion.div>
                          )}

                          {/* Sub-Tab 2: Cmd (Screenshot 7) */}
                          {smartSubTab === 'Cmd' && (
                            <motion.div
                              key="smart-sub-cmd"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.24, ease: 'easeInOut' }}
                              className="flex-1 flex flex-col"
                            >
                              <textarea
                                value={smartCmdValue}
                                onChange={(e) => setSmartCmdValue(e.target.value)}
                                placeholder="Type your command here..."
                                className="w-full h-[112px] rounded-[14px] bg-[#e2e2e2] p-[12px] text-[10.5px] text-[#333333] placeholder:text-[#9c9c9c] resize-y focus:outline-none focus:ring-1 focus:ring-[#0051ff] shrink-0"
                              />
                              <div className="text-[10px] text-[#8e8e8e] text-center mt-[6px]">
                                Type or paste any command you want Input to run
                              </div>
                              <p className="text-[9.5px] leading-[1.3] text-[#9a9a9a] mt-[10px]">
                                This feature can execute arbitrary commands on your system. Only continue if you trust the source and understand the risks.
                              </p>
                              <div className="mt-[8px] mb-[12px] flex items-center justify-between">
                                <span className="text-[10.5px] text-[#555555]">
                                  Enable command actions
                                </span>
                                <SettingsSwitch
                                  checked={enableCommandActions}
                                  onChange={() =>
                                    setEnableCommandActions((v) => !v)
                                  }
                                />
                              </div>
                              <div className="flex-1 min-h-[175px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[26px] py-[20px] flex flex-col justify-center">
                                <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
                                  Hint
                                </h4>
                                <p className="text-[10.5px] leading-[1.36] text-[#666666] mb-[22px]">
                                  Type a command to run when you press the assigned key. Only use commands you trust.
                                </p>
                                <button
                                  onClick={() =>
                                    showToast('Smart Actions documentation opened')
                                  }
                                  className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black text-center cursor-pointer"
                                >
                                  Discover more about Smart Actions
                                </button>
                              </div>
                            </motion.div>
                          )}

                          {/* Sub-Tab 3: Web (Screenshot 8) */}
                          {smartSubTab === 'Web' && (
                            <motion.div
                              key="smart-sub-web"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.24, ease: 'easeInOut' }}
                              className="flex-1 flex flex-col"
                            >
                              <input
                                type="text"
                                value={smartWebValue}
                                onChange={(e) => setSmartWebValue(e.target.value)}
                                placeholder="Type here the URL to open"
                                className="w-full h-[38px] rounded-[12px] bg-[#e2e2e2] px-[12px] text-[10.5px] text-[#333333] placeholder:text-[#9c9c9c] focus:outline-none focus:ring-1 focus:ring-[#0051ff] mb-[12px] shrink-0"
                              />
                              <div className="flex-1 min-h-[240px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[26px] py-[20px] flex flex-col justify-center">
                                <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
                                  Hint
                                </h4>
                                <p className="text-[10.5px] leading-[1.36] text-[#666666] mb-[22px]">
                                  Enter a URL. Pressing the assigned key opens it in your browser.
                                </p>
                                <button
                                  onClick={() =>
                                    showToast('Smart Actions documentation opened')
                                  }
                                  className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black text-center cursor-pointer"
                                >
                                  Discover more about Smart Actions
                                </button>
                              </div>
                            </motion.div>
                          )}

                          {/* Sub-Tab 4: App (Screenshot 9) */}
                          {smartSubTab === 'App' && (
                            <motion.div
                              key="smart-sub-app"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.24, ease: 'easeInOut' }}
                              className="flex-1 flex flex-col"
                            >
                              <div className="relative mb-[12px] shrink-0">
                                <div
                                  onClick={() => setSmartAppDropdownOpen((o) => !o)}
                                  className="w-full h-[38px] rounded-[12px] bg-[#e2e2e2] px-[12px] flex items-center justify-between gap-[8px] cursor-pointer"
                                >
                                  <Search className="w-[11px] h-[11px] text-[#9c9c9c] stroke-[1.8] shrink-0" />
                                  <input
                                    type="text"
                                    value={smartAppValue}
                                    onChange={(e) => {
                                      setSmartAppValue(e.target.value);
                                      setSmartAppDropdownOpen(true);
                                    }}
                                    placeholder="Search your software..."
                                    className="w-full bg-transparent text-[10.5px] text-[#333333] placeholder:text-[#9c9c9c] focus:outline-none"
                                  />
                                  <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    stroke="#555555"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="shrink-0"
                                  >
                                    <path d="M4.5 2.5L8 6L4.5 9.5" />
                                  </svg>
                                </div>

                                <AnimatePresence>
                                  {smartAppDropdownOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -4 }}
                                      className="absolute top-[42px] left-0 right-0 bg-white rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.1)] border border-black/[0.05] max-h-[150px] overflow-y-auto z-40 py-1"
                                    >
                                      {[
                                        'Figma',
                                        'Framer',
                                        'Adobe Photoshop',
                                        'Adobe Illustrator',
                                        'Adobe Premiere Pro',
                                        'Blender',
                                        'DaVinci Resolve',
                                        'Affinity Designer',
                                        'ChatGPT',
                                        'VS Code',
                                        'Spotify',
                                      ]
                                        .filter((app) =>
                                          app
                                            .toLowerCase()
                                            .includes(smartAppValue.toLowerCase())
                                        )
                                        .map((app) => (
                                          <button
                                            key={app}
                                            onClick={() => {
                                              setSmartAppValue(app);
                                              setSmartAppDropdownOpen(false);
                                            }}
                                            className="w-full px-3 py-1.5 text-left text-[10.5px] text-[#444] hover:bg-[#0051ff] hover:text-white transition-colors cursor-pointer"
                                          >
                                            {app}
                                          </button>
                                        ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              <div className="flex-1 min-h-[240px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[26px] py-[20px] flex flex-col justify-center">
                                <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
                                  Hint
                                </h4>
                                <p className="text-[10.5px] leading-[1.36] text-[#666666] mb-[22px]">
                                  Pick an installed app. Pressing the assigned key launches it.
                                </p>
                                <button
                                  onClick={() =>
                                    showToast('Smart Actions documentation opened')
                                  }
                                  className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black text-center cursor-pointer"
                                >
                                  Discover more about Smart Actions
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      /* ========================================================= */
                      /* ACTION (MACRO) EDITOR — Keyboard Recorder & Advance Mode  */
                      /* ========================================================= */
                      <div className="flex-1 flex flex-col">
                        {/* Advance mode row */}
                        <div className="flex items-center gap-[10px] mb-[12px] shrink-0">
                          <span className="text-[11.5px] font-medium text-[#555555]">
                            Advance mode
                          </span>
                          <SettingsSwitch
                            checked={actionAdvanceMode}
                            onChange={() => {
                              setActionAdvanceMode((v) => !v);
                              setActiveAdvanceStepDropdown(null);
                            }}
                          />
                        </div>

                        {!actionAdvanceMode ? (
                          <div className="flex-1 flex flex-col">
                            {/* Interactive Key Recording Area */}
                            {actionRecordingStatus === 'idle' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    document.activeElement instanceof HTMLElement
                                  ) {
                                    document.activeElement.blur();
                                  }
                                  setActionRecordingStatus('recording');
                                }}
                                className="w-full min-h-[48px] rounded-[14px] bg-[#e2e2e2] hover:bg-[#dcdcdc] px-[14px] py-[12px] flex items-center justify-center text-[11px] text-[#555555] mb-[12px] transition-colors cursor-pointer shrink-0"
                              >
                                Click here to start creating an action
                              </button>
                            ) : actionRecordingStatus === 'recording' ? (
                              <div
                                onClick={() => {
                                  if (
                                    document.activeElement instanceof HTMLElement
                                  ) {
                                    document.activeElement.blur();
                                  }
                                }}
                                className={`w-full rounded-[14px] bg-[#e2e2e2] px-[12px] py-[10px] mb-[12px] shrink-0 transition-all ${
                                  actionTokens.length > 0
                                    ? 'min-h-[76px] flex flex-col justify-between gap-[8px]'
                                    : 'min-h-[48px] flex items-center justify-end'
                                }`}
                              >
                                {actionTokens.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-[6px]">
                                    {actionTokens.map((tok, idx) => (
                                      <React.Fragment key={tok.id}>
                                        {idx > 0 && (
                                          <span className="text-[11px] text-[#444444] font-medium select-none">
                                            +
                                          </span>
                                        )}
                                        <span
                                          className={`h-[25px] min-w-[25px] px-[9px] rounded-full text-[10.5px] font-medium flex items-center justify-center border ${
                                            tok.kind === 'modifier'
                                              ? 'bg-[#dcfce7] border-[#45a11c] text-[#2d6a18]'
                                              : 'bg-[#e9d5ff] border-[#9333ea] text-[#7e22ce]'
                                          }`}
                                        >
                                          {tok.label}
                                        </span>
                                      </React.Fragment>
                                    ))}
                                  </div>
                                )}

                                <div className="flex justify-end w-full">
                                  <button
                                    type="button"
                                    disabled={actionTokens.length === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (actionTokens.length === 0) return;
                                      setActionRecordingStatus('confirmed');
                                    }}
                                    className={`h-[26px] px-[12px] rounded-full text-[10.5px] font-medium transition-colors ${
                                      actionTokens.length > 0
                                        ? 'bg-white text-[#333333] hover:bg-[#0051ff] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer'
                                        : 'bg-[#d5d5d5] text-[#a6a6a6] cursor-default'
                                    }`}
                                  >
                                    Confirm
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Confirmed state — shows recorded pills inside gray box without Confirm button */
                              <div
                                onClick={() => {
                                  if (
                                    document.activeElement instanceof HTMLElement
                                  ) {
                                    document.activeElement.blur();
                                  }
                                  setActionRecordingStatus('recording');
                                }}
                                title="Click to edit key sequence"
                                className="w-full min-h-[48px] rounded-[14px] bg-[#e2e2e2] hover:bg-[#dcdcdc] px-[12px] py-[10px] mb-[12px] flex flex-wrap items-center gap-[6px] shrink-0 transition-colors cursor-pointer"
                              >
                                {actionTokens.map((tok, idx) => (
                                  <React.Fragment key={tok.id}>
                                    {idx > 0 && (
                                      <span className="text-[11px] text-[#444444] font-medium select-none">
                                        +
                                      </span>
                                    )}
                                    <span
                                      className={`h-[25px] min-w-[25px] px-[9px] rounded-full text-[10.5px] font-medium flex items-center justify-center border ${
                                        tok.kind === 'modifier'
                                          ? 'bg-[#dcfce7] border-[#45a11c] text-[#2d6a18]'
                                          : 'bg-[#e9d5ff] border-[#9333ea] text-[#7e22ce]'
                                      }`}
                                    >
                                      {tok.label}
                                    </span>
                                  </React.Fragment>
                                ))}
                              </div>
                            )}

                            {/* Dashed Hint Box matching Screenshots 1-4 */}
                            <div className="flex-1 min-h-[230px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[24px] py-[18px] flex flex-col justify-between">
                              <div>
                                <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
                                  Hint
                                </h4>
                                <p className="text-[10.5px] leading-[1.38] text-[#666666] mb-[8px]">
                                  Press key combination or a phrase to make an action, such as:
                                </p>
                                <ul className="list-disc pl-[16px] text-[10.5px] leading-[1.42] text-[#666666] mb-[10px] space-y-[2px]">
                                  <li>Shortcuts → Ctrl/Cmd + C for copy;</li>
                                  <li>
                                    Text prompt → “Hello” + Enter key to record text or a phrase.
                                  </li>
                                </ul>
                                <p className="text-[10.5px] leading-[1.38] text-[#666666] mb-[10px]">
                                  Some keys may not be captured during recording because another app is using them.
                                </p>
                                <p className="text-[10.5px] leading-[1.38] text-[#666666]">
                                  Use advance mode to add delays, choose keys manually, or insert missed keys.
                                </p>
                              </div>

                              <button
                                onClick={() =>
                                  showToast('Actions documentation opened')
                                }
                                className="mt-[14px] text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black text-center cursor-pointer"
                              >
                                Discover more about Actions
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Advance Mode ON (Screenshots 1–7) */
                          <div className="flex-1 flex flex-col">
                            <div className="flex flex-col">
                              {actionAdvanceSteps.map((step, idx) => {
                                const isDropdownOpen =
                                  activeAdvanceStepDropdown === step.id;
                                const isMultipleSteps =
                                  actionAdvanceSteps.length > 1;
                                const isLastStep =
                                  idx === actionAdvanceSteps.length - 1;
                                const isBeingDragged =
                                  draggingAdvStep?.id === step.id;
                                const isModeHovered =
                                  hoveredModeStepId === step.id;
                                const isDelayHovered =
                                  hoveredDelayStepId === step.id;

                                return (
                                  <React.Fragment key={step.id}>
                                    <motion.div
                                      layout={!isBeingDragged}
                                      animate={{
                                        y: isBeingDragged
                                          ? draggingAdvStep.offsetY
                                          : 0,
                                        scale: isBeingDragged ? 1.015 : 1,
                                      }}
                                      transition={
                                        isBeingDragged
                                          ? { duration: 0 }
                                          : {
                                              type: 'spring',
                                              stiffness: 420,
                                              damping: 32,
                                            }
                                      }
                                      className={`h-[44px] rounded-full border border-[#dfdfdf] bg-[#ebebeb]/70 px-[9px] flex items-center gap-[6px] relative ${
                                        isBeingDragged
                                          ? 'z-40 shadow-[0_10px_24px_rgba(0,0,0,0.12)] bg-[#efefef]'
                                          : 'z-10'
                                      }`}
                                    >
                                      {/* Left 6-dot drag handle circle — hold and drag to reorder */}
                                      <button
                                        type="button"
                                        onPointerDown={(e) => {
                                          if (e.button !== 0) return;
                                          e.stopPropagation();
                                          setActiveAdvanceStepDropdown(null);
                                          advStepDragRef.current = {
                                            id: step.id,
                                            startY: e.clientY,
                                          };
                                          setDraggingAdvStep({
                                            id: step.id,
                                            offsetY: 0,
                                          });
                                        }}
                                        title="Hold and drag to move"
                                        className="w-[25px] h-[25px] rounded-full bg-white hover:bg-neutral-50 flex items-center justify-center text-[#444444] shadow-[0_1px_2px_rgba(0,0,0,0.03)] shrink-0 cursor-grab active:cursor-grabbing"
                                      >
                                        <svg
                                          width="7"
                                          height="11"
                                          viewBox="0 0 8 12"
                                          fill="currentColor"
                                        >
                                          <circle cx="2" cy="2" r="1.1" />
                                          <circle cx="6" cy="2" r="1.1" />
                                          <circle cx="2" cy="6" r="1.1" />
                                          <circle cx="6" cy="6" r="1.1" />
                                          <circle cx="2" cy="10" r="1.1" />
                                          <circle cx="6" cy="10" r="1.1" />
                                        </svg>
                                      </button>

                                      {/* Center Assign Key dropdown pill */}
                                      <div className="flex-1 relative min-w-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (isDropdownOpen) {
                                              setActiveAdvanceStepDropdown(null);
                                            } else {
                                              setActiveAdvanceStepDropdown(
                                                step.id
                                              );
                                              setGestureKeySearch('');
                                            }
                                          }}
                                          className={`w-full h-[25px] rounded-full bg-white px-[11px] flex items-center justify-between text-[10.5px] text-[#555555] shadow-[0_1px_2px_rgba(0,0,0,0.03)] border transition-colors cursor-pointer ${
                                            isDropdownOpen
                                              ? 'border-[#0051ff]'
                                              : 'border-transparent hover:border-[#0051ff]'
                                          }`}
                                        >
                                          <span className="truncate">
                                            {step.keyLabel || 'Assign Key'}
                                          </span>
                                          {isDropdownOpen ? (
                                            <ChevronUp className="w-[11px] h-[11px] text-[#444] shrink-0" />
                                          ) : (
                                            <ChevronDown className="w-[11px] h-[11px] text-[#444] shrink-0" />
                                          )}
                                        </button>

                                        <AnimatePresence>
                                          {isDropdownOpen && (
                                            <motion.div
                                              initial={{
                                                opacity: 0,
                                                y: -4,
                                                scale: 0.96,
                                              }}
                                              animate={{
                                                opacity: 1,
                                                y: 0,
                                                scale: 1,
                                              }}
                                              exit={{
                                                opacity: 0,
                                                y: -4,
                                                scale: 0.96,
                                              }}
                                              transition={{
                                                duration: 0.2,
                                                ease: [0.32, 0.72, 0, 1],
                                              }}
                                              className="absolute top-[30px] left-0 right-0 bg-white rounded-[16px] shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-black/[0.05] overflow-hidden z-50"
                                            >
                                              <div className="h-[30px] bg-[#e6e6e6] px-[10px] flex items-center gap-[6px]">
                                                <Search className="w-[10.5px] h-[10.5px] text-[#555555] stroke-[2] shrink-0" />
                                                <input
                                                  type="text"
                                                  value={gestureKeySearch}
                                                  onChange={(e) =>
                                                    setGestureKeySearch(
                                                      e.target.value
                                                    )
                                                  }
                                                  placeholder="Search a key"
                                                  className="w-full bg-transparent text-[10px] text-[#333333] placeholder:text-[#9c9c9c] focus:outline-none"
                                                />
                                              </div>

                                              <div className="max-h-[220px] overflow-y-auto list-accordion-scroll divide-y divide-[#eeeeee]">
                                                {BASIC_KEY_SECTIONS.map((sec) => {
                                                  const matchingItems =
                                                    sec.items.filter((it) => {
                                                      if (
                                                        !gestureKeySearch.trim()
                                                      )
                                                        return true;
                                                      const q =
                                                        gestureKeySearch.toLowerCase();
                                                      const lbl = (
                                                        it.listLabel ||
                                                        it.main.replace(
                                                          /\n/g,
                                                          ' '
                                                        )
                                                      ).toLowerCase();
                                                      return lbl.includes(q);
                                                    });
                                                  if (matchingItems.length === 0)
                                                    return null;
                                                  const isSecOpen =
                                                    expandedGestureSection ===
                                                      sec.title ||
                                                    !!gestureKeySearch.trim();
                                                  return (
                                                    <div key={sec.title}>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setExpandedGestureSection(
                                                            expandedGestureSection ===
                                                              sec.title
                                                              ? null
                                                              : sec.title
                                                          )
                                                        }
                                                        className={`w-full h-[28px] px-[11px] flex items-center justify-between text-[10.5px] font-normal transition-colors cursor-pointer ${
                                                          isSecOpen
                                                            ? 'bg-[#0051ff] text-white'
                                                            : 'bg-white text-[#555555] hover:bg-[#0051ff] hover:text-white'
                                                        }`}
                                                      >
                                                        <span className="truncate">
                                                          {sec.title}
                                                        </span>
                                                        {isSecOpen ? (
                                                          <ChevronUp className="w-[11px] h-[11px] shrink-0" />
                                                        ) : (
                                                          <ChevronDown className="w-[11px] h-[11px] shrink-0" />
                                                        )}
                                                      </button>
                                                      <AnimatePresence
                                                        initial={false}
                                                      >
                                                        {isSecOpen && (
                                                          <motion.div
                                                            initial={{
                                                              height: 0,
                                                              opacity: 0,
                                                            }}
                                                            animate={{
                                                              height: 'auto',
                                                              opacity: 1,
                                                            }}
                                                            exit={{
                                                              height: 0,
                                                              opacity: 0,
                                                            }}
                                                            transition={{
                                                              duration: 0.2,
                                                            }}
                                                            className="bg-white py-[2px] overflow-hidden"
                                                          >
                                                            {matchingItems.map(
                                                              (it) => {
                                                                const itemName =
                                                                  it.listLabel ||
                                                                  it.main.replace(
                                                                    /\n/g,
                                                                    ' '
                                                                  );
                                                                return (
                                                                  <button
                                                                    key={it.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                      setActionAdvanceSteps(
                                                                        (
                                                                          prev
                                                                        ) =>
                                                                          prev.map(
                                                                            (
                                                                              s
                                                                            ) =>
                                                                              s.id ===
                                                                              step.id
                                                                                ? {
                                                                                    ...s,
                                                                                    keyLabel:
                                                                                      it.isClearIcon
                                                                                        ? ''
                                                                                        : itemName,
                                                                                  }
                                                                                : s
                                                                          )
                                                                      );
                                                                      setActiveAdvanceStepDropdown(
                                                                        null
                                                                      );
                                                                    }}
                                                                    className="w-full h-[25px] px-[12px] text-left text-[10.5px] text-[#555555] hover:bg-[#0051ff] hover:text-white transition-colors flex items-center cursor-pointer"
                                                                  >
                                                                    {itemName}
                                                                  </button>
                                                                );
                                                              }
                                                            )}
                                                          </motion.div>
                                                        )}
                                                      </AnimatePresence>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>

                                      {/* Key Mode Toggle Button (Press & release vs Press) with Floating Pill Tooltip */}
                                      <div className="relative shrink-0">
                                        <AnimatePresence>
                                          {isModeHovered && (
                                            <motion.div
                                              initial={{
                                                opacity: 0,
                                                y: 3,
                                                scale: 0.95,
                                              }}
                                              animate={{
                                                opacity: 1,
                                                y: 0,
                                                scale: 1,
                                              }}
                                              exit={{
                                                opacity: 0,
                                                y: 2,
                                                scale: 0.95,
                                              }}
                                              transition={{ duration: 0.16 }}
                                              className="absolute -top-[27px] left-1/2 -translate-x-1/2 h-[21px] px-[10px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center text-[10px] font-medium text-[#333333] whitespace-nowrap pointer-events-none z-50"
                                            >
                                              {step.mode === 'press-release'
                                                ? 'Press & release'
                                                : 'Press'}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>

                                        <button
                                          type="button"
                                          onMouseEnter={() =>
                                            setHoveredModeStepId(step.id)
                                          }
                                          onMouseLeave={() =>
                                            setHoveredModeStepId((prev) =>
                                              prev === step.id ? null : prev
                                            )
                                          }
                                          onClick={() =>
                                            setActionAdvanceSteps((prev) =>
                                              prev.map((s) =>
                                                s.id === step.id
                                                  ? {
                                                      ...s,
                                                      mode:
                                                        s.mode ===
                                                        'press-release'
                                                          ? 'press'
                                                          : 'press-release',
                                                    }
                                                  : s
                                              )
                                            )
                                          }
                                          className="w-[25px] h-[25px] rounded-full bg-white hover:bg-[#0051ff] text-[#444444] hover:text-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                                        >
                                          {step.mode === 'press-release' ? (
                                            /* Up + Down staggered arrows icon (Press & release, Image 5) */
                                            <svg
                                              width="11"
                                              height="11"
                                              viewBox="0 0 12 12"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="1.35"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <path d="M4.2 8.5V3M4.2 3L2.4 4.8M4.2 3L6 4.8" />
                                              <path d="M7.8 3.5V9M7.8 9L6 7.2M7.8 9L9.6 7.2" />
                                            </svg>
                                          ) : (
                                            /* Down arrow onto solid dot icon (Press / Hold, Image 6) */
                                            <svg
                                              width="11"
                                              height="11"
                                              viewBox="0 0 12 12"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="1.35"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <path d="M6 2.2V6.8M6 6.8L4.1 4.9M6 6.8L7.9 4.9" />
                                              <circle
                                                cx="6"
                                                cy="9.4"
                                                r="1.15"
                                                fill="currentColor"
                                                stroke="none"
                                              />
                                            </svg>
                                          )}
                                        </button>
                                      </div>

                                      {/* Conditional X Delete Button — ONLY shown when there are 2 or more Assign Key capsules (Images 1 vs 2) */}
                                      {isMultipleSteps && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setActionAdvanceSteps((prev) =>
                                              prev.filter(
                                                (s) => s.id !== step.id
                                              )
                                            )
                                          }
                                          title="Remove key input"
                                          className="w-[25px] h-[25px] rounded-full bg-white hover:bg-[#e01b24] text-[#555555] hover:text-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] shrink-0 transition-colors cursor-pointer"
                                        >
                                          <X className="w-[11px] h-[11px] stroke-[1.7]" />
                                        </button>
                                      )}
                                    </motion.div>

                                    {/* Between two Assign Key capsules: Gray bar -> Hover/Tap "Delay" pill -> Editable "200 ms" capsule that collapses back to the gray bar when cursor leaves while keeping saved ms */}
                                    {!isLastStep && (
                                      <div
                                        onMouseEnter={() =>
                                          setHoveredDelayStepId(step.id)
                                        }
                                        onMouseLeave={() =>
                                          setHoveredDelayStepId((prev) =>
                                            prev === step.id ? null : prev
                                          )
                                        }
                                        className="min-h-[28px] py-[4px] flex items-center justify-center"
                                      >
                                        {step.delayAfterActive &&
                                        (isDelayHovered ||
                                          editingDelayStepId === step.id) ? (
                                          <motion.div
                                            initial={{
                                              opacity: 0,
                                              scale: 0.92,
                                            }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            onClick={(e) => {
                                              setEditingDelayStepId(step.id);
                                              const inputEl =
                                                e.currentTarget.querySelector(
                                                  'input'
                                                ) as HTMLInputElement | null;
                                              if (
                                                inputEl &&
                                                document.activeElement !==
                                                  inputEl
                                              ) {
                                                inputEl.focus();
                                              }
                                            }}
                                            className="h-[26px] px-[11px] rounded-full bg-[#e2e2e2] hover:bg-[#dcdcdc] flex items-center gap-[5px] text-[10.5px] text-[#555555] cursor-text transition-colors"
                                          >
                                            <svg
                                              width="11"
                                              height="11"
                                              viewBox="0 0 12 12"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="1.25"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              className="shrink-0 mr-[3px]"
                                            >
                                              <circle cx="6" cy="6" r="4.6" />
                                              <path d="M6 3.5V6L7.6 7" />
                                            </svg>
                                            <input
                                              type="text"
                                              inputMode="numeric"
                                              autoFocus={
                                                editingDelayStepId === step.id
                                              }
                                              value={step.delayAfterMs ?? '200'}
                                              onFocus={(e) => {
                                                setEditingDelayStepId(step.id);
                                                const len =
                                                  e.currentTarget.value.length;
                                                e.currentTarget.setSelectionRange(
                                                  len,
                                                  len
                                                );
                                              }}
                                              onChange={(e) => {
                                                const val =
                                                  e.target.value.replace(
                                                    /[^0-9]/g,
                                                    ''
                                                  );
                                                setActionAdvanceSteps((prev) =>
                                                  prev.map((s) =>
                                                    s.id === step.id
                                                      ? {
                                                          ...s,
                                                          delayAfterMs: val,
                                                        }
                                                      : s
                                                  )
                                                );
                                              }}
                                              onBlur={() => {
                                                setEditingDelayStepId((prev) =>
                                                  prev === step.id ? null : prev
                                                );
                                                setActionAdvanceSteps((prev) =>
                                                  prev.map((s) =>
                                                    s.id === step.id &&
                                                    !(s.delayAfterMs || '').trim()
                                                      ? {
                                                          ...s,
                                                          delayAfterMs: '200',
                                                        }
                                                      : s
                                                  )
                                                );
                                              }}
                                              onKeyDown={(e) => {
                                                e.stopPropagation();
                                                if (e.key === 'Enter') {
                                                  setActionAdvanceSteps(
                                                    (prev) =>
                                                      prev.map((s) =>
                                                        s.id === step.id &&
                                                        !(
                                                          s.delayAfterMs || ''
                                                        ).trim()
                                                          ? {
                                                              ...s,
                                                              delayAfterMs:
                                                                '200',
                                                            }
                                                          : s
                                                      )
                                                  );
                                                  setEditingDelayStepId(null);
                                                  e.currentTarget.blur();
                                                }
                                              }}
                                              style={{
                                                width: `${Math.max(
                                                  2,
                                                  (step.delayAfterMs ?? '200')
                                                    .length
                                                )}ch`,
                                              }}
                                              className="min-w-[20px] max-w-[54px] bg-transparent text-right text-[10.5px] font-medium text-[#444444] caret-[#333333] focus:outline-none tabular-nums"
                                            />
                                            <span className="text-[#555555] select-none">
                                              ms
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingDelayStepId((prev) =>
                                                  prev === step.id ? null : prev
                                                );
                                                setActionAdvanceSteps((prev) =>
                                                  prev.map((s) =>
                                                    s.id === step.id
                                                      ? {
                                                          ...s,
                                                          delayAfterActive: false,
                                                          delayAfterMs: '200',
                                                        }
                                                      : s
                                                  )
                                                );
                                              }}
                                              title="Remove delay"
                                              className="text-[#555555] hover:text-black ml-[3px] cursor-pointer"
                                            >
                                              <X className="w-[10.5px] h-[10.5px] stroke-[1.7]" />
                                            </button>
                                          </motion.div>
                                        ) : isDelayHovered ? (
                                          <motion.button
                                            type="button"
                                            initial={{
                                              opacity: 0,
                                              scale: 0.9,
                                            }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.15 }}
                                            onClick={() => {
                                              setActionAdvanceSteps((prev) =>
                                                prev.map((s) =>
                                                  s.id === step.id
                                                    ? {
                                                        ...s,
                                                        delayAfterActive: true,
                                                        delayAfterMs:
                                                          s.delayAfterMs ||
                                                          '200',
                                                      }
                                                    : s
                                                )
                                              );
                                              setEditingDelayStepId(step.id);
                                            }}
                                            className="h-[25px] px-[11px] rounded-full bg-[#0051ff] text-white text-[10.5px] font-medium flex items-center gap-[5px] shadow-[0_2px_8px_rgba(0,81,255,0.28)] cursor-pointer"
                                          >
                                            <svg
                                              width="11"
                                              height="11"
                                              viewBox="0 0 12 12"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="1.35"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <circle cx="6" cy="6" r="4.6" />
                                              <path d="M6 3.5V6L7.6 7" />
                                            </svg>
                                            <span>Delay</span>
                                          </motion.button>
                                        ) : (
                                          <div
                                            onClick={() => {
                                              setHoveredDelayStepId(step.id);
                                              if (step.delayAfterActive) {
                                                setEditingDelayStepId(step.id);
                                              }
                                            }}
                                            title={
                                              step.delayAfterActive
                                                ? `Delay: ${
                                                    step.delayAfterMs || '200'
                                                  } ms`
                                                : 'Add delay'
                                            }
                                            className="w-[48px] h-[8px] rounded-full bg-[#dcdcdc] transition-all cursor-pointer"
                                          />
                                        )}
                                      </div>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>

                            {/* + Key-input Pill Button */}
                            <button
                              type="button"
                              onClick={() =>
                                setActionAdvanceSteps((prev) => [
                                  ...prev,
                                  {
                                    id: `adv-step-${Date.now()}-${Math.random()}`,
                                    keyLabel: '',
                                    mode: 'press-release',
                                    delayAfterActive: false,
                                    delayAfterMs: '200',
                                  },
                                ])
                              }
                              className="mx-auto mt-[10px] h-[28px] px-[14px] rounded-full bg-[#e2e2e2] hover:bg-[#d8d8d8] text-[10.5px] font-medium text-[#4a4a4a] flex items-center gap-[5px] transition-colors cursor-pointer"
                            >
                              <span>+</span>
                              <span>Key-input</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="main-drawer-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.26, ease: 'easeInOut' }}
                      className="flex-1 flex flex-col overflow-hidden"
                    >
                      {/* Drawer Top Header: X (left) | Key Mapping (i) (center) */}
                    <div className="px-[18px] pt-[18px] pb-[14px] flex items-center justify-between shrink-0 relative">
                      <button
                        onClick={() => {
                          setMappingDrawerOpen(false);
                          setSelectedKey(null);
                          setSelectedEncoderSub(null);
                          setSelectedDrawerTile(null);
                        }}
                        aria-label="Close Key Mapping"
                        className="w-[24px] h-[24px] rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#555555] hover:text-black transition-all cursor-pointer"
                      >
                        <X className="w-[14px] h-[14px] stroke-[1.7]" />
                      </button>

                      <div className="flex items-center gap-[5px] text-[#555555] text-[12.5px] font-medium">
                        <span>Key Mapping</span>
                        <button
                          onMouseEnter={() => setActiveTooltip('drawer-mapping')}
                          onMouseLeave={() => setActiveTooltip(null)}
                          onClick={() =>
                            setActiveTooltip(
                              activeTooltip === 'drawer-mapping'
                                ? null
                                : 'drawer-mapping'
                            )
                          }
                          className="text-[#666666] hover:text-[#222] cursor-pointer"
                        >
                          <InfoCircleIcon />
                        </button>
                      </div>

                      <div className="w-[24px]" />

                      <AnimatePresence>
                        {activeTooltip === 'drawer-mapping' && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.96 }}
                            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                            className="absolute top-[42px] right-[12px] w-[226px] bg-[#ececec] rounded-[16px] px-[18px] py-[15px] shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-black/[0.04] text-left z-40 pointer-events-none"
                          >
                            <div className="text-[13px] font-semibold text-[#5e5e5e] mb-[9px]">
                              Key Mapping
                            </div>
                            <p className="text-[11px] leading-[1.36] text-[#686868]">
                              Assign keys, actions and multiactions to the selected button.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Search Bar + List/Grid View Toggle */}
                    <div className="px-[15px] flex items-center gap-[7px] shrink-0">
                      <div className="flex-1 h-[27px] rounded-full bg-[#e2e2e2] px-[10px] flex items-center gap-[6px]">
                        <Search className="w-[11px] h-[11px] text-[#666666] stroke-[2] shrink-0" />
                        <input
                          type="text"
                          value={mappingSearch}
                          onChange={(e) => setMappingSearch(e.target.value)}
                          placeholder="Search Key, Action, Multiaction"
                          className="w-full bg-transparent text-[10.5px] text-[#333333] placeholder:text-[#9c9c9c] focus:outline-none"
                        />
                      </div>

                      <div className="w-[62px] h-[27px] rounded-full bg-[#e2e2e2] flex overflow-hidden shrink-0">
                        <button
                          onClick={() => setMappingViewMode('list')}
                          aria-label="List view"
                          className={`flex-1 h-full rounded-l-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center transition-all cursor-pointer ${
                            mappingViewMode === 'list'
                              ? 'bg-[#000000] text-white'
                              : 'text-[#444444] hover:bg-black/5'
                          }`}
                        >
                          <svg
                            width="12"
                            height="10"
                            viewBox="0 0 12 10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          >
                            <circle
                              cx="1.5"
                              cy="1.8"
                              r="0.7"
                              fill="currentColor"
                              stroke="none"
                            />
                            <line x1="4" y1="1.8" x2="10.8" y2="1.8" />
                            <circle
                              cx="1.5"
                              cy="5"
                              r="0.7"
                              fill="currentColor"
                              stroke="none"
                            />
                            <line x1="4" y1="5" x2="10.8" y2="5" />
                            <circle
                              cx="1.5"
                              cy="8.2"
                              r="0.7"
                              fill="currentColor"
                              stroke="none"
                            />
                            <line x1="4" y1="8.2" x2="10.8" y2="8.2" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setMappingViewMode('grid')}
                          aria-label="Grid view"
                          className={`flex-1 h-full rounded-r-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center transition-all cursor-pointer ${
                            mappingViewMode === 'grid'
                              ? 'bg-[#000000] text-white'
                              : 'text-[#444444] hover:bg-black/5'
                          }`}
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          >
                            <rect
                              x="1.2"
                              y="1.2"
                              width="3.8"
                              height="3.8"
                              rx="0.6"
                            />
                            <rect
                              x="7"
                              y="1.2"
                              width="3.8"
                              height="3.8"
                              rx="0.6"
                            />
                            <rect
                              x="1.2"
                              y="7"
                              width="3.8"
                              height="3.8"
                              rx="0.6"
                            />
                            <rect
                              x="7"
                              y="7"
                              width="3.8"
                              height="3.8"
                              rx="0.6"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* 4 Category Pill Tabs: Basic | Action | Multi-A | Smart-A */}
                    <div className="px-[15px] pt-[10px] pb-[10px] grid grid-cols-4 gap-[6px] shrink-0">
                      {(['Basic', 'Action', 'Multi-A', 'Smart-A'] as const).map(
                        (tab) => {
                          const isActive = mappingTab === tab;
                          return (
                            <button
                              key={tab}
                              onClick={() => setMappingTab(tab)}
                              className={`h-[31px] rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] text-[11px] font-medium transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-[#000000] text-white'
                                  : 'bg-white text-[#444444] hover:bg-neutral-50'
                              }`}
                            >
                              {tab}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                      {/* =========================================================== */}
                      {/* TAB 1: BASIC (Grid View OR Accordion List View)             */}
                      {/* =========================================================== */}
                      {mappingTab === 'Basic' && (
                        <motion.div
                          key={`basic-tab-${mappingViewMode}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="flex-1 overflow-y-auto px-[15px] pb-[20px]"
                        >
                          {mappingViewMode === 'grid' ? (
                            <div className="space-y-[18px]">
                              {filteredBasicSections.map((section) => (
                                <div key={section.title}>
                                  <div className="text-[11px] font-medium text-[#444444] mb-[8px]">
                                    {section.title}
                                  </div>

                                  <div className="grid grid-cols-5 gap-[6px]">
                                    {section.items.map((item) => {
                                      const isBeingDragged =
                                        draggedTile?.item.id === item.id;
                                      const isFlashed = flashedTileId === item.id;
                                      return (
                                        <button
                                          key={item.id}
                                          onPointerDown={(e) =>
                                            handleStartTileDrag(e, item, 'Basic')
                                          }
                                          onClick={() =>
                                            handleAssignTileFromDrawer(item)
                                          }
                                          title="Click or drag onto a key to assign"
                                          className={`h-[54px] rounded-[8px] border-[1.5px] flex flex-col items-center justify-center px-1 select-none cursor-grab active:cursor-grabbing ${
                                            isFlashed
                                              ? 'bg-[#000000] text-white border-[#000000] transition-colors duration-75'
                                              : isBeingDragged
                                              ? 'bg-[#e8e8e8] text-[#a8a8a8] border-transparent transition-colors duration-200'
                                              : 'bg-white hover:bg-[#fafafa] text-[#222222] border-transparent hover:border-[#0051ff] transition-colors duration-500 ease-out'
                                          }`}
                                        >
                                          {item.isClearIcon ? (
                                            <EmptyKeyPlusIcon
                                              size={15}
                                              stroke={isFlashed ? '#ffffff' : '#9c9c9c'}
                                            />
                                          ) : item.arrowDir ? (
                                            <ArrowKeyGlyph dir={item.arrowDir} />
                                          ) : item.top ? (
                                            <div className="flex flex-col items-center leading-[1.15] text-[10px]">
                                              <span>{item.top}</span>
                                              <span>{item.main}</span>
                                            </div>
                                          ) : (
                                            <span className="text-[10px] leading-[1.15] text-center whitespace-pre-line">
                                              {item.main}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* LIST VIEW ACCORDION */
                            <div className="pt-[4px] divide-y divide-[#dcdcdc] border-b border-[#dcdcdc]">
                              {filteredBasicSections.map((section) => {
                                const isExpanded =
                                  !!expandedListSections[section.title];
                                return (
                                  <div key={section.title} className="py-[11px]">
                                    <button
                                      onClick={() =>
                                        toggleListSection(section.title)
                                      }
                                      className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                                    >
                                      <div className="flex items-center gap-[5px] min-w-0 flex-1">
                                        <span className="text-[11px] font-medium text-[#525252] shrink-0">
                                          {section.title}
                                        </span>
                                        <span className="text-[11px] font-normal text-[#a6a6a6] truncate">
                                          {section.listPreview}
                                        </span>
                                      </div>
                                      {isExpanded ? (
                                        <ChevronUp className="w-[12px] h-[12px] text-[#555555] shrink-0 stroke-[1.8]" />
                                      ) : (
                                        <ChevronDown className="w-[12px] h-[12px] text-[#555555] shrink-0 stroke-[1.8]" />
                                      )}
                                    </button>

                                    <AnimatePresence initial={false}>
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{
                                            duration: 0.2,
                                            ease: [0.22, 1, 0.36, 1],
                                          }}
                                          className="overflow-hidden"
                                        >
                                          <div className="mt-[12px] max-h-[136px] overflow-y-auto list-accordion-scroll pr-2 space-y-[8px]">
                                            {section.items.map((item) => {
                                              const rowLabel =
                                                item.listLabel ||
                                                item.main.replace(/\n/g, ' ');
                                              const isFlashed =
                                                flashedTileId === item.id;
                                              return (
                                                <button
                                                  key={item.id}
                                                  onPointerDown={(e) =>
                                                    handleStartTileDrag(e, item, 'Basic')
                                                  }
                                                  onClick={() =>
                                                    handleAssignTileFromDrawer(item)
                                                  }
                                                  className={`block w-full px-2 py-0.5 rounded-md border text-left text-[11px] select-none cursor-grab active:cursor-grabbing ${
                                                    isFlashed
                                                      ? 'bg-[#000000] text-white border-[#000000] transition-colors duration-75'
                                                      : 'bg-transparent text-[#666666] hover:text-black border-transparent hover:border-[#0051ff] transition-colors duration-500 ease-out'
                                                  }`}
                                                >
                                                  {rowLabel}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      )}

                    {/* =========================================================== */}
                    {/* TAB 2: ACTION                                               */}
                    {/* =========================================================== */}
                    {mappingTab === 'Action' && (
                      <motion.div
                        key="action-tab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="flex-1 flex flex-col px-[15px] pb-[15px] overflow-hidden"
                      >
                        <button
                          onClick={() => handleOpenCreatorEditor('Action')}
                          className="w-full h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center gap-[6px] text-[10.5px] font-medium text-[#4a4a4a] shadow-[0_1px_2px_rgba(0,0,0,0.03)] mb-[15px] shrink-0 transition-all cursor-pointer"
                        >
                          <Plus className="w-[11px] h-[11px] stroke-[2]" />
                          <span>New Action</span>
                        </button>

                        {customItemsByTab.Action.length === 0 ? (
                          <div className="flex-1 rounded-[20px] border border-dashed border-[#cfcfcf] flex flex-col items-center justify-center px-[22px] text-center">
                            <h3 className="text-[15.5px] font-semibold text-[#5e5e5e] mb-[14px]">
                              Make your first Action!
                            </h3>
                            <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[11px]">
                              An action is a recordable macro that captures a sequence of key presses.
                            </p>
                            <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[11px]">
                              You can record multiple keys in the desired order, and then assign the action to a button.
                            </p>
                            <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[11px]">
                              Once assigned, pressing the button will automatically perform the entire sequence of recorded keys, saving you time and effort.
                            </p>
                            <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[22px]">
                              This feature is perfect for repetitive tasks, custom shortcuts, or complex commands.
                            </p>
                            <button
                              onClick={() =>
                                showToast('Actions documentation opened')
                              }
                              className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black cursor-pointer"
                            >
                              Discover more about Actions
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto pt-[2px]">
                            <div className="text-[11.5px] font-normal text-[#5c5c5c] mb-[10px]">
                              My Actions
                            </div>
                            <div className="grid grid-cols-5 gap-[6px] content-start">
                              {customItemsByTab.Action.map((item) => {
                                const isBeingDragged =
                                  draggedTile?.item.id === item.id;
                                const isFlashed = flashedTileId === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    onPointerDown={(e) =>
                                      handleStartTileDrag(e, item, 'Action')
                                    }
                                    onClick={() => handleAssignTileFromDrawer(item)}
                                    onDoubleClick={() =>
                                      handleOpenCreatorEditor('Action', item)
                                    }
                                    title={`${item.main} (Click or drag onto key, double-click to edit)`}
                                    className={`h-[54px] rounded-[10px] border-[1.5px] flex flex-col items-center justify-center px-1 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] select-none cursor-grab active:cursor-grabbing ${
                                      isFlashed
                                        ? 'bg-[#000000] text-white border-[#000000] transition-colors duration-75'
                                        : isBeingDragged
                                        ? 'bg-[#e8e8e8] text-[#a8a8a8] border-transparent transition-colors duration-200'
                                        : 'bg-white hover:bg-[#fafafa] text-[#444444] border-transparent hover:border-[#0051ff] transition-colors duration-500 ease-out'
                                    }`}
                                  >
                                    {item.iconId ? (
                                      <CustomPickerIcon id={item.iconId} size={20} />
                                    ) : item.emoji ? (
                                      <span className="text-[20px] leading-none">
                                        {item.emoji}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] leading-[1.2] whitespace-pre-line">
                                        {formatCustomTileText(item.main)}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* =========================================================== */}
                    {/* TAB 3: MULTI-A                                              */}
                    {/* =========================================================== */}
                    {mappingTab === 'Multi-A' && (
                      <motion.div
                        key="multi-a-tab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="flex-1 flex flex-col px-[15px] pb-[15px] overflow-hidden"
                      >
                        <button
                          onClick={() => handleOpenCreatorEditor('Multi-A')}
                          className="w-full h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center gap-[6px] text-[10.5px] font-medium text-[#4a4a4a] shadow-[0_1px_2px_rgba(0,0,0,0.03)] mb-[15px] shrink-0 transition-all cursor-pointer"
                        >
                          <Plus className="w-[11px] h-[11px] stroke-[2]" />
                          <span>New Multiaction</span>
                        </button>

                        {customItemsByTab['Multi-A'].length === 0 ? (
                          <div className="flex-1 rounded-[20px] border border-dashed border-[#cfcfcf] flex flex-col items-center justify-center px-[20px] text-center">
                            <h3 className="text-[15.5px] font-semibold text-[#5e5e5e] mb-[14px]">
                              Make your first Multiaction!
                            </h3>
                            <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[11px]">
                              Multiactions let you assign multiple functions to a single button based on how you interact with it.
                            </p>

                            <div className="w-full text-[10.5px] leading-[1.45] text-[#666666] mb-[11px] space-y-[2px]">
                              <div className="flex items-start">
                                <span className="w-3 text-left shrink-0">•</span>
                                <span className="flex-1 text-center">
                                  Tap the button to play or pause your music.
                                </span>
                              </div>
                              <div className="flex items-start">
                                <span className="w-3 text-left shrink-0">•</span>
                                <span className="flex-1 text-center">
                                  Double tap it to skip to the next track.
                                </span>
                              </div>
                              <div className="flex items-start">
                                <span className="w-3 text-left shrink-0">•</span>
                                <span className="flex-1 text-center">
                                  Hold the button to stop.
                                </span>
                              </div>
                              <div className="flex items-start">
                                <span className="w-3 text-left shrink-0">•</span>
                                <span className="flex-1 text-center">
                                  Tap and hold it to activate your voice assistant.
                                </span>
                              </div>
                            </div>

                            <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[22px]">
                              This flexibility means one button can handle several tasks, streamlining your workflow and reducing the need for additional controls.
                            </p>
                            <button
                              onClick={() =>
                                showToast('Multiactions documentation opened')
                              }
                              className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black cursor-pointer"
                            >
                              Discover more about Multiactions
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto pt-[2px]">
                            <div className="text-[11.5px] font-normal text-[#5c5c5c] mb-[10px]">
                              My Multiactions
                            </div>
                            <div className="grid grid-cols-5 gap-[6px] content-start">
                              {customItemsByTab['Multi-A'].map((item) => {
                                const isBeingDragged =
                                  draggedTile?.item.id === item.id;
                                const isFlashed = flashedTileId === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    onPointerDown={(e) =>
                                      handleStartTileDrag(e, item, 'Multi-A')
                                    }
                                    onClick={() => handleAssignTileFromDrawer(item)}
                                    onDoubleClick={() =>
                                      handleOpenCreatorEditor('Multi-A', item)
                                    }
                                    title={`${item.main} (Click or drag onto key, double-click to edit)`}
                                    className={`h-[54px] rounded-[10px] border-[1.5px] flex flex-col items-center justify-center px-1 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] select-none cursor-grab active:cursor-grabbing ${
                                      isFlashed
                                        ? 'bg-[#000000] text-white border-[#000000] transition-colors duration-75'
                                        : isBeingDragged
                                        ? 'bg-[#e8e8e8] text-[#a8a8a8] border-transparent transition-colors duration-200'
                                        : 'bg-white hover:bg-[#fafafa] text-[#444444] border-transparent hover:border-[#0051ff] transition-colors duration-500 ease-out'
                                    }`}
                                  >
                                    {item.iconId ? (
                                      <CustomPickerIcon id={item.iconId} size={20} />
                                    ) : item.emoji ? (
                                      <span className="text-[20px] leading-none">
                                        {item.emoji}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] leading-[1.2] whitespace-pre-line">
                                        {formatCustomTileText(item.main)}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* =========================================================== */}
                    {/* TAB 4: SMART-A (Exact match to Screenshot 10)               */}
                    {/* =========================================================== */}
                    {mappingTab === 'Smart-A' && (
                      <motion.div
                        key="smart-a-tab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="flex-1 flex flex-col px-[15px] pb-[15px] overflow-hidden"
                      >
                        <button
                          onClick={() => handleOpenCreatorEditor('Smart-A')}
                          className="w-full h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center gap-[6px] text-[10.5px] font-medium text-[#4a4a4a] shadow-[0_1px_2px_rgba(0,0,0,0.03)] mb-[15px] shrink-0 transition-all cursor-pointer"
                        >
                          <Plus className="w-[11px] h-[11px] stroke-[2]" />
                          <span>New Smart Action</span>
                        </button>

                        {customItemsByTab['Smart-A'].length === 0 ? (
                          <div className="flex-1 rounded-[20px] border border-dashed border-[#cfcfcf] flex flex-col items-center justify-center px-[24px] text-center">
                            <h3 className="text-[15.5px] font-semibold text-[#5e5e5e] mb-[14px]">
                              Make your first Smart Action!
                            </h3>
                            <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[11px]">
                              A smart action lets you type text, run commands, open websites, or launch apps with a single key press.
                            </p>
                            <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[22px]">
                              Create one, then assign it to a button to trigger it instantly.
                            </p>
                            <button
                              onClick={() =>
                                showToast('Smart Actions documentation opened')
                              }
                              className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black cursor-pointer"
                            >
                              Discover more about Smart Actions
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto pt-[2px]">
                            <div className="text-[11.5px] font-normal text-[#5c5c5c] mb-[10px]">
                              My Smart Actions
                            </div>
                            <div className="grid grid-cols-5 gap-[6px] content-start">
                              {customItemsByTab['Smart-A'].map((item) => {
                                const isBeingDragged =
                                  draggedTile?.item.id === item.id;
                                const isFlashed = flashedTileId === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    onPointerDown={(e) =>
                                      handleStartTileDrag(e, item, 'Smart-A')
                                    }
                                    onClick={() => handleAssignTileFromDrawer(item)}
                                    onDoubleClick={() =>
                                      handleOpenCreatorEditor('Smart-A', item)
                                    }
                                    title={`${item.main} (Click or drag onto key, double-click to edit)`}
                                    className={`h-[54px] rounded-[10px] border-[1.5px] flex flex-col items-center justify-center px-1 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] select-none cursor-grab active:cursor-grabbing ${
                                      isFlashed
                                        ? 'bg-[#000000] text-white border-[#000000] transition-colors duration-75'
                                        : isBeingDragged
                                        ? 'bg-[#e8e8e8] text-[#a8a8a8] border-transparent transition-colors duration-200'
                                        : 'bg-white hover:bg-[#fafafa] text-[#444444] border-transparent hover:border-[#0051ff] transition-colors duration-500 ease-out'
                                    }`}
                                  >
                                    {item.iconId ? (
                                      <CustomPickerIcon id={item.iconId} size={20} />
                                    ) : item.emoji ? (
                                      <span className="text-[20px] leading-none">
                                        {item.emoji}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] leading-[1.2] whitespace-pre-line">
                                        {formatCustomTileText(item.main)}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                    </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.aside>
            )}
          </AnimatePresence>
        </motion.main>
      )}

      {/* ===================================================================== */}
      {/* 2. PRESETS LIBRARY VIEW                                               */}
      {/* ===================================================================== */}
      {activeNav === 'Preset' && (
        <motion.main
          key="preset-screen"
          initial={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.01, filter: 'blur(4px)' }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="flex-1 overflow-y-auto w-full max-w-[732px] mx-auto pt-[54px] pb-[48px] px-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[25px] font-medium text-[#666666] tracking-[-0.01em] leading-none">
                Presets library
              </h1>
              <p className="mt-[12px] text-[10.5px] leading-[1.42] text-[#686868]">
                Presets are ready-made key configurations.
                <br />
                Load a preset to instantly apply a predefined workflow to your device.
              </p>
            </div>

            <div className="flex flex-col items-end gap-[9px]">
              <div className="w-[196px] h-[27px] rounded-full bg-[#e2e2e2] px-[11px] flex items-center gap-[6px]">
                <Search className="w-[11px] h-[11px] text-[#666666] stroke-[2]" />
                <input
                  type="text"
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent text-[11px] text-[#333333] placeholder:text-[#686868] focus:outline-none"
                />
              </div>

              <div className="w-[130px] h-[27px] rounded-full bg-white flex overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <button
                  onClick={() => setPresetOs('mac')}
                  aria-label="macOS Presets"
                  className={`flex-1 h-full flex items-center justify-center transition-colors cursor-pointer ${
                    presetOs === 'mac'
                      ? 'bg-[#000000] text-white'
                      : 'bg-white text-[#555555] hover:bg-neutral-50'
                  }`}
                >
                  <svg
                    width="11"
                    height="13"
                    viewBox="0 0 14 17"
                    fill="currentColor"
                  >
                    <path d="M11.66 9.03C11.64 6.95 13.36 5.93 13.44 5.88C12.46 4.46 10.95 4.26 10.42 4.2C9.15 4.07 7.92 4.95 7.27 4.95C6.62 4.95 5.63 4.21 4.57 4.23C3.19 4.25 1.91 5.03 1.21 6.26C-0.24 8.77 0.84 12.47 2.24 14.49C2.93 15.49 3.74 16.6 4.82 16.56C5.86 16.52 6.26 15.89 7.51 15.89C8.76 15.89 9.13 16.56 10.21 16.54C11.33 16.52 12.03 15.53 12.71 14.53C13.51 13.37 13.83 12.24 13.85 12.18C13.82 12.17 11.68 11.35 11.66 9.03ZM9.58 2.86C10.15 2.17 10.54 1.21 10.43 0.25C9.6 0.28 8.58 0.8 7.99 1.49C7.47 2.09 7.01 3.07 7.14 4.01C8.06 4.08 8.99 3.55 9.58 2.86Z" />
                  </svg>
                </button>
                <button
                  onClick={() => setPresetOs('win')}
                  aria-label="Windows Presets"
                  className={`flex-1 h-full flex items-center justify-center transition-colors cursor-pointer ${
                    presetOs === 'win'
                      ? 'bg-[#000000] text-white'
                      : 'bg-white text-[#555555] hover:bg-neutral-50'
                  }`}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <rect x="0.5" y="0.5" width="4.8" height="4.8" />
                    <rect x="6.7" y="0.5" width="4.8" height="4.8" />
                    <rect x="0.5" y="6.7" width="4.8" height="4.8" />
                    <rect x="6.7" y="6.7" width="4.8" height="4.8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-[36px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[17px]">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className="bg-[#e3e3e3] rounded-[18px] p-[15px] flex flex-col justify-between min-h-[164px]"
              >
                <div>
                  <div className="flex items-center gap-[10px]">
                    <PresetAppIcon id={preset.id} />
                    <div>
                      <div className="text-[10px] text-[#6d6d6d] leading-none mb-[3px]">
                        Layer preset
                      </div>
                      <div className="text-[15px] font-semibold text-[#111111] leading-none">
                        {preset.title}
                      </div>
                    </div>
                  </div>

                  <p className="mt-[11px] text-[10.5px] leading-[1.35] text-[#666666] min-h-[28px]">
                    {preset.description}
                  </p>

                  <div className="mt-[6px] text-[10px] font-medium text-[#2b2b2b]">
                    Author: {preset.author}
                  </div>
                </div>

                <div className="mt-[10px]">
                  {preset.hasPreview ? (
                    <div className="grid grid-cols-2 gap-[8px]">
                      <button
                        onClick={() => setPreviewPreset(preset)}
                        className="h-[27px] rounded-full bg-white hover:bg-neutral-50 text-[10.5px] font-medium text-[#333333] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleInstallPreset(preset)}
                        className="h-[27px] rounded-full bg-white hover:bg-neutral-50 text-[10.5px] font-medium text-[#333333] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                      >
                        Install
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleInstallPreset(preset)}
                      className="w-full h-[27px] rounded-full bg-white hover:bg-neutral-50 text-[10.5px] font-medium text-[#333333] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                    >
                      Install
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.main>
      )}

      {/* ===================================================================== */}
      {/* 3. SETTINGS VIEW                                                      */}
      {/* ===================================================================== */}
      {activeNav === 'Settings' && (
        <motion.main
          key="settings-screen"
          initial={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.01, filter: 'blur(4px)' }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="flex-1 flex flex-col justify-between items-center w-full px-4 overflow-y-auto"
        >
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="w-full max-w-[662px] grid grid-cols-1 md:grid-cols-2 gap-[14px] items-start my-8">
              <div className="flex flex-col gap-[12px]">
                <div className="bg-[#e3e3e3] rounded-[16px] px-[16px] py-[14px]">
                  <h2 className="text-[13.5px] font-medium text-[#4a4a4a] mb-[8px]">
                    Information
                  </h2>
                  <div className="divide-y divide-[#dadada] text-[10.5px]">
                    <div className="py-[7px] flex items-center justify-between">
                      <span className="text-[#585858]">Device connected:</span>
                      <span className="text-[#444444] font-medium">
                        Creator Micro 2
                      </span>
                    </div>
                    <div className="py-[7px] flex items-center justify-between">
                      <span className="text-[#585858]">Firmware version:</span>
                      <span className="text-[#444444] font-medium tabular-nums">
                        1.0.0
                      </span>
                    </div>
                    <div className="pt-[7px] pb-[2px] flex items-center justify-between">
                      <span className="text-[#585858]">Input app version:</span>
                      <span className="text-[#444444] font-medium tabular-nums">
                        1.0.2
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#e3e3e3] rounded-[16px] px-[16px] py-[14px]">
                  <h2 className="text-[13.5px] font-medium text-[#4a4a4a] mb-[8px]">
                    App settings
                  </h2>
                  <div className="divide-y divide-[#dadada] text-[10.5px]">
                    <div className="py-[8px] flex items-center justify-between">
                      <span className="text-[#585858]">
                        Allow anonymous data collection
                      </span>
                      <SettingsSwitch
                        checked={allowAnalytics}
                        onChange={() => setAllowAnalytics((v) => !v)}
                      />
                    </div>
                    <div className="py-[8px] flex items-center justify-between">
                      <span className="text-[#585858]">Launch app at startup</span>
                      <SettingsSwitch
                        checked={launchAtStartup}
                        onChange={() => setLaunchAtStartup((v) => !v)}
                      />
                    </div>
                    <div className="py-[8px] flex items-center justify-between">
                      <span className="text-[#585858] flex items-center gap-[5px]">
                        <span>Allow terminal commands via Smart Actions</span>
                        <span className="text-[#666666]">
                          <InfoCircleIcon size={11} />
                        </span>
                      </span>
                      <SettingsSwitch
                        checked={allowTerminalSmartActions}
                        onChange={() => setAllowTerminalSmartActions((v) => !v)}
                      />
                    </div>
                    <div className="pt-[8px] pb-[2px] flex items-center justify-between">
                      <span className="text-[#585858]">
                        Allow notifications from device
                      </span>
                      <SettingsSwitch
                        checked={allowDeviceNotifications}
                        onChange={() => setAllowDeviceNotifications((v) => !v)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-[12px]">
                <div className="bg-[#e3e3e3] rounded-[16px] px-[16px] py-[14px]">
                  <h2 className="text-[13.5px] font-medium text-[#4a4a4a] mb-[12px]">
                    Support
                  </h2>
                  <div className="space-y-[7px]">
                    {[
                      'Help & Documentation',
                      'Contact support',
                      'Give feedback',
                      'Release notes',
                    ].map((label) => (
                      <button
                        key={label}
                        onClick={() => showToast(`Opened ${label}`)}
                        className="w-full h-[27px] rounded-full bg-white hover:bg-[#0051ff] text-[10.5px] font-medium text-[#444444] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#f2e4c6] rounded-[16px] px-[16px] py-[14px]">
                  <div className="flex items-center gap-[7px] text-[#e09100] text-[13.5px] font-medium mb-[12px]">
                    <WarningTriangleIcon color="#e09100" />
                    <span>Device update</span>
                  </div>
                  <button
                    onClick={() => showToast('Firmware 1.0.0 is up to date')}
                    className="w-full h-[27px] rounded-full bg-white hover:bg-[#f59e0b] text-[10.5px] font-medium text-[#444444] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                  >
                    Check firmware update
                  </button>
                </div>

                <div className="bg-[#efc8c8] rounded-[16px] px-[16px] py-[14px]">
                  <div className="flex items-center gap-[7px] text-[#e01b24] text-[13.5px] font-medium mb-[12px]">
                    <WarningTriangleIcon color="#e01b24" />
                    <span>Danger zone</span>
                  </div>
                  <div className="space-y-[7px]">
                    <button
                      onClick={() => {
                        pushState(INITIAL_PROFILES);
                        setActiveProfileIndex(0);
                        setActiveLayerIndex(0);
                        showToast('Device config reset to factory default');
                      }}
                      className="w-full h-[27px] rounded-full bg-white hover:bg-[#e01b24] text-[10.5px] font-medium text-[#444444] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                    >
                      Reset device config
                    </button>
                    <button
                      onClick={() => showToast('Bootloader ready for advance flash')}
                      className="w-full h-[27px] rounded-full bg-white hover:bg-[#e01b24] text-[10.5px] font-medium text-[#444444] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                    >
                      Advance flash
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="pb-[18px] text-[9.5px] text-[#555555] text-center">
            © 2026 Work Louder Inc.
          </footer>
        </motion.main>
      )}
      </AnimatePresence>

      {/* PRESET PREVIEW MODAL */}
      <AnimatePresence>
        {previewPreset && (
          <motion.div
            key="preset-preview-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#efefef] rounded-[22px] w-[360px] p-6 shadow-2xl border border-black/10 flex flex-col items-center"
            >
              <div className="w-full flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <PresetAppIcon id={previewPreset.id} />
                  <div>
                    <div className="text-[10px] text-[#6d6d6d] leading-none">
                      Preset Preview
                    </div>
                    <div className="text-sm font-semibold text-[#111]">
                      {previewPreset.title}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewPreset(null)}
                  className="w-7 h-7 rounded-full bg-white hover:bg-neutral-100 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#555] transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <MacropadDevice
                layer={previewPreset.layerKeymap}
                selectedKey={null}
                selectedEncoderSub={null}
                dragOverTarget={null}
                swapTopRowEncoders={false}
                dialAngle={45}
                knobAngle={0}
                onSelectKey={() => {}}
                onSelectEncoderSub={() => {}}
              />

              <div className="w-full grid grid-cols-2 gap-2.5 mt-5">
                <button
                  onClick={() => setPreviewPreset(null)}
                  className="h-8 rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] text-xs font-medium text-[#444] transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleInstallPreset(previewPreset)}
                  className="h-8 rounded-full bg-[#0051ff] hover:bg-[#0045d8] text-xs font-medium text-white cursor-pointer"
                >
                  Install Layer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT LAYOUT MODAL */}
      <AnimatePresence>
        {editLayoutModalOpen && (
          <motion.div
            key="edit-layout-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-2xl w-[360px] p-5 shadow-xl border border-black/5"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#222]">
                  Edit Hardware Layout
                </h2>
                <button
                  onClick={() => setEditLayoutModalOpen(false)}
                  className="w-6 h-6 rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] hover:bg-neutral-100 flex items-center justify-center text-[#777] transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#666] mb-4">
                Configure the modular encoder positions on your Creator Micro 2 top row.
              </p>

              <div className="space-y-2.5 mb-5">
                <button
                  onClick={() => setSwapTopRowEncoders(false)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    !swapTopRowEncoders
                      ? 'border-[#0051ff] bg-[#0051ff]/5'
                      : 'border-neutral-200 hover:border-[#0051ff] hover:bg-neutral-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-[#222]">
                      Standard Layout (Default)
                    </div>
                    <div className="text-[11px] text-[#666]">
                      Top-Left Flat Dial · Top-Right Cross Encoder
                    </div>
                  </div>
                  {!swapTopRowEncoders && (
                    <Check className="w-4 h-4 text-[#0051ff]" />
                  )}
                </button>

                <button
                  onClick={() => setSwapTopRowEncoders(true)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    swapTopRowEncoders
                      ? 'border-[#0051ff] bg-[#0051ff]/5'
                      : 'border-neutral-200 hover:border-[#0051ff] hover:bg-neutral-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-[#222]">
                      Swapped Encoders
                    </div>
                    <div className="text-[11px] text-[#666]">
                      Top-Left Cross Encoder · Top-Right Flat Dial
                    </div>
                  </div>
                  {swapTopRowEncoders && (
                    <Check className="w-4 h-4 text-[#0051ff]" />
                  )}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setEditLayoutModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-[#0051ff] text-white text-xs font-medium hover:bg-[#0045d8] transition-colors cursor-pointer"
                >
                  Save Layout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING BLACK KEYCAP DRAG PREVIEW WITH SUBTLE CORNER-HELD CIRCULAR MOTION */}
      <AnimatePresence>
        {draggedTile && (
          <motion.div
            key="dragged-tile-preview"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1.04 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
            style={{
              left: draggedTile.x - 27,
              top: draggedTile.y - 27,
              y: dragSpringBobY,
              rotate: dragSpringRotate,
              transformOrigin: '22% 20%',
            }}
            className="fixed w-[54px] h-[54px] rounded-[9px] bg-[#000000] text-white shadow-[0_14px_28px_rgba(0,0,0,0.34)] flex flex-col items-center justify-center px-1 text-center pointer-events-none z-[100] select-none"
          >
            {draggedTile.item.iconId ? (
              <CustomPickerIcon id={draggedTile.item.iconId} size={20} />
            ) : draggedTile.item.emoji ? (
              <span className="text-[20px] leading-none">
                {draggedTile.item.emoji}
              </span>
            ) : draggedTile.item.isClearIcon ? (
              <EmptyKeyPlusIcon size={16} stroke="#ffffff" />
            ) : draggedTile.item.arrowDir ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: `rotate(${
                    draggedTile.item.arrowDir === 'right'
                      ? 0
                      : draggedTile.item.arrowDir === 'down'
                      ? 90
                      : draggedTile.item.arrowDir === 'left'
                      ? 180
                      : -90
                  }deg)`,
                }}
              >
                <path d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9" />
              </svg>
            ) : draggedTile.item.top ? (
              <div className="flex flex-col items-center leading-[1.15] text-[10.5px] font-medium">
                <span>{draggedTile.item.top}</span>
                <span>{draggedTile.item.main}</span>
              </div>
            ) : (
              <span className="text-[10.5px] font-medium leading-[1.15] text-center whitespace-pre-line">
                {draggedTile.sourceTab === 'Basic'
                  ? draggedTile.item.main
                  : formatCustomTileText(draggedTile.item.main)}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUBTLE FEEDBACK TOAST */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key="feedback-toast"
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-black text-white text-[11px] font-medium px-4 py-1.5 rounded-full shadow-lg z-50"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================== */
/* SUBCOMPONENTS                                                              */
/* ========================================================================== */

function IsometricKeyIcon({
  type,
  active,
}: {
  type: 'B' | 'A' | 'MA' | 'S';
  active: boolean;
}) {
  const strokeColor = active ? '#000000' : '#4a4a4a';

  if (type === 'MA') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d="M14 13.5L22.5 18L14 22.5L5.5 18L14 13.5Z"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 18V20.2L14 24.7L22.5 20.2V18"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M14 4.2L22.5 8.7L14 13.2L5.5 8.7L14 4.2Z"
          fill={active ? '#0051ff' : 'white'}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 8.7V10.9L14 15.4L22.5 10.9V8.7"
          fill={active ? '#0051ff' : 'white'}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <text
          x="14"
          y="10.2"
          textAnchor="middle"
          fill={strokeColor}
          fontSize="5.4"
          fontWeight="600"
          transform="rotate(-25 14 9)"
        >
          M
        </text>
        <text
          x="14"
          y="20.2"
          textAnchor="middle"
          fill={strokeColor}
          fontSize="5.4"
          fontWeight="600"
          transform="rotate(-25 14 19)"
        >
          A
        </text>
      </svg>
    );
  }

  return (
    <svg width="30" height="26" viewBox="0 0 30 26" fill="none">
      <path
        d="M15 4.2L26.2 10.4L15 16.6L3.8 10.4L15 4.2Z"
        stroke={strokeColor}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M3.8 10.4V14.2L15 20.4L26.2 14.2V10.4"
        stroke={strokeColor}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <text
        x="15"
        y="12.5"
        textAnchor="middle"
        fill={strokeColor}
        fontSize="7.5"
        fontWeight="600"
        transform="rotate(-26 15 11)"
      >
        {type}
      </text>
      {type === 'S' && (
        <path
          d="M20.5 3.2L21.4 5.9L24.1 6.8L21.4 7.7L20.5 10.4L19.6 7.7L16.9 6.8L19.6 5.9L20.5 3.2Z"
          fill={strokeColor}
        />
      )}
    </svg>
  );
}

function ArrowKeyGlyph({ dir }: { dir: 'right' | 'left' | 'down' | 'up' }) {
  const rotation =
    dir === 'right'
      ? 0
      : dir === 'down'
      ? 90
      : dir === 'left'
      ? 180
      : -90;
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      stroke="#222222"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9" />
    </svg>
  );
}

function InfoCircleIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 7.2V11.2" strokeLinecap="round" />
      <circle cx="8" cy="4.9" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WarningTriangleIcon({ color }: { color: string }) {
  return (
    <svg
      width="15"
      height="14"
      viewBox="0 0 16 15"
      fill="none"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.5L14.8 13.5H1.2L8 1.5Z" />
      <path d="M8 6V9.2" />
      <circle cx="8" cy="11.4" r="0.6" fill={color} stroke="none" />
    </svg>
  );
}

function SettingsSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`w-[29px] h-[16px] rounded-full p-[2px] flex items-center transition-colors duration-200 cursor-pointer ${
        checked ? 'bg-[#000000] justify-end' : 'bg-[#b3b3b3] justify-start'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
        className="w-[12px] h-[12px] rounded-full bg-white shadow-xs"
      />
    </button>
  );
}

function PresetAppIcon({ id }: { id: string }) {
  switch (id) {
    case 'chatgpt':
      return (
        <div className="w-[30px] h-[30px] rounded-[7px] bg-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.06)] shrink-0">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#111"
            strokeWidth="1.7"
          >
            <path d="M12 3.5C9.5 3.5 7.5 5.2 7.2 7.5C5.2 8.1 3.8 9.9 3.8 12C3.8 14.2 5.2 16 7.2 16.5C7.6 18.8 9.5 20.5 12 20.5C14.5 20.5 16.5 18.8 16.8 16.5C18.8 15.9 20.2 14.1 20.2 12C20.2 9.8 18.8 8 16.8 7.5C16.4 5.2 14.5 3.5 12 3.5Z" />
            <polygon points="12,8.2 15.3,10.1 15.3,13.9 12,15.8 8.7,13.9 8.7,10.1" />
          </svg>
        </div>
      );
    case 'framer':
      return (
        <div className="w-[30px] h-[30px] rounded-[7px] bg-gradient-to-b from-[#25b8ff] to-[#0055ff] flex items-center justify-center shrink-0">
          <svg width="14" height="18" viewBox="0 0 14 20" fill="white">
            <path d="M1 1H13V7H7L1 1ZM1 7H7L13 13H1V7ZM1 13H7V19L1 13Z" />
          </svg>
        </div>
      );
    case 'figma':
      return (
        <div className="w-[30px] h-[30px] rounded-[7px] bg-[#1e1e1e] flex items-center justify-center shrink-0">
          <svg width="13" height="19" viewBox="0 0 14 21" fill="none">
            <path
              d="M3.5 21C5.43 21 7 19.43 7 17.5V14H3.5C1.57 14 0 15.57 0 17.5C0 19.43 1.57 21 3.5 21Z"
              fill="#0ACF83"
            />
            <path
              d="M0 10.5C0 8.57 1.57 7 3.5 7H7V14H3.5C1.57 14 0 12.43 0 10.5Z"
              fill="#A259FF"
            />
            <path
              d="M0 3.5C0 1.57 1.57 0 3.5 0H7V7H3.5C1.57 7 0 5.43 0 3.5Z"
              fill="#F24E1E"
            />
            <path
              d="M7 0H10.5C12.43 0 14 1.57 14 3.5C14 5.43 12.43 7 10.5 7H7V0Z"
              fill="#FF7262"
            />
            <path
              d="M14 10.5C14 12.43 12.43 14 10.5 14C8.57 14 7 12.43 7 10.5C7 8.57 8.57 7 10.5 7C12.43 7 14 8.57 14 10.5Z"
              fill="#1ABCFE"
            />
          </svg>
        </div>
      );
    case 'illustrator':
      return (
        <div className="w-[30px] h-[30px] rounded-[7px] bg-[#330000] flex items-center justify-center shrink-0">
          <span className="text-[#ff9a00] font-bold text-[13px] tracking-tight">
            Ai
          </span>
        </div>
      );
    case 'photoshop':
      return (
        <div className="w-[30px] h-[30px] rounded-[7px] bg-[#001e36] flex items-center justify-center shrink-0">
          <span className="text-[#31a8ff] font-bold text-[13px] tracking-tight">
            Ps
          </span>
        </div>
      );
    case 'premiere':
      return (
        <div className="w-[30px] h-[30px] rounded-[7px] bg-[#00005b] flex items-center justify-center shrink-0">
          <span className="text-[#9999ff] font-bold text-[13px] tracking-tight">
            Pr
          </span>
        </div>
      );
    case 'blender':
      return (
        <div className="w-[30px] h-[30px] rounded-[7px] bg-[#232323] flex items-center justify-center shrink-0">
          <svg width="20" height="17" viewBox="0 0 24 20" fill="none">
            <path
              d="M9.5 3.5L16.5 7.5M5 9.5H15.5M14.5 13.5C14.5 16.26 12.04 18.5 9 18.5C5.96 18.5 3.5 16.26 3.5 13.5C3.5 10.74 5.96 8.5 9 8.5C12.04 8.5 14.5 10.74 14.5 13.5Z"
              stroke="#f5792a"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            <circle cx="9" cy="13.5" r="2.4" fill="#2685e8" />
          </svg>
        </div>
      );
    case 'davinci':
      return (
        <div className="w-[30px] h-[30px] rounded-[7px] bg-[#1b2028] flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="7.5" r="4" stroke="#29b6f6" strokeWidth="2.2" />
            <circle cx="8.2" cy="14.5" r="4" stroke="#ffca28" strokeWidth="2.2" />
            <circle cx="15.8" cy="14.5" r="4" stroke="#ef5350" strokeWidth="2.2" />
          </svg>
        </div>
      );
    case 'affinity':
      return (
        <div className="w-[30px] h-[30px] rounded-[7px] bg-[#75d957] flex items-center justify-center shrink-0">
          <span className="text-[#111111] font-extrabold text-[19px] leading-none -mt-0.5">
            a
          </span>
        </div>
      );
    default:
      return null;
  }
}

function EmptyKeyPlusIcon({
  size = 16,
  stroke = '#ffffff',
}: {
  size?: number;
  stroke?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className="pointer-events-none"
    >
      <rect
        x="1.75"
        y="1.75"
        width="14.5"
        height="14.5"
        rx="6"
        stroke={stroke}
        strokeWidth="1.6"
      />
      <line
        x1="9"
        y1="5.8"
        x2="9"
        y2="12.2"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="5.8"
        y1="9"
        x2="12.2"
        y2="9"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface MacropadDeviceProps {
  layer: LayerKeymap;
  selectedKey: KeySlotId | null;
  selectedEncoderSub: EncoderSubActionId | null;
  dragOverTarget: { slotId: KeySlotId; subAction?: EncoderSubActionId } | null;
  draggedFromSlot?: KeySlotId | null;
  swapTopRowEncoders: boolean;
  dialAngle: number;
  knobAngle: number;
  onSelectKey: (slotId: KeySlotId) => void;
  onSelectEncoderSub: (
    slotId: 'dial-tl' | 'knob-tr',
    sub: EncoderSubActionId
  ) => void;
  onStartKeyDrag?: (
    e: React.PointerEvent,
    slotId: KeySlotId,
    sub?: EncoderSubActionId
  ) => void;
}

function MacropadDevice({
  layer,
  selectedKey,
  selectedEncoderSub,
  dragOverTarget,
  draggedFromSlot = null,
  swapTopRowEncoders,
  dialAngle,
  knobAngle,
  onSelectKey,
  onSelectEncoderSub,
  onStartKeyDrag = () => {},
}: MacropadDeviceProps) {
  const leftEncoderSlot: 'dial-tl' | 'knob-tr' = !swapTopRowEncoders
    ? 'dial-tl'
    : 'knob-tr';
  const rightEncoderSlot: 'dial-tl' | 'knob-tr' = !swapTopRowEncoders
    ? 'knob-tr'
    : 'dial-tl';

  const isLeftEncoderOpen = selectedKey === leftEncoderSlot;
  const isRightEncoderOpen = selectedKey === rightEncoderSlot;

  return (
    <div className="relative flex items-center justify-center">
      {/* LEFT ENCODER 3-BUTTON POPUP CAPSULE */}
      <AnimatePresence>
        {isLeftEncoderOpen && (
          <EncoderPopupCapsule
            key={`encoder-popup-${leftEncoderSlot}`}
            slotId={leftEncoderSlot}
            side="left"
            actions={getEncoderActions(layer[leftEncoderSlot], leftEncoderSlot)}
            selectedSub={selectedEncoderSub}
            dragOverSub={
              dragOverTarget?.slotId === leftEncoderSlot
                ? dragOverTarget.subAction || null
                : null
            }
            onSelectSub={(sub) => onSelectEncoderSub(leftEncoderSlot, sub)}
            onStartSubDrag={(e, sub) => onStartKeyDrag(e, leftEncoderSlot, sub)}
          />
        )}
      </AnimatePresence>

      {/* RIGHT ENCODER 3-BUTTON POPUP CAPSULE */}
      <AnimatePresence>
        {isRightEncoderOpen && (
          <EncoderPopupCapsule
            key={`encoder-popup-${rightEncoderSlot}`}
            slotId={rightEncoderSlot}
            side="right"
            actions={getEncoderActions(layer[rightEncoderSlot], rightEncoderSlot)}
            selectedSub={selectedEncoderSub}
            dragOverSub={
              dragOverTarget?.slotId === rightEncoderSlot
                ? dragOverTarget.subAction || null
                : null
            }
            onSelectSub={(sub) => onSelectEncoderSub(rightEncoderSlot, sub)}
            onStartSubDrag={(e, sub) => onStartKeyDrag(e, rightEncoderSlot, sub)}
          />
        )}
      </AnimatePresence>

      <div className="w-[214px] h-[221px] bg-[#050505] rounded-[27px] p-[14px] flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
        <div className="w-full h-full bg-[#151515] rounded-[17px] p-[5px] grid grid-cols-4 grid-rows-4 gap-[2px] place-items-center">
          {/* ROW 1 */}
          {!swapTopRowEncoders ? (
            <FlatDialControl
              selected={selectedKey === 'dial-tl'}
              angle={dialAngle}
              title={`Dial: ${layer['dial-tl'].binding}`}
              onClick={() => onSelectKey('dial-tl')}
            />
          ) : (
            <KnobControl
              selected={selectedKey === 'knob-tr'}
              angle={knobAngle}
              onClick={() => onSelectKey('knob-tr')}
              title={`Knob: ${layer['knob-tr'].binding}`}
            />
          )}

          <KeycapButton
            slotId="r1c2"
            label={layer.r1c2.label}
            binding={layer.r1c2.binding}
            iconId={layer.r1c2.iconId}
            selected={selectedKey === 'r1c2'}
            dragOver={dragOverTarget?.slotId === 'r1c2'}
            isDraggingSource={draggedFromSlot === 'r1c2'}
            isLowercase
            onClick={() => onSelectKey('r1c2')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r1c2')}
          />

          <KeycapButton
            slotId="r1c3"
            label={layer.r1c3.label}
            binding={layer.r1c3.binding}
            iconId={layer.r1c3.iconId}
            selected={selectedKey === 'r1c3'}
            dragOver={dragOverTarget?.slotId === 'r1c3'}
            isDraggingSource={draggedFromSlot === 'r1c3'}
            isLowercase
            onClick={() => onSelectKey('r1c3')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r1c3')}
          />

          {!swapTopRowEncoders ? (
            <KnobControl
              selected={selectedKey === 'knob-tr'}
              angle={knobAngle}
              onClick={() => onSelectKey('knob-tr')}
              title={`Knob: ${layer['knob-tr'].binding}`}
            />
          ) : (
            <FlatDialControl
              selected={selectedKey === 'dial-tl'}
              angle={dialAngle}
              title={`Dial: ${layer['dial-tl'].binding}`}
              onClick={() => onSelectKey('dial-tl')}
            />
          )}

          {/* ROW 2 */}
          <KeycapButton
            slotId="r2c1"
            label={layer.r2c1.label}
            binding={layer.r2c1.binding}
            iconId={layer.r2c1.iconId}
            selected={selectedKey === 'r2c1'}
            dragOver={dragOverTarget?.slotId === 'r2c1'}
            isDraggingSource={draggedFromSlot === 'r2c1'}
            onClick={() => onSelectKey('r2c1')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r2c1')}
          />
          <KeycapButton
            slotId="r2c2"
            label={layer.r2c2.label}
            binding={layer.r2c2.binding}
            iconId={layer.r2c2.iconId}
            selected={selectedKey === 'r2c2'}
            dragOver={dragOverTarget?.slotId === 'r2c2'}
            isDraggingSource={draggedFromSlot === 'r2c2'}
            onClick={() => onSelectKey('r2c2')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r2c2')}
          />
          <KeycapButton
            slotId="r2c3"
            label={layer.r2c3.label}
            binding={layer.r2c3.binding}
            iconId={layer.r2c3.iconId}
            selected={selectedKey === 'r2c3'}
            dragOver={dragOverTarget?.slotId === 'r2c3'}
            isDraggingSource={draggedFromSlot === 'r2c3'}
            onClick={() => onSelectKey('r2c3')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r2c3')}
          />
          <KeycapButton
            slotId="r2c4"
            label={layer.r2c4.label}
            binding={layer.r2c4.binding}
            iconId={layer.r2c4.iconId}
            selected={selectedKey === 'r2c4'}
            dragOver={dragOverTarget?.slotId === 'r2c4'}
            isDraggingSource={draggedFromSlot === 'r2c4'}
            onClick={() => onSelectKey('r2c4')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r2c4')}
          />

          {/* ROW 3 */}
          <KeycapButton
            slotId="r3c1"
            label={layer.r3c1.label}
            binding={layer.r3c1.binding}
            iconId={layer.r3c1.iconId}
            selected={selectedKey === 'r3c1'}
            dragOver={dragOverTarget?.slotId === 'r3c1'}
            isDraggingSource={draggedFromSlot === 'r3c1'}
            onClick={() => onSelectKey('r3c1')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r3c1')}
          />
          <KeycapButton
            slotId="r3c2"
            label={layer.r3c2.label}
            binding={layer.r3c2.binding}
            iconId={layer.r3c2.iconId}
            selected={selectedKey === 'r3c2'}
            dragOver={dragOverTarget?.slotId === 'r3c2'}
            isDraggingSource={draggedFromSlot === 'r3c2'}
            onClick={() => onSelectKey('r3c2')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r3c2')}
          />
          <KeycapButton
            slotId="r3c3"
            label={layer.r3c3.label}
            binding={layer.r3c3.binding}
            iconId={layer.r3c3.iconId}
            selected={selectedKey === 'r3c3'}
            dragOver={dragOverTarget?.slotId === 'r3c3'}
            isDraggingSource={draggedFromSlot === 'r3c3'}
            onClick={() => onSelectKey('r3c3')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r3c3')}
          />
          <KeycapButton
            slotId="r3c4"
            label={layer.r3c4.label}
            binding={layer.r3c4.binding}
            iconId={layer.r3c4.iconId}
            selected={selectedKey === 'r3c4'}
            dragOver={dragOverTarget?.slotId === 'r3c4'}
            isDraggingSource={draggedFromSlot === 'r3c4'}
            onClick={() => onSelectKey('r3c4')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r3c4')}
          />

          {/* ROW 4: Circular bottom-left button (NOT a drag/drop target) + 3 rectangular keys */}
          <div className="w-[42px] h-[42px] flex items-center justify-center group relative">
            <button
              onClick={() => onSelectKey('btn-bl')}
              title={`Layer Key: ${layer['btn-bl'].binding}`}
              className={`w-[20px] h-[20px] rounded-full border-[1.5px] transition-all duration-150 cursor-pointer focus:outline-none ${
                selectedKey === 'btn-bl'
                  ? 'bg-[#0051ff] border-[#0051ff] shadow-[0_0_14px_rgba(0,81,255,0.85)]'
                  : 'bg-[#303030] border-[#3a3a3a] group-hover:border-[#0051ff] hover:border-[#0051ff]'
              }`}
            />
          </div>
          <KeycapButton
            slotId="r4c2"
            label={layer.r4c2.label}
            binding={layer.r4c2.binding}
            iconId={layer.r4c2.iconId}
            selected={selectedKey === 'r4c2'}
            dragOver={dragOverTarget?.slotId === 'r4c2'}
            isDraggingSource={draggedFromSlot === 'r4c2'}
            onClick={() => onSelectKey('r4c2')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r4c2')}
          />
          <KeycapButton
            slotId="r4c3"
            label={layer.r4c3.label}
            binding={layer.r4c3.binding}
            iconId={layer.r4c3.iconId}
            selected={selectedKey === 'r4c3'}
            dragOver={dragOverTarget?.slotId === 'r4c3'}
            isDraggingSource={draggedFromSlot === 'r4c3'}
            onClick={() => onSelectKey('r4c3')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r4c3')}
          />
          <KeycapButton
            slotId="r4c4"
            label={layer.r4c4.label}
            binding={layer.r4c4.binding}
            iconId={layer.r4c4.iconId}
            selected={selectedKey === 'r4c4'}
            dragOver={dragOverTarget?.slotId === 'r4c4'}
            isDraggingSource={draggedFromSlot === 'r4c4'}
            onClick={() => onSelectKey('r4c4')}
            onPointerDown={(e) => onStartKeyDrag(e, 'r4c4')}
          />
        </div>
      </div>
    </div>
  );
}

function EncoderPopupCapsule({
  slotId,
  side,
  actions,
  selectedSub,
  dragOverSub,
  onSelectSub,
  onStartSubDrag,
}: {
  slotId: 'dial-tl' | 'knob-tr';
  side: 'left' | 'right';
  actions: Record<EncoderSubActionId, EncoderSubBinding>;
  selectedSub: EncoderSubActionId | null;
  dragOverSub: EncoderSubActionId | null;
  onSelectSub: (sub: EncoderSubActionId) => void;
  onStartSubDrag: (e: React.PointerEvent, sub: EncoderSubActionId) => void;
}) {
  const [hoveredSub, setHoveredSub] = useState<EncoderSubActionId | null>(null);

  const items: { id: EncoderSubActionId; bottomText?: string }[] = [
    { id: 'cw', bottomText: 'CW' },
    { id: 'press' },
    { id: 'ccw', bottomText: 'CCW' },
  ];

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.84,
        x: side === 'left' ? 18 : -18,
        filter: 'blur(2px)',
      }}
      animate={{
        opacity: 1,
        scale: 1,
        x: 0,
        filter: 'blur(0px)',
      }}
      exit={{
        opacity: 0,
        scale: 0.86,
        x: side === 'left' ? 14 : -14,
        filter: 'blur(2px)',
      }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      style={{
        transformOrigin: side === 'left' ? 'right center' : 'left center',
      }}
      className={`absolute top-[11px] ${
        side === 'left' ? 'right-[calc(100%+7px)]' : 'left-[calc(100%+7px)]'
      } h-[58px] px-[6px] rounded-full bg-[#e2e2e2] shadow-[0_3px_12px_rgba(0,0,0,0.08)] border border-black/[0.03] flex items-center gap-[6px] z-30`}
    >
      {items.map((item) => {
        const subData = actions[item.id];
        const isSelected = selectedSub === item.id;
        const isDragOver = dragOverSub === item.id;
        const isHovered = hoveredSub === item.id || isDragOver;
        const accentStroke = isSelected ? '#ffffff' : '#0051ff';

        return (
          <div key={item.id} className="relative flex items-center justify-center">
            {/* Floating white assigned-key pill above hovered sub-button */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.94 }}
                  transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute -top-[36px] left-1/2 -translate-x-1/2 h-[27px] px-[13px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)] flex items-center justify-center text-[11px] font-medium text-[#555555] whitespace-nowrap pointer-events-none z-40"
                >
                  {subData.binding}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              data-drop-slot={slotId}
              data-drop-encoder-sub={item.id}
              onPointerDown={(e) => onStartSubDrag(e, item.id)}
              onClick={() => onSelectSub(item.id)}
              onMouseEnter={() => setHoveredSub(item.id)}
              onMouseLeave={() => setHoveredSub(null)}
              className={`w-[46px] h-[46px] rounded-full relative flex flex-col items-center justify-center border-[1.5px] transition-all duration-150 cursor-pointer focus:outline-none select-none ${
                isSelected
                  ? 'bg-[#0051ff] border-[#0051ff] text-white shadow-[0_0_14px_rgba(0,81,255,0.85)]'
                  : isDragOver
                  ? 'bg-[#313131] text-white border-[#0051ff] shadow-[0_0_10px_rgba(0,81,255,0.5)]'
                  : 'bg-[#313131] text-white border-transparent hover:border-[#0051ff]'
              }`}
            >
              {/* SVG Directional Arrows (CW arc, Press down arrow, CCW arc) in Blue theme */}
              <svg
                width="46"
                height="46"
                viewBox="0 0 46 46"
                fill="none"
                className="absolute inset-0 pointer-events-none"
              >
                {item.id === 'cw' && (
                  <>
                    <path
                      d="M 6.2 22.5 A 16.8 16.8 0 0 1 20.5 6.8"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 17.2 4.8 L 21.1 6.7 L 18.4 10.3"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {item.id === 'press' && (
                  <>
                    <path
                      d="M 23 30.5 L 23 39.2"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 19.8 36.2 L 23 39.5 L 26.2 36.2"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {item.id === 'ccw' && (
                  <>
                    <path
                      d="M 39.8 22.5 A 16.8 16.8 0 0 0 25.5 6.8"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 28.8 4.8 L 24.9 6.7 L 27.6 10.3"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </svg>

              {/* Center Short Assigned Label (e.g. vo..., pl...) */}
              <span
                className={`text-[10.5px] font-medium leading-none tracking-[0.01em] z-10 ${
                  item.id === 'press' ? '-mt-[4px]' : 'mt-[4px]'
                }`}
              >
                {subData.label}
              </span>

              {/* Bottom CW / CCW Label */}
              {item.bottomText && (
                <span className="text-[8.5px] font-semibold leading-none tracking-[0.03em] mt-[3px] z-10">
                  {item.bottomText}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </motion.div>
  );
}

function FlatDialControl({
  selected,
  angle,
  title,
  onClick,
}: {
  selected: boolean;
  angle: number;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-[39px] h-[39px] rounded-full relative flex items-center justify-center border-[1.5px] transition-all duration-150 cursor-pointer focus:outline-none select-none ${
        selected
          ? 'border-[#0051ff] shadow-[0_0_16px_rgba(0,81,255,0.85)] z-10'
          : 'border-transparent hover:border-[#0051ff] hover:z-10'
      }`}
    >
      <svg
        width="39"
        height="39"
        viewBox="0 0 40 40"
        className="transition-transform duration-150 pointer-events-none"
        style={{ transform: `rotate(${angle - 45}deg)` }}
      >
        <defs>
          <linearGradient id="dialUpperLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1b1b1b" />
            <stop offset="48%" stopColor="#353535" />
            <stop offset="50%" stopColor="#4c4c4c" />
            <stop offset="52%" stopColor="#262626" />
            <stop offset="100%" stopColor="#333333" />
          </linearGradient>
          <linearGradient id="dialSelectedBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0051ff" />
            <stop offset="49%" stopColor="#0051ff" />
            <stop offset="51%" stopColor="#003ec7" />
            <stop offset="100%" stopColor="#004be8" />
          </linearGradient>
        </defs>
        <circle
          cx="20"
          cy="20"
          r="19"
          fill={selected ? 'url(#dialSelectedBlue)' : 'url(#dialUpperLeft)'}
          stroke={selected ? '#0051ff' : '#262626'}
          strokeWidth="0.8"
        />
        <line
          x1="6.5"
          y1="33.5"
          x2="33.5"
          y2="6.5"
          stroke={selected ? 'rgba(255,255,255,0.45)' : '#4a4a4a'}
          strokeWidth="1.1"
          strokeOpacity="0.7"
        />
      </svg>
    </button>
  );
}

interface KeycapButtonProps {
  slotId: KeySlotId;
  label: string;
  binding: string;
  iconId?: string;
  selected: boolean;
  dragOver?: boolean;
  isDraggingSource?: boolean;
  isLowercase?: boolean;
  onClick: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
}

function KeycapButton({
  slotId,
  label,
  binding,
  iconId,
  selected,
  dragOver,
  isDraggingSource,
  isLowercase,
  onClick,
  onPointerDown,
}: KeycapButtonProps) {
  const isEmpty =
    !iconId && (!label || label === '—' || binding === 'blank');
  const isMultiWordCustom = !iconId && !isEmpty && label.length > 4;

  return (
    <button
      data-drop-slot={slotId}
      onPointerDown={onPointerDown}
      onClick={onClick}
      title={binding}
      className={`w-[42px] h-[42px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all duration-150 cursor-grab active:cursor-grabbing focus:outline-none select-none ${
        isMultiWordCustom
          ? 'text-[8.5px] font-medium leading-[1.08] px-[2px] text-center'
          : isLowercase
          ? 'text-[11px] font-normal'
          : 'text-[11.5px] font-medium'
      } ${
        isDraggingSource
          ? 'bg-[#1e1e1e] text-[#6d6d6d] border-transparent'
          : selected
          ? 'bg-[#0051ff] border-[#0051ff] text-white shadow-[0_0_16px_rgba(0,81,255,0.85)] z-10'
          : dragOver
          ? 'bg-[#313131] text-[#f3f3f3] border-[#0051ff] z-10'
          : 'bg-[#313131] text-[#f3f3f3] border-t-[#3e3e3e] border-l-[#3e3e3e] border-b-[#252525] border-r-[#252525] hover:border-[#0051ff] hover:z-10 active:scale-[0.97]'
      }`}
    >
      {iconId ? (
        <CustomPickerIcon id={iconId} size={17} />
      ) : isEmpty ? (
        <EmptyKeyPlusIcon size={16} stroke="#ffffff" />
      ) : (
        <span
          className={
            isMultiWordCustom
              ? 'leading-[1.08] break-words line-clamp-3'
              : 'leading-none tracking-[0.01em]'
          }
        >
          {label}
        </span>
      )}
    </button>
  );
}

interface KnobControlProps {
  selected: boolean;
  angle: number;
  title: string;
  onClick: () => void;
}

function KnobControl({
  selected,
  angle,
  title,
  onClick,
}: KnobControlProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-[39px] h-[39px] rounded-full relative flex items-center justify-center border-[1.5px] transition-all duration-150 cursor-pointer focus:outline-none select-none ${
        selected
          ? 'bg-[#0051ff] border-[#0051ff] shadow-[0_0_16px_rgba(0,81,255,0.85)] z-10'
          : 'border-transparent hover:border-[#0051ff] hover:z-10'
      }`}
    >
      <svg
        width="39"
        height="39"
        viewBox="0 0 40 40"
        className="transition-transform duration-150 pointer-events-none"
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <circle
          cx="20"
          cy="20"
          r="19"
          fill={selected ? '#0051ff' : '#2f2f2f'}
          stroke={selected ? '#0051ff' : '#3b3b3b'}
          strokeWidth="0.9"
        />
        <line
          x1="7.2"
          y1="7.2"
          x2="15.2"
          y2="15.2"
          stroke={selected ? '#ffffff' : '#151515'}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <line
          x1="32.8"
          y1="7.2"
          x2="24.8"
          y2="15.2"
          stroke={selected ? '#ffffff' : '#151515'}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <line
          x1="7.2"
          y1="32.8"
          x2="15.2"
          y2="24.8"
          stroke={selected ? '#ffffff' : '#151515'}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <line
          x1="32.8"
          y1="32.8"
          x2="24.8"
          y2="24.8"
          stroke={selected ? '#ffffff' : '#151515'}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/* ========================================================================== */
/* REAL VECTOR ICON RENDERER FOR SELECT ICON DRAWER & SAVED CUSTOM TILES      */
/* ========================================================================== */

function CustomPickerIcon({ id, size = 14 }: { id: string; size?: number }) {
  if (id.startsWith('num-')) {
    const digit = id.replace('num-', '');
    return (
      <span
        style={{ fontSize: `${Math.max(10, Math.round(size * 0.85))}px` }}
        className="font-semibold leading-none tracking-tight select-none"
      >
        {digit}
      </span>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {id === 'copy-plus' && (
        <>
          <rect x="5" y="5" width="8.5" height="8.5" rx="1.6" fill="currentColor" stroke="none" />
          <path d="M3 10.5V3.8C3 3.1 3.5 2.5 4.2 2.5H10.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9.25 7.2V11.3M7.2 9.25H11.3" stroke="#ffffff" strokeWidth="1.3" />
        </>
      )}
      {id === 'layers-plus' && (
        <>
          <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="1.6" fill="currentColor" stroke="none" />
          <path d="M13 5.5V12.2C13 12.9 12.5 13.5 11.8 13.5H5.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6.75 4.7V8.8M4.7 6.75H8.8" stroke="#ffffff" strokeWidth="1.3" />
        </>
      )}
      {id === 'plus-square' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <path d="M8 5.2V10.8M5.2 8H10.8" stroke="#ffffff" strokeWidth="1.4" />
        </>
      )}
      {id === 'stop-square' && (
        <rect x="2.5" y="2.5" width="11" height="11" rx="2.2" fill="currentColor" stroke="none" />
      )}
      {id === 'rows-two' && (
        <>
          <rect x="2.5" y="3" width="11" height="4.2" rx="1.4" fill="currentColor" stroke="none" />
          <rect x="2.5" y="8.8" width="11" height="4.2" rx="1.4" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'type-square' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <path d="M5.5 5.5H10.5M8 5.5V11" stroke="#ffffff" strokeWidth="1.4" />
        </>
      )}
      {id === 'diamonds' && (
        <>
          <polygon points="8,1.8 10.3,4.1 8,6.4 5.7,4.1" fill="currentColor" stroke="none" />
          <polygon points="8,9.6 10.3,11.9 8,14.2 5.7,11.9" fill="currentColor" stroke="none" />
          <polygon points="4.1,5.7 6.4,8 4.1,10.3 1.8,8" fill="currentColor" stroke="none" />
          <polygon points="11.9,5.7 14.2,8 11.9,10.3 9.6,8" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'circle-fill' && (
        <circle cx="8" cy="8" r="5.5" fill="currentColor" stroke="none" />
      )}
      {id === 'square-fill' && (
        <rect x="3" y="3" width="10" height="10" rx="1.2" fill="currentColor" stroke="none" />
      )}
      {id === 'globe' && (
        <>
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
          <ellipse cx="8" cy="8" rx="2.5" ry="5.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2.8 8H13.2" stroke="currentColor" strokeWidth="1.2" />
        </>
      )}
      {id === 'sparkles' && (
        <>
          <path
            d="M7.5 2L8.8 6.2L13 7.5L8.8 8.8L7.5 13L6.2 8.8L2 7.5L6.2 6.2L7.5 2Z"
            fill="currentColor"
            stroke="none"
          />
          <circle cx="12.5" cy="3.5" r="1" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'play-square' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <polygon points="6.5,5.5 10.8,8 6.5,10.5" fill="#ffffff" stroke="none" />
        </>
      )}
      {id === 'image' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <circle cx="5.6" cy="5.8" r="1" fill="#ffffff" stroke="none" />
          <path d="M3.5 11.5L6.8 8.2L9.2 10.5L10.8 9L12.5 11.5" stroke="#ffffff" strokeWidth="1.2" />
        </>
      )}
      {id === 'refresh' && (
        <>
          <path d="M12.5 6A5 5 0 1 0 13 9.5" stroke="currentColor" strokeWidth="1.5" />
          <polyline points="13,3 13,6.2 9.8,6.2" stroke="currentColor" strokeWidth="1.5" />
        </>
      )}
      {id === 'arrow-left' && (
        <path d="M13 8H3M3 8L7 4M3 8L7 12" stroke="currentColor" strokeWidth="1.6" />
      )}
      {id === 'arrow-right' && (
        <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.6" />
      )}
      {id === 'grid-four' && (
        <>
          <rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" />
          <rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" />
          <rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" />
          <rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'lock' && (
        <>
          <rect x="3.2" y="7" width="9.6" height="6.8" rx="1.8" fill="currentColor" stroke="none" />
          <path d="M5.2 7V5.2A2.8 2.8 0 0 1 10.8 5.2V7" stroke="currentColor" strokeWidth="1.5" />
        </>
      )}
      {id === 'chat-bubble' && (
        <path
          d="M8 2.5C4.7 2.5 2 4.8 2 7.7C2 9.3 2.8 10.7 4.1 11.6L3.2 13.8L6 12.6C6.6 12.8 7.3 12.9 8 12.9C11.3 12.9 14 10.6 14 7.7C14 4.8 11.3 2.5 8 2.5Z"
          fill="currentColor"
          stroke="none"
        />
      )}
      {id === 'clock' && (
        <>
          <circle cx="8" cy="8" r="5.8" fill="currentColor" stroke="none" />
          <path d="M8 4.8V8.2L10.4 9.6" stroke="#ffffff" strokeWidth="1.4" />
        </>
      )}
      {id === 'pause-circle' && (
        <>
          <rect x="3.5" y="3" width="3.4" height="10" rx="1.2" fill="currentColor" stroke="none" />
          <rect x="9.1" y="3" width="3.4" height="10" rx="1.2" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'zap' && (
        <polygon
          points="9,1.8 3.5,9 7.8,9 7,14.2 12.5,7 8.2,7"
          fill="currentColor"
          stroke="none"
        />
      )}
      {id === 'maximize' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <path d="M6 10L10 6M10 6H7M10 6V9" stroke="#ffffff" strokeWidth="1.3" />
        </>
      )}
      {id === 'apps-plus' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2.2" fill="currentColor" stroke="none" />
          <circle cx="5.7" cy="5.7" r="1.1" fill="#ffffff" stroke="none" />
          <circle cx="10.3" cy="5.7" r="1.1" fill="#ffffff" stroke="none" />
          <circle cx="5.7" cy="10.3" r="1.1" fill="#ffffff" stroke="none" />
          <path d="M10.3 8.8V11.8M8.8 10.3H11.8" stroke="#ffffff" strokeWidth="1.2" />
        </>
      )}
      {id === 'hexagon-nut' && (
        <>
          <polygon
            points="8,2 13.2,5 13.2,11 8,14 2.8,11 2.8,5"
            fill="currentColor"
            stroke="none"
          />
          <circle cx="8" cy="8" r="2.2" fill="#ffffff" stroke="none" />
        </>
      )}
      {id === 'minimize' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <path d="M5.5 7.5V5.5H7.5M10.5 8.5V10.5H8.5" stroke="#ffffff" strokeWidth="1.3" />
        </>
      )}
      {id === 'moon' && (
        <path
          d="M12.5 9.8A5.2 5.2 0 0 1 6.2 3.5A5.2 5.2 0 1 0 12.5 9.8Z"
          fill="currentColor"
          stroke="none"
        />
      )}
      {id === 'framer-bolt' && (
        <path
          d="M4 2.5H12V6.5H8L4 2.5ZM4 6.5H8L12 10.5H4V6.5ZM4 10.5H8V14L4 10.5Z"
          fill="currentColor"
          stroke="none"
        />
      )}
      {id === 'database' && (
        <>
          <ellipse cx="8" cy="4.2" rx="4.8" ry="1.8" fill="currentColor" stroke="none" />
          <path
            d="M3.2 6.8C3.2 7.8 5.3 8.6 8 8.6C10.7 8.6 12.8 7.8 12.8 6.8V9.2C12.8 10.2 10.7 11 8 11C5.3 11 3.2 10.2 3.2 9.2V6.8Z"
            fill="currentColor"
            stroke="none"
          />
          <path
            d="M3.2 10.8C3.2 11.8 5.3 12.6 8 12.6C10.7 12.6 12.8 11.8 12.8 10.8V12.6C12.8 13.6 10.7 14.4 8 14.4C5.3 14.4 3.2 13.6 3.2 12.6V10.8Z"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}
      {id === 'play-triangle' && (
        <polygon points="4.5,3 12.8,8 4.5,13" fill="currentColor" stroke="none" />
      )}
      {id === 'terminal' && (
        <>
          <rect x="2" y="2.5" width="12" height="11" rx="2" fill="currentColor" stroke="none" />
          <path d="M4.8 6L7.2 8L4.8 10M8.2 10H11" stroke="#ffffff" strokeWidth="1.3" />
        </>
      )}
      {id === 'volume' && (
        <>
          <polygon points="3,6.2 6,6.2 9.2,3.5 9.2,12.5 6,9.8 3,9.8" fill="currentColor" stroke="none" />
          <path d="M11.2 5.8C12 6.5 12 9.5 11.2 10.2" stroke="currentColor" strokeWidth="1.4" />
        </>
      )}
    </svg>
  );
}

