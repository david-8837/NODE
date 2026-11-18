import type { CustomItemsByTab, LayerKeymap, ProfileData } from './presetLibrary';

export interface CommunityProfile {
  id: string;
  name: string;
  author: string;
  description: string;
  category: 'Development' | 'Creative' | 'Streaming' | 'Productivity';
  tags: string[];
  color: string;
  downloads: number;
  profile: ProfileData;
  customItems?: CustomItemsByTab;
}

const DEV_LAYER_1: LayerKeymap = {
  'dial-tl': {
    label: 'Tab Nav',
    actionType: 'Basic input',
    binding: 'Ctrl+Tab',
    encoderActions: {
      cw: { label: 'Next Tab', binding: 'Ctrl+Tab' },
      ccw: { label: 'Prev Tab', binding: 'Ctrl+Shift+Tab' },
      press: { label: 'Close Tab', binding: 'Ctrl+W' },
    },
  },
  r1c1: { label: 'Git Commit', actionType: 'Smart Action', binding: 'git commit -m "update"', color: '#2563eb' },
  r1c2: { label: 'Git Push', actionType: 'Smart Action', binding: 'git push origin main', color: '#1d4ed8' },
  r1c3: { label: 'Git Pull', actionType: 'Smart Action', binding: 'git pull', color: '#1e40af' },
  r2c1: { label: 'Format Code', actionType: 'Shortcut', binding: 'Shift+Alt+F' },
  r2c2: { label: 'Quick Open', actionType: 'Shortcut', binding: 'Ctrl+P' },
  r2c3: { label: 'Command Pal', actionType: 'Shortcut', binding: 'Ctrl+Shift+P' },
  r3c1: { label: 'Toggle Term', actionType: 'Shortcut', binding: 'Ctrl+`' },
  r3c2: { label: 'Multi Cursor', actionType: 'Shortcut', binding: 'Ctrl+Alt+Down' },
  r3c3: { label: 'Find in Files', actionType: 'Shortcut', binding: 'Ctrl+Shift+F' },
};

const DEV_LAYER_2: LayerKeymap = {
  'dial-tl': {
    label: 'Zoom Code',
    actionType: 'Basic input',
    binding: 'Ctrl+=',
    encoderActions: {
      cw: { label: 'Zoom In', binding: 'Ctrl+=' },
      ccw: { label: 'Zoom Out', binding: 'Ctrl+-' },
      press: { label: 'Reset Zoom', binding: 'Ctrl+0' },
    },
  },
  r1c1: { label: 'npm test', actionType: 'Smart Action', binding: 'npm test', color: '#059669' },
  r1c2: { label: 'npm run build', actionType: 'Smart Action', binding: 'npm run build', color: '#047857' },
  r1c3: { label: 'npm start', actionType: 'Smart Action', binding: 'npm start', color: '#065f46' },
  r2c1: { label: 'Docker PS', actionType: 'Smart Action', binding: 'docker ps', color: '#0284c7' },
  r2c2: { label: 'Docker Up', actionType: 'Smart Action', binding: 'docker compose up -d', color: '#0369a1' },
  r2c3: { label: 'Docker Down', actionType: 'Smart Action', binding: 'docker compose down', color: '#075985' },
  r3c1: { label: 'Debug Start', actionType: 'Shortcut', binding: 'F5' },
  r3c2: { label: 'Step Over', actionType: 'Shortcut', binding: 'F10' },
  r3c3: { label: 'Step Into', actionType: 'Shortcut', binding: 'F11' },
};

const STREAM_LAYER_1: LayerKeymap = {
  'dial-tl': {
    label: 'Master Vol',
    actionType: 'Basic input',
    binding: 'Volume Up',
    encoderActions: {
      cw: { label: 'Vol Up', binding: 'Volume Up' },
      ccw: { label: 'Vol Down', binding: 'Volume Down' },
      press: { label: 'Mute', binding: 'Volume Mute' },
    },
  },
  r1c1: { label: 'Scene: Live', actionType: 'Shortcut', binding: 'Ctrl+F1', color: '#dc2626' },
  r1c2: { label: 'Scene: Game', actionType: 'Shortcut', binding: 'Ctrl+F2', color: '#b91c1c' },
  r1c3: { label: 'Scene: BRB', actionType: 'Shortcut', binding: 'Ctrl+F3', color: '#991b1b' },
  r2c1: { label: 'Mic Toggle', actionType: 'Shortcut', binding: 'Ctrl+Alt+M' },
  r2c2: { label: 'Deafen Discord', actionType: 'Shortcut', binding: 'Ctrl+Shift+D' },
  r2c3: { label: 'Start Stream', actionType: 'Shortcut', binding: 'Ctrl+Shift+F12' },
  r3c1: { label: 'Clip Last 30s', actionType: 'Shortcut', binding: 'Ctrl+F9', color: '#f59e0b' },
  r3c2: { label: 'Screenshot', actionType: 'Shortcut', binding: 'PrintScreen' },
  r3c3: { label: 'Mute Desktop', actionType: 'Shortcut', binding: 'Ctrl+Alt+O' },
};

const CREATIVE_LAYER_1: LayerKeymap = {
  'dial-tl': {
    label: 'Brush Size',
    actionType: 'Basic input',
    binding: ']',
    encoderActions: {
      cw: { label: 'Larger Brush', binding: ']' },
      ccw: { label: 'Smaller Brush', binding: '[' },
      press: { label: 'Reset Tool', binding: 'D' },
    },
  },
  r1c1: { label: 'Brush Tool', actionType: 'Basic input', binding: 'B' },
  r1c2: { label: 'Eraser Tool', actionType: 'Basic input', binding: 'E' },
  r1c3: { label: 'Eyedropper', actionType: 'Basic input', binding: 'I' },
  r2c1: { label: 'Select All', actionType: 'Basic input', binding: 'Ctrl+A' },
  r2c2: { label: 'Deselect', actionType: 'Basic input', binding: 'Ctrl+D' },
  r2c3: { label: 'New Layer', actionType: 'Basic input', binding: 'Ctrl+Shift+N' },
  r3c1: { label: 'Undo', actionType: 'Basic input', binding: 'Ctrl+Z' },
  r3c2: { label: 'Redo', actionType: 'Basic input', binding: 'Ctrl+Shift+Z' },
  r3c3: { label: 'Export PNG', actionType: 'Basic input', binding: 'Ctrl+Alt+Shift+S' },
};

const BLENDER_LAYER_1: LayerKeymap = {
  'dial-tl': {
    label: 'Timeline Scrub',
    actionType: 'Basic input',
    binding: 'Right Arrow',
    encoderActions: {
      cw: { label: 'Frame +1', binding: 'Right Arrow' },
      ccw: { label: 'Frame -1', binding: 'Left Arrow' },
      press: { label: 'Play/Pause', binding: 'Space' },
    },
  },
  r1c1: { label: 'Front View', actionType: 'Basic input', binding: 'Numpad 1' },
  r1c2: { label: 'Right View', actionType: 'Basic input', binding: 'Numpad 3' },
  r1c3: { label: 'Top View', actionType: 'Basic input', binding: 'Numpad 7' },
  r2c1: { label: 'Extrude', actionType: 'Basic input', binding: 'E' },
  r2c2: { label: 'Inset', actionType: 'Basic input', binding: 'I' },
  r2c3: { label: 'Bevel', actionType: 'Basic input', binding: 'Ctrl+B' },
  r3c1: { label: 'Render Image', actionType: 'Basic input', binding: 'F12' },
  r3c2: { label: 'Wireframe View', actionType: 'Basic input', binding: 'Z' },
  r3c3: { label: 'Focus Object', actionType: 'Basic input', binding: 'Numpad .' },
};

const OFFICE_LAYER_1: LayerKeymap = {
  'dial-tl': {
    label: 'Scroll / Zoom',
    actionType: 'Basic input',
    binding: 'Ctrl+=',
    encoderActions: {
      cw: { label: 'Zoom In', binding: 'Ctrl+=' },
      ccw: { label: 'Zoom Out', binding: 'Ctrl+-' },
      press: { label: 'Zoom 100%', binding: 'Ctrl+0' },
    },
  },
  r1c1: { label: 'Slack Status', actionType: 'Smart Action', binding: 'Ctrl+Shift+Y', color: '#611f69' },
  r1c2: { label: 'Notion Search', actionType: 'Shortcut', binding: 'Ctrl+P' },
  r1c3: { label: 'New Event', actionType: 'Shortcut', binding: 'Alt+Shift+C' },
  r2c1: { label: 'Auto Sum', actionType: 'Shortcut', binding: 'Alt+=' },
  r2c2: { label: 'Freeze Panes', actionType: 'Shortcut', binding: 'Alt+W,F,F' },
  r2c3: { label: 'Filter Table', actionType: 'Shortcut', binding: 'Ctrl+Shift+L' },
  r3c1: { label: 'Snap Left', actionType: 'Shortcut', binding: 'Win+Left Arrow' },
  r3c2: { label: 'Snap Right', actionType: 'Shortcut', binding: 'Win+Right Arrow' },
  r3c3: { label: 'Lock PC', actionType: 'Shortcut', binding: 'Win+L' },
};

export const COMMUNITY_PROFILES: CommunityProfile[] = [
  {
    id: 'community-fullstack-dev',
    name: 'Full-Stack Developer Suite',
    author: 'alex_codes',
    description: 'Optimized 2-layer developer layout with Git macros, Docker commands, terminal toggles, and code navigation dial.',
    category: 'Development',
    tags: ['VS Code', 'Git', 'Docker', 'npm'],
    color: '#0051ff',
    downloads: 1420,
    profile: {
      id: 'profile-comm-dev',
      name: 'Full-Stack Dev',
      color: '#0051ff',
      layers: [DEV_LAYER_1, DEV_LAYER_2],
    },
  },
  {
    id: 'community-streamer-obs',
    name: 'Twitch & OBS Broadcast Command',
    author: 'sarah_live',
    description: 'Instant scene switches, push-to-clip, Discord deafen, and master volume control knob for live streaming.',
    category: 'Streaming',
    tags: ['OBS Studio', 'Discord', 'Audio Mixer', 'Twitch'],
    color: '#dc2626',
    downloads: 985,
    profile: {
      id: 'profile-comm-stream',
      name: 'Streaming Pro',
      color: '#dc2626',
      layers: [STREAM_LAYER_1],
    },
  },
  {
    id: 'community-photo-retouch',
    name: 'Photoshop & Retouch Studio',
    author: 'elena_creatives',
    description: 'Precision brush sizing and hardness dial, selection toggles, quick export, and layered retouching hotkeys.',
    category: 'Creative',
    tags: ['Photoshop', 'Lightroom', 'Design', 'Brush Dial'],
    color: '#f59e0b',
    downloads: 1120,
    profile: {
      id: 'profile-comm-photo',
      name: 'Photo Retouch',
      color: '#f59e0b',
      layers: [CREATIVE_LAYER_1],
    },
  },
  {
    id: 'community-blender-3d',
    name: 'Blender 3D & Animation Workspace',
    author: 'marcus_vfx',
    description: 'Smooth timeline scrubbing on the rotary dial, quick viewport switches, extrude, bevel, and one-key rendering.',
    category: 'Creative',
    tags: ['Blender', '3D Modeling', 'VFX', 'Animation'],
    color: '#ea580c',
    downloads: 790,
    profile: {
      id: 'profile-comm-blender',
      name: 'Blender 3D',
      color: '#ea580c',
      layers: [BLENDER_LAYER_1],
    },
  },
  {
    id: 'community-office-productivity',
    name: 'Executive Office & Data Hub',
    author: 'david_ops',
    description: 'Excel calculation macros, window splitting, Notion quick capture, and Slack status shortcuts for office workflows.',
    category: 'Productivity',
    tags: ['Excel', 'Notion', 'Slack', 'Multitasking'],
    color: '#10b981',
    downloads: 640,
    profile: {
      id: 'profile-comm-office',
      name: 'Executive Hub',
      color: '#10b981',
      layers: [OFFICE_LAYER_1],
    },
  },
];
