export interface PresetCatalogAction {
  name: string;
  keys: string;
  description: string;
  iconId?: string;
  multi?: { onTap: string; doubleTap: string };
}

export interface PresetCatalogEntry {
  id: string;
  title: string;
  description: string;
  author: string;
  hasPreview: boolean;
  color: string;
  keys: readonly PresetCatalogAction[];
  dial: { cw: PresetCatalogAction; press: PresetCatalogAction; ccw: PresetCatalogAction };
}

// Shared source data for the 27 preset cards and their installed key bindings.
export const PRESET_CATALOG: readonly PresetCatalogEntry[] = [
  {
    "id": "vscode",
    "title": "VS Code",
    "description": "Code with speed: command palette, quick open, terminal, file explorer and tab navigation on the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#007acc",
    "keys": [
      {
        "name": "Palette",
        "keys": "Ctrl+Shift+P",
        "description": "Opens VS Code command palette.",
        "iconId": "command"
      },
      {
        "name": "Quick Open",
        "keys": "Ctrl+P",
        "description": "Quickly opens any file.",
        "iconId": "file-search"
      },
      {
        "name": "Terminal",
        "keys": "Ctrl+Tilde",
        "description": "Toggles integrated terminal.",
        "iconId": "terminal-2"
      },
      {
        "name": "Explorer",
        "keys": "Ctrl+Shift+E",
        "description": "Focuses side file explorer.",
        "iconId": "folders"
      },
      {
        "name": "Search Files",
        "keys": "Ctrl+Shift+F",
        "description": "Searches across workspace files.",
        "iconId": "search"
      },
      {
        "name": "Format Code",
        "keys": "Shift+Alt+F",
        "description": "Auto-formats current document.",
        "iconId": "wand"
      },
      {
        "name": "Comment",
        "keys": "Ctrl+/",
        "description": "Toggles line comment.",
        "iconId": "code"
      },
      {
        "name": "Split Editor",
        "keys": "Ctrl+Backslash",
        "description": "Splits active editor window.",
        "iconId": "layout-columns"
      },
      {
        "name": "Run Code",
        "keys": "F5",
        "description": "Starts debugging or run.",
        "iconId": "bug"
      }
    ],
    "dial": {
      "cw": {
        "name": "Next Tab",
        "keys": "Ctrl+Page Down",
        "description": "Switches to next editor tab.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Close Tab",
        "keys": "Ctrl+W",
        "description": "Closes active editor tab.",
        "iconId": "trash"
      },
      "ccw": {
        "name": "Prev Tab",
        "keys": "Ctrl+Page Up",
        "description": "Switches to previous editor tab.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "github",
    "title": "GitHub & Git Dev",
    "description": "Git workflow accelerator: commit, push, pull, diff, branch, pull request, and stash controls.",
    "author": "Node",
    "hasPreview": true,
    "color": "#6e40c9",
    "keys": [
      {
        "name": "Commit",
        "keys": "Ctrl+Enter",
        "description": "Stages and commits staged changes.",
        "iconId": "git-commit"
      },
      {
        "name": "Push",
        "keys": "Ctrl+Shift+U",
        "description": "Pushes commits to remote origin.",
        "iconId": "arrow-up"
      },
      {
        "name": "Pull",
        "keys": "Ctrl+Shift+P",
        "description": "Pulls latest remote changes.",
        "iconId": "arrow-down"
      },
      {
        "name": "Git Diff",
        "keys": "Ctrl+Shift+D",
        "description": "Shows git changes difference.",
        "iconId": "git-compare"
      },
      {
        "name": "New Branch",
        "keys": "Ctrl+Shift+B",
        "description": "Creates new Git branch.",
        "iconId": "git-branch"
      },
      {
        "name": "Pull Request",
        "keys": "Ctrl+Shift+M",
        "description": "Opens new Pull Request.",
        "iconId": "git-pull-request"
      },
      {
        "name": "Git Stash",
        "keys": "Ctrl+Shift+S",
        "description": "Stashes working directory.",
        "iconId": "archive"
      },
      {
        "name": "Git History",
        "keys": "Ctrl+Shift+H",
        "description": "Views commit log history.",
        "iconId": "history"
      },
      {
        "name": "Checkout",
        "keys": "Ctrl+Shift+O",
        "description": "Checks out target branch.",
        "iconId": "check"
      }
    ],
    "dial": {
      "cw": {
        "name": "Next Commit",
        "keys": "Down",
        "description": "Navigates to newer commit.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Git Refresh",
        "keys": "Ctrl+R",
        "description": "Refreshes git repository status.",
        "iconId": "refresh"
      },
      "ccw": {
        "name": "Prev Commit",
        "keys": "Up",
        "description": "Navigates to older commit.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "terminal",
    "title": "Terminal & CLI",
    "description": "Command line power tools: clear, SIGINT Ctrl+C, background Ctrl+Z, piping, sudo, and grep search.",
    "author": "Node",
    "hasPreview": true,
    "color": "#22c55e",
    "keys": [
      {
        "name": "Clear",
        "keys": "Ctrl+L",
        "description": "Clears terminal screen buffer.",
        "iconId": "brush"
      },
      {
        "name": "Interrupt",
        "keys": "Ctrl+C",
        "description": "Sends SIGINT interrupt to process.",
        "iconId": "player-stop"
      },
      {
        "name": "Background",
        "keys": "Ctrl+Z",
        "description": "Suspends process to background.",
        "iconId": "minimize"
      },
      {
        "name": "Pipe",
        "keys": "|",
        "description": "Inserts Unix shell pipe operator.",
        "iconId": "arrows-split"
      },
      {
        "name": "Sudo",
        "keys": "sudo ",
        "description": "Prepends root admin privileges.",
        "iconId": "shield-lock"
      },
      {
        "name": "History",
        "keys": "Ctrl+R",
        "description": "Reverse search through command history.",
        "iconId": "history"
      },
      {
        "name": "Grep Search",
        "keys": "Ctrl+Shift+F",
        "description": "Fast grep across terminal buffer.",
        "iconId": "search"
      },
      {
        "name": "SSH Session",
        "keys": "Ctrl+Shift+T",
        "description": "Opens remote SSH session window.",
        "iconId": "server"
      },
      {
        "name": "Exit Shell",
        "keys": "Ctrl+D",
        "description": "Closes shell session gracefully.",
        "iconId": "logout"
      }
    ],
    "dial": {
      "cw": {
        "name": "Next Command",
        "keys": "Down",
        "description": "Scrolls forward through bash history.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Execute",
        "keys": "Enter",
        "description": "Executes active shell command.",
        "iconId": "check"
      },
      "ccw": {
        "name": "Prev Command",
        "keys": "Up",
        "description": "Recalls previous bash command.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "docker",
    "title": "Docker DevOps",
    "description": "Container management: compose up, compose down, container logs, live build, and system prune.",
    "author": "Node",
    "hasPreview": true,
    "color": "#2496ed",
    "keys": [
      {
        "name": "Container PS",
        "keys": "docker ps",
        "description": "Lists running active containers.",
        "iconId": "list"
      },
      {
        "name": "Compose Up",
        "keys": "docker compose up -d",
        "description": "Starts stack in background mode.",
        "iconId": "player-play"
      },
      {
        "name": "Compose Down",
        "keys": "docker compose down",
        "description": "Stops and removes stack network.",
        "iconId": "player-stop"
      },
      {
        "name": "Stream Logs",
        "keys": "docker logs -f",
        "description": "Follows container output logs.",
        "iconId": "file-text"
      },
      {
        "name": "Docker Build",
        "keys": "docker build -t app .",
        "description": "Builds image from Dockerfile.",
        "iconId": "tool"
      },
      {
        "name": "Exec Shell",
        "keys": "docker exec -it",
        "description": "Opens bash terminal inside container.",
        "iconId": "terminal-2"
      },
      {
        "name": "Stop All",
        "keys": "docker stop $(docker ps -q)",
        "description": "Gracefully stops all running containers.",
        "iconId": "power"
      },
      {
        "name": "System Prune",
        "keys": "docker system prune -f",
        "description": "Reclaims unused disk memory.",
        "iconId": "trash"
      },
      {
        "name": "Restart Stack",
        "keys": "docker compose restart",
        "description": "Restarts container stack service.",
        "iconId": "refresh"
      }
    ],
    "dial": {
      "cw": {
        "name": "Scroll Logs Dn",
        "keys": "Page Down",
        "description": "Scrolls down container output.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Inspect",
        "keys": "Enter",
        "description": "Inspects highlighted container.",
        "iconId": "search"
      },
      "ccw": {
        "name": "Scroll Logs Up",
        "keys": "Page Up",
        "description": "Scrolls up container output.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "chrome_devtools",
    "title": "Chrome DevTools",
    "description": "Web developer tools: inspect element, console, network tab, device toolbar, and hard cache reload.",
    "author": "Node",
    "hasPreview": true,
    "color": "#4285f4",
    "keys": [
      {
        "name": "Inspect",
        "keys": "Ctrl+Shift+C",
        "description": "Activates element inspector picker.",
        "iconId": "pointer"
      },
      {
        "name": "Console",
        "keys": "Ctrl+Shift+J",
        "description": "Jumps straight to DevTools console.",
        "iconId": "terminal-2"
      },
      {
        "name": "Network Tab",
        "keys": "Ctrl+Shift+E",
        "description": "Inspects network waterfall requests.",
        "iconId": "network"
      },
      {
        "name": "Responsive",
        "keys": "Ctrl+Shift+M",
        "description": "Toggles mobile device emulation.",
        "iconId": "devices"
      },
      {
        "name": "Hard Reload",
        "keys": "Ctrl+Shift+R",
        "description": "Bypasses cache and hard reloads page.",
        "iconId": "refresh"
      },
      {
        "name": "Clear Cache",
        "keys": "Ctrl+Shift+Delete",
        "description": "Opens browser clear cache dialogue.",
        "iconId": "trash"
      },
      {
        "name": "Sources Debug",
        "keys": "Ctrl+P",
        "description": "Opens script source debugger.",
        "iconId": "code"
      },
      {
        "name": "Performance",
        "keys": "Ctrl+Shift+F",
        "description": "Records performance profile timeline.",
        "iconId": "gauge"
      },
      {
        "name": "Tablet View",
        "keys": "Ctrl+Alt+M",
        "description": "Switches device to tablet preset.",
        "iconId": "device-tablet"
      }
    ],
    "dial": {
      "cw": {
        "name": "Next Panel",
        "keys": "Ctrl+]",
        "description": "Switches to next DevTools tab.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Reload",
        "keys": "Ctrl+R",
        "description": "Refreshes active browser page.",
        "iconId": "refresh"
      },
      "ccw": {
        "name": "Prev Panel",
        "keys": "Ctrl+[",
        "description": "Switches to previous DevTools tab.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "photoshop",
    "title": "Photoshop",
    "description": "Retouch and paint: core tools, layers, transform, and brush size on the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#31a8ff",
    "keys": [
      {
        "name": "Move",
        "keys": "V",
        "description": "Moves layers and selections.",
        "iconId": "pointer"
      },
      {
        "name": "Brush",
        "keys": "B",
        "description": "Paints soft or hard strokes.",
        "iconId": "brush"
      },
      {
        "name": "Eraser",
        "keys": "E",
        "description": "Erases parts of a layer.",
        "iconId": "trash"
      },
      {
        "name": "Lasso",
        "keys": "L",
        "description": "Draws a free-form selection.",
        "iconId": "crop"
      },
      {
        "name": "Eyedropper",
        "keys": "I",
        "description": "Picks a color from the image.",
        "iconId": "palette"
      },
      {
        "name": "Transform",
        "keys": "Mod+T",
        "description": "Scales, rotates or skews a layer.",
        "iconId": "maximize"
      },
      {
        "name": "Duplicate",
        "keys": "Mod+J",
        "description": "Duplicates the layer.",
        "iconId": "copy"
      },
      {
        "name": "Merge Down",
        "keys": "Mod+E",
        "description": "Merges into the layer below.",
        "iconId": "layers-intersect"
      },
      {
        "name": "Undo / Redo",
        "keys": "Mod+Z",
        "description": "Tap to undo, double tap to redo.",
        "multi": {
          "onTap": "Mod+Z",
          "doubleTap": "Mod+Shift+Z"
        },
        "iconId": "arrow-back-up"
      }
    ],
    "dial": {
      "cw": {
        "name": "Brush +",
        "keys": "]",
        "description": "Makes the brush bigger.",
        "iconId": "circle-dot"
      },
      "press": {
        "name": "Fit Screen",
        "keys": "Mod+0",
        "description": "Fits the image on screen.",
        "iconId": "maximize"
      },
      "ccw": {
        "name": "Brush -",
        "keys": "[",
        "description": "Makes the brush smaller.",
        "iconId": "circle-dot"
      }
    }
  },
  {
    "id": "illustrator",
    "title": "Illustrator",
    "description": "Vector essentials: selection, pen, shapes, grouping and zoom on the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#ff9a00",
    "keys": [
      {
        "name": "Select",
        "keys": "V",
        "description": "Selects and moves whole objects.",
        "iconId": "pointer"
      },
      {
        "name": "Direct Select",
        "keys": "A",
        "description": "Selects single points and paths.",
        "iconId": "pointer"
      },
      {
        "name": "Pen",
        "keys": "P",
        "description": "Draws precise paths.",
        "iconId": "vector-bezier"
      },
      {
        "name": "Type",
        "keys": "T",
        "description": "Adds editable text.",
        "iconId": "typography"
      },
      {
        "name": "Rectangle",
        "keys": "M",
        "description": "Draws rectangles.",
        "iconId": "shape"
      },
      {
        "name": "Eyedropper",
        "keys": "I",
        "description": "Copies colors and styles.",
        "iconId": "palette"
      },
      {
        "name": "Group",
        "keys": "Mod+G",
        "description": "Groups the selected objects.",
        "iconId": "box-multiple"
      },
      {
        "name": "Outline",
        "keys": "Mod+Y",
        "description": "Switches outline view on or off.",
        "iconId": "eye"
      },
      {
        "name": "Undo / Redo",
        "keys": "Mod+Z",
        "description": "Tap to undo, double tap to redo.",
        "multi": {
          "onTap": "Mod+Z",
          "doubleTap": "Mod+Shift+Z"
        },
        "iconId": "arrow-back-up"
      }
    ],
    "dial": {
      "cw": {
        "name": "Zoom In",
        "keys": "Mod+=",
        "description": "Zooms in on the artboard.",
        "iconId": "maximize"
      },
      "press": {
        "name": "Fit",
        "keys": "Mod+0",
        "description": "Fits the artboard on screen.",
        "iconId": "maximize"
      },
      "ccw": {
        "name": "Zoom Out",
        "keys": "Mod+-",
        "description": "Zooms out of the artboard.",
        "iconId": "minimize"
      }
    }
  },
  {
    "id": "premiere",
    "title": "Premiere Pro",
    "description": "Cut video fast: razor, marks, ripple delete and frame stepping on the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#9999ff",
    "keys": [
      {
        "name": "Select",
        "keys": "V",
        "description": "Switches to the selection tool.",
        "iconId": "pointer"
      },
      {
        "name": "Razor",
        "keys": "C",
        "description": "Cuts clips on the timeline.",
        "iconId": "scissors"
      },
      {
        "name": "Add Edit",
        "keys": "Mod+K",
        "description": "Cuts the clip at the playhead.",
        "iconId": "scissors"
      },
      {
        "name": "Ripple Del",
        "keys": "Shift+Del",
        "description": "Deletes and closes the gap.",
        "iconId": "trash"
      },
      {
        "name": "Mark In",
        "keys": "I",
        "description": "Sets the start of a selection.",
        "iconId": "bookmark"
      },
      {
        "name": "Mark Out",
        "keys": "O",
        "description": "Sets the end of a selection.",
        "iconId": "bookmark"
      },
      {
        "name": "Match Frame",
        "keys": "F",
        "description": "Finds the source clip in the bin.",
        "iconId": "search"
      },
      {
        "name": "Export",
        "keys": "Mod+M",
        "description": "Opens the export settings.",
        "iconId": "device-floppy"
      },
      {
        "name": "Play / Pause",
        "keys": "Space",
        "description": "Starts or stops playback.",
        "iconId": "player-play"
      }
    ],
    "dial": {
      "cw": {
        "name": "Step Fwd",
        "keys": "Right",
        "description": "Steps one frame forward.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Play",
        "keys": "Space",
        "description": "Plays or pauses playback.",
        "iconId": "player-play"
      },
      "ccw": {
        "name": "Step Back",
        "keys": "Left",
        "description": "Steps one frame backward.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "aftereffects",
    "title": "After Effects",
    "description": "Motion graphics powerhouse: keyframes, RAM preview, easy ease, pre-compose, and graph editor.",
    "author": "Node",
    "hasPreview": true,
    "color": "#d291ff",
    "keys": [
      {
        "name": "Keyframe",
        "keys": "Alt+Shift+P",
        "description": "Adds position keyframe at playhead.",
        "iconId": "diamond"
      },
      {
        "name": "RAM Preview",
        "keys": "Space",
        "description": "Pre-renders and plays preview.",
        "iconId": "player-play"
      },
      {
        "name": "Easy Ease",
        "keys": "F9",
        "description": "Smoothes keyframe bezier interpolation.",
        "iconId": "vector-bezier"
      },
      {
        "name": "Trim In/Out",
        "keys": "Alt+[",
        "description": "Trims layer start point to current time.",
        "iconId": "arrows-left-right"
      },
      {
        "name": "Split Layer",
        "keys": "Ctrl+Shift+D",
        "description": "Splits selected layer into two.",
        "iconId": "scissors"
      },
      {
        "name": "Graph Editor",
        "keys": "Shift+F3",
        "description": "Toggles velocity speed graph curve.",
        "iconId": "chart-line"
      },
      {
        "name": "Render Queue",
        "keys": "Ctrl+M",
        "description": "Sends composition to render queue.",
        "iconId": "movie"
      },
      {
        "name": "Pre-compose",
        "keys": "Ctrl+Shift+C",
        "description": "Nests layers into pre-composition.",
        "iconId": "box"
      },
      {
        "name": "Null Object",
        "keys": "Ctrl+Alt+Shift+Y",
        "description": "Spawns new parent tracking Null.",
        "iconId": "crosshair"
      }
    ],
    "dial": {
      "cw": {
        "name": "Next Keyframe",
        "keys": "K",
        "description": "Jumps forward to next keyframe.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Play / Stop",
        "keys": "Space",
        "description": "Toggles timeline playback.",
        "iconId": "player-play"
      },
      "ccw": {
        "name": "Prev Keyframe",
        "keys": "J",
        "description": "Jumps backward to previous keyframe.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "davinci",
    "title": "DaVinci Resolve",
    "description": "Edit and color: blade, ripples, transition, color wheels, and frame jog on the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#29b6f6",
    "keys": [
      {
        "name": "Blade",
        "keys": "B",
        "description": "Selects the blade cut tool.",
        "iconId": "scissors"
      },
      {
        "name": "Ripple Cut",
        "keys": "Mod+Shift+X",
        "description": "Cuts clip and ripples timeline.",
        "iconId": "scissors"
      },
      {
        "name": "Transition",
        "keys": "Mod+T",
        "description": "Applies standard cross dissolve.",
        "iconId": "sparkles"
      },
      {
        "name": "Color Page",
        "keys": "Shift+6",
        "description": "Switches directly to color wheels page.",
        "iconId": "palette"
      },
      {
        "name": "Inspector",
        "keys": "Mod+4",
        "description": "Opens clip video/audio inspector.",
        "iconId": "adjustments-horizontal"
      },
      {
        "name": "Timeline Zoom",
        "keys": "Shift+Z",
        "description": "Toggles full timeline overview zoom.",
        "iconId": "maximize"
      },
      {
        "name": "Marker",
        "keys": "M",
        "description": "Drops an edit marker point.",
        "iconId": "bookmark"
      },
      {
        "name": "Play / Stop",
        "keys": "Space",
        "description": "Toggles timeline playback.",
        "iconId": "player-play"
      },
      {
        "name": "Quick Export",
        "keys": "Alt+Shift+K",
        "description": "Opens fast rendering export.",
        "iconId": "device-floppy"
      }
    ],
    "dial": {
      "cw": {
        "name": "Jog Fwd",
        "keys": "Right",
        "description": "Steps playhead forward one frame.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Play",
        "keys": "Space",
        "description": "Plays or pauses playback.",
        "iconId": "player-play"
      },
      "ccw": {
        "name": "Jog Back",
        "keys": "Left",
        "description": "Steps playhead backward one frame.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "blender",
    "title": "Blender 3D",
    "description": "Model and sculpt: extrude, inset, bevel, loop cuts, F12 render, and viewport orbit on the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#f5792a",
    "keys": [
      {
        "name": "Extrude",
        "keys": "E",
        "description": "Extrudes faces or vertices.",
        "iconId": "maximize"
      },
      {
        "name": "Inset",
        "keys": "I",
        "description": "Insets boundary faces.",
        "iconId": "minimize"
      },
      {
        "name": "Bevel",
        "keys": "Mod+B",
        "description": "Bevels edges smoothly.",
        "iconId": "vector-bezier"
      },
      {
        "name": "Loop Cut",
        "keys": "Mod+R",
        "description": "Cuts edge loop ring.",
        "iconId": "scissors"
      },
      {
        "name": "Render",
        "keys": "F12",
        "description": "Renders active scene camera.",
        "iconId": "camera"
      },
      {
        "name": "Shade Smooth",
        "keys": "W",
        "description": "Toggles smooth geometry normals.",
        "iconId": "sparkles"
      },
      {
        "name": "X-Ray",
        "keys": "Alt+Z",
        "description": "Toggles transparent see-through view.",
        "iconId": "eye"
      },
      {
        "name": "Camera View",
        "keys": "Numpad 0",
        "description": "Snaps view directly to camera.",
        "iconId": "video"
      },
      {
        "name": "Solid / Wire",
        "keys": "Z",
        "description": "Opens viewport shading pie menu.",
        "iconId": "box"
      }
    ],
    "dial": {
      "cw": {
        "name": "Orbit Right",
        "keys": "Numpad 6",
        "description": "Orbits viewport turntable right.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "View Selected",
        "keys": "Numpad .",
        "description": "Centers view on active object.",
        "iconId": "crosshair"
      },
      "ccw": {
        "name": "Orbit Left",
        "keys": "Numpad 4",
        "description": "Orbits viewport turntable left.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "figma",
    "title": "Figma",
    "description": "Design tools at your fingertips: frames, shapes, auto layout, component creation, and zoom.",
    "author": "Node",
    "hasPreview": true,
    "color": "#f24e1e",
    "keys": [
      {
        "name": "Frame",
        "keys": "F",
        "description": "Draws a new frame.",
        "iconId": "layout-columns"
      },
      {
        "name": "Rectangle",
        "keys": "R",
        "description": "Draws a rectangle.",
        "iconId": "shape"
      },
      {
        "name": "Text",
        "keys": "T",
        "description": "Adds a text layer.",
        "iconId": "typography"
      },
      {
        "name": "Pen",
        "keys": "P",
        "description": "Draws precise vector paths.",
        "iconId": "vector-bezier"
      },
      {
        "name": "Auto Layout",
        "keys": "Shift+A",
        "description": "Adds auto layout to the selection.",
        "iconId": "layout-columns"
      },
      {
        "name": "Component",
        "keys": "Mod+Alt+K",
        "description": "Turns the selection into a component.",
        "iconId": "box-multiple"
      },
      {
        "name": "Comment",
        "keys": "C",
        "description": "Drops a comment on the canvas.",
        "iconId": "message"
      },
      {
        "name": "Duplicate",
        "keys": "Mod+D",
        "description": "Duplicates the selection.",
        "iconId": "copy"
      },
      {
        "name": "Actions",
        "keys": "Mod+/",
        "description": "Searches tools and commands.",
        "iconId": "command"
      }
    ],
    "dial": {
      "cw": {
        "name": "Zoom In",
        "keys": "Mod+=",
        "description": "Zooms in on the canvas.",
        "iconId": "maximize"
      },
      "press": {
        "name": "Zoom Fit",
        "keys": "Shift+1",
        "description": "Fits everything on screen.",
        "iconId": "maximize"
      },
      "ccw": {
        "name": "Zoom Out",
        "keys": "Mod+-",
        "description": "Zooms out of the canvas.",
        "iconId": "minimize"
      }
    }
  },
  {
    "id": "framer",
    "title": "Framer",
    "description": "Build pages quickly: frames, text, insert menu, live preview, and canvas zoom on the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#0055ff",
    "keys": [
      {
        "name": "Frame",
        "keys": "F",
        "description": "Draws a new frame.",
        "iconId": "layout-columns"
      },
      {
        "name": "Text",
        "keys": "T",
        "description": "Adds a text layer.",
        "iconId": "typography"
      },
      {
        "name": "Rectangle",
        "keys": "R",
        "description": "Draws a rectangle.",
        "iconId": "shape"
      },
      {
        "name": "Insert",
        "keys": "I",
        "description": "Opens the insert menu.",
        "iconId": "box-multiple"
      },
      {
        "name": "Preview",
        "keys": "Mod+P",
        "description": "Opens a live preview of your site.",
        "iconId": "eye"
      },
      {
        "name": "Quick Actions",
        "keys": "Mod+K",
        "description": "Searches every command.",
        "iconId": "command"
      },
      {
        "name": "Duplicate",
        "keys": "Mod+D",
        "description": "Duplicates the selection.",
        "iconId": "copy"
      },
      {
        "name": "Group",
        "keys": "Mod+G",
        "description": "Groups the selected layers.",
        "iconId": "box"
      },
      {
        "name": "Undo",
        "keys": "Mod+Z",
        "description": "Undoes your last change.",
        "iconId": "arrow-back-up"
      }
    ],
    "dial": {
      "cw": {
        "name": "Zoom In",
        "keys": "Mod+=",
        "description": "Zooms in on the canvas.",
        "iconId": "maximize"
      },
      "press": {
        "name": "Zoom Fit",
        "keys": "Shift+1",
        "description": "Fits everything on screen.",
        "iconId": "maximize"
      },
      "ccw": {
        "name": "Zoom Out",
        "keys": "Mod+-",
        "description": "Zooms out of the canvas.",
        "iconId": "minimize"
      }
    }
  },
  {
    "id": "canva",
    "title": "Canva Design",
    "description": "Rapid graphics: text, elements, uploads, grouping, alignment, locking, and export download.",
    "author": "Node",
    "hasPreview": true,
    "color": "#00c4cc",
    "keys": [
      {
        "name": "Add Text",
        "keys": "T",
        "description": "Adds text box to design canvas.",
        "iconId": "typography"
      },
      {
        "name": "Elements",
        "keys": "C",
        "description": "Opens stickers, shapes, graphics bin.",
        "iconId": "shape"
      },
      {
        "name": "Uploads",
        "keys": "Ctrl+U",
        "description": "Opens image and asset uploads.",
        "iconId": "cloud-upload"
      },
      {
        "name": "Duplicate",
        "keys": "Ctrl+D",
        "description": "Duplicates selected element.",
        "iconId": "copy"
      },
      {
        "name": "Group",
        "keys": "Ctrl+G",
        "description": "Groups elements together.",
        "iconId": "box-multiple"
      },
      {
        "name": "Lock Element",
        "keys": "Ctrl+Alt+L",
        "description": "Locks element against movement.",
        "iconId": "lock"
      },
      {
        "name": "Align Center",
        "keys": "Ctrl+Shift+C",
        "description": "Centers element on canvas.",
        "iconId": "layout-columns"
      },
      {
        "name": "Download",
        "keys": "Ctrl+Shift+S",
        "description": "Opens PNG/PDF download menu.",
        "iconId": "download"
      },
      {
        "name": "Fullscreen",
        "keys": "Ctrl+Alt+P",
        "description": "Presents design in full screen.",
        "iconId": "maximize"
      }
    ],
    "dial": {
      "cw": {
        "name": "Zoom In",
        "keys": "Ctrl+=",
        "description": "Zooms in on Canva canvas.",
        "iconId": "maximize"
      },
      "press": {
        "name": "Reset View",
        "keys": "Ctrl+0",
        "description": "Resets canvas zoom to 100%.",
        "iconId": "maximize"
      },
      "ccw": {
        "name": "Zoom Out",
        "keys": "Ctrl+-",
        "description": "Zooms out of Canva canvas.",
        "iconId": "minimize"
      }
    }
  },
  {
    "id": "audacity",
    "title": "Audacity Audio",
    "description": "Audio production: record, cut, noise removal, amplify, compress, normalize, and WAV export.",
    "author": "Node",
    "hasPreview": true,
    "color": "#2b5cff",
    "keys": [
      {
        "name": "Record",
        "keys": "R",
        "description": "Begins audio capture on active mic.",
        "iconId": "circle-dot"
      },
      {
        "name": "Stop / Play",
        "keys": "Space",
        "description": "Starts or stops timeline transport.",
        "iconId": "player-play"
      },
      {
        "name": "Cut Audio",
        "keys": "Ctrl+X",
        "description": "Cuts highlighted audio waveform.",
        "iconId": "scissors"
      },
      {
        "name": "Noise Filter",
        "keys": "Ctrl+Alt+N",
        "description": "Applies learned noise reduction.",
        "iconId": "waveform"
      },
      {
        "name": "Amplify Gain",
        "keys": "Ctrl+Alt+A",
        "description": "Boosts selected audio decibels.",
        "iconId": "volume"
      },
      {
        "name": "Compressor",
        "keys": "Ctrl+Alt+C",
        "description": "Evens dynamic volume range.",
        "iconId": "arrows-split"
      },
      {
        "name": "Split Clip",
        "keys": "Ctrl+I",
        "description": "Splits track at cursor playhead.",
        "iconId": "scissors"
      },
      {
        "name": "Normalize",
        "keys": "Ctrl+Alt+M",
        "description": "Normalizes peak volume to -1 dB.",
        "iconId": "adjustments-horizontal"
      },
      {
        "name": "Export WAV",
        "keys": "Ctrl+Shift+E",
        "description": "Exports master audio to lossless WAV.",
        "iconId": "file-export"
      }
    ],
    "dial": {
      "cw": {
        "name": "Zoom Wave In",
        "keys": "Ctrl+1",
        "description": "Zooms in on audio sample peaks.",
        "iconId": "maximize"
      },
      "press": {
        "name": "Play / Stop",
        "keys": "Space",
        "description": "Toggles audio playback.",
        "iconId": "player-play"
      },
      "ccw": {
        "name": "Zoom Wave Out",
        "keys": "Ctrl+3",
        "description": "Zooms out across full track length.",
        "iconId": "minimize"
      }
    }
  },
  {
    "id": "affinity",
    "title": "Affinity Designer",
    "description": "Precision vector creation: node tool, pen, artistic text, vector fill, and persona switching.",
    "author": "Node",
    "hasPreview": true,
    "color": "#75d957",
    "keys": [
      {
        "name": "Move Tool",
        "keys": "V",
        "description": "Moves and transforms active layers.",
        "iconId": "pointer"
      },
      {
        "name": "Node Tool",
        "keys": "A",
        "description": "Edits vector anchor nodes and curves.",
        "iconId": "pointer"
      },
      {
        "name": "Pen Tool",
        "keys": "P",
        "description": "Plots clean Bezier vector contours.",
        "iconId": "vector-bezier"
      },
      {
        "name": "Art Text",
        "keys": "T",
        "description": "Adds headline artistic typography.",
        "iconId": "typography"
      },
      {
        "name": "Rectangle",
        "keys": "M",
        "description": "Draws shapes and rounded rectangles.",
        "iconId": "shape"
      },
      {
        "name": "Vector Fill",
        "keys": "G",
        "description": "Applies smooth gradient shading.",
        "iconId": "palette"
      },
      {
        "name": "Group Layers",
        "keys": "Ctrl+G",
        "description": "Groups selected vector objects.",
        "iconId": "box-multiple"
      },
      {
        "name": "Pixel Persona",
        "keys": "Ctrl+Alt+2",
        "description": "Toggles raster brush pixel workspace.",
        "iconId": "brush"
      },
      {
        "name": "Undo / Redo",
        "keys": "Ctrl+Z",
        "description": "Tap to undo, double tap to redo.",
        "multi": {
          "onTap": "Ctrl+Z",
          "doubleTap": "Ctrl+Shift+Z"
        },
        "iconId": "arrow-back-up"
      }
    ],
    "dial": {
      "cw": {
        "name": "Zoom In",
        "keys": "Ctrl+=",
        "description": "Zooms into vector artwork.",
        "iconId": "maximize"
      },
      "press": {
        "name": "Zoom 100%",
        "keys": "Ctrl+1",
        "description": "Snaps zoom to pixel-perfect 100%.",
        "iconId": "maximize"
      },
      "ccw": {
        "name": "Zoom Out",
        "keys": "Ctrl+-",
        "description": "Zooms out of vector artwork.",
        "iconId": "minimize"
      }
    }
  },
  {
    "id": "excel",
    "title": "Microsoft Excel",
    "description": "Spreadsheet mastery: AutoSum, currency format, filter/sort, freeze panes, row insert, and charts.",
    "author": "Node",
    "hasPreview": true,
    "color": "#107c41",
    "keys": [
      {
        "name": "AutoSum",
        "keys": "Alt+=",
        "description": "Inserts automatic SUM calculation formula.",
        "iconId": "sum"
      },
      {
        "name": "Currency",
        "keys": "Ctrl+Shift+$",
        "description": "Formats cell as local currency currency.",
        "iconId": "currency-dollar"
      },
      {
        "name": "Filter / Sort",
        "keys": "Ctrl+Shift+L",
        "description": "Toggles table column filters.",
        "iconId": "filter"
      },
      {
        "name": "Freeze Panes",
        "keys": "Alt+W+F+F",
        "description": "Freezes header row and columns.",
        "iconId": "pin"
      },
      {
        "name": "Insert Row",
        "keys": "Ctrl+Shift+Plus",
        "description": "Inserts new blank spreadsheet row.",
        "iconId": "table-plus"
      },
      {
        "name": "Delete Row",
        "keys": "Ctrl+Minus",
        "description": "Deletes highlighted row or column.",
        "iconId": "table-minus"
      },
      {
        "name": "VLookup",
        "keys": "Alt+M+Q",
        "description": "Opens Lookup & Reference formulas.",
        "iconId": "search"
      },
      {
        "name": "New Sheet",
        "keys": "Shift+F11",
        "description": "Adds a new blank worksheet tab.",
        "iconId": "file-plus"
      },
      {
        "name": "Insert Chart",
        "keys": "Alt+F1",
        "description": "Generates embedded column chart.",
        "iconId": "chart-bar"
      }
    ],
    "dial": {
      "cw": {
        "name": "Next Sheet",
        "keys": "Ctrl+Page Down",
        "description": "Switches to next worksheet tab.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Recalculate",
        "keys": "F9",
        "description": "Forces full workbook recalculation.",
        "iconId": "refresh"
      },
      "ccw": {
        "name": "Prev Sheet",
        "keys": "Ctrl+Page Up",
        "description": "Switches to previous worksheet tab.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "word",
    "title": "Microsoft Word",
    "description": "Document drafting: bold, italic, H1 heading, bullet list, tables, page breaks, and word count.",
    "author": "Node",
    "hasPreview": true,
    "color": "#185abd",
    "keys": [
      {
        "name": "Bold Text",
        "keys": "Ctrl+B",
        "description": "Toggles bold text weighting.",
        "iconId": "bold"
      },
      {
        "name": "Italic Text",
        "keys": "Ctrl+I",
        "description": "Toggles italic font style.",
        "iconId": "italic"
      },
      {
        "name": "Heading 1",
        "keys": "Ctrl+Alt+1",
        "description": "Applies primary Heading 1 style.",
        "iconId": "heading"
      },
      {
        "name": "Bullet List",
        "keys": "Ctrl+Shift+L",
        "description": "Creates bulleted list item.",
        "iconId": "list"
      },
      {
        "name": "Insert Table",
        "keys": "Alt+N+T",
        "description": "Opens table insertion grid.",
        "iconId": "table"
      },
      {
        "name": "Find/Replace",
        "keys": "Ctrl+H",
        "description": "Opens Find & Replace dialog.",
        "iconId": "replace"
      },
      {
        "name": "Page Break",
        "keys": "Ctrl+Enter",
        "description": "Inserts hard page break.",
        "iconId": "page-break"
      },
      {
        "name": "Add Comment",
        "keys": "Ctrl+Alt+M",
        "description": "Inserts revision comment balloon.",
        "iconId": "message-plus"
      },
      {
        "name": "Word Count",
        "keys": "Ctrl+Shift+G",
        "description": "Displays live document word count.",
        "iconId": "notes"
      }
    ],
    "dial": {
      "cw": {
        "name": "Zoom In",
        "keys": "Ctrl+WheelUp",
        "description": "Enlarges document view zoom.",
        "iconId": "maximize"
      },
      "press": {
        "name": "100% View",
        "keys": "Alt+W+1",
        "description": "Resets document to 100% scale.",
        "iconId": "maximize"
      },
      "ccw": {
        "name": "Zoom Out",
        "keys": "Ctrl+WheelDown",
        "description": "Reduces document view zoom.",
        "iconId": "minimize"
      }
    }
  },
  {
    "id": "powerpoint",
    "title": "PowerPoint",
    "description": "Presentation builder: new slide, F5 slideshow, duplicate, grouping, shape tools, and slide sorter.",
    "author": "Node",
    "hasPreview": true,
    "color": "#c43e1c",
    "keys": [
      {
        "name": "New Slide",
        "keys": "Ctrl+M",
        "description": "Inserts a new presentation slide.",
        "iconId": "presentation"
      },
      {
        "name": "Present F5",
        "keys": "F5",
        "description": "Begins slideshow from first slide.",
        "iconId": "slideshow"
      },
      {
        "name": "Duplicate",
        "keys": "Ctrl+D",
        "description": "Duplicates selected shape or slide.",
        "iconId": "copy"
      },
      {
        "name": "Group Shapes",
        "keys": "Ctrl+G",
        "description": "Groups selected slide elements.",
        "iconId": "box-multiple"
      },
      {
        "name": "Bring Forward",
        "keys": "Ctrl+Shift+]",
        "description": "Brings shape in front of layers.",
        "iconId": "layers-intersect"
      },
      {
        "name": "Align Center",
        "keys": "Alt+H+G+A+C",
        "description": "Centers object on presentation slide.",
        "iconId": "layout-align-center"
      },
      {
        "name": "Insert Shape",
        "keys": "Alt+N+S+H",
        "description": "Opens vector shapes drop-down.",
        "iconId": "shape"
      },
      {
        "name": "Text Box",
        "keys": "Alt+N+X",
        "description": "Draws a new slide text box.",
        "iconId": "letter-t"
      },
      {
        "name": "Slide Sorter",
        "keys": "Alt+W+L",
        "description": "Switches to overview slide sorter.",
        "iconId": "layout-grid"
      }
    ],
    "dial": {
      "cw": {
        "name": "Next Slide",
        "keys": "Right",
        "description": "Advances to next slide in deck.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Current Slide",
        "keys": "Shift+F5",
        "description": "Presents from current active slide.",
        "iconId": "player-play"
      },
      "ccw": {
        "name": "Prev Slide",
        "keys": "Left",
        "description": "Returns to previous slide in deck.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "notion",
    "title": "Notion Workspace",
    "description": "Productivity hub: search Cmd+P, new subpage, task checkbox, toggle lists, tables, and AI assistant.",
    "author": "Node",
    "hasPreview": true,
    "color": "#37352f",
    "keys": [
      {
        "name": "Quick Search",
        "keys": "Ctrl+P",
        "description": "Quickly jumps to any page or note.",
        "iconId": "search"
      },
      {
        "name": "New Page",
        "keys": "Ctrl+N",
        "description": "Spawns new blank Notion document.",
        "iconId": "file-plus"
      },
      {
        "name": "To-Do Box",
        "keys": "[] ",
        "description": "Creates interactive checkable task box.",
        "iconId": "square-check"
      },
      {
        "name": "Toggle List",
        "keys": "> ",
        "description": "Creates collapsible nested list.",
        "iconId": "chevron-right"
      },
      {
        "name": "Callout Box",
        "keys": "/callout",
        "description": "Inserts highlighted callout tip card.",
        "iconId": "bulb"
      },
      {
        "name": "Data Table",
        "keys": "/table",
        "description": "Inserts inline Notion database table.",
        "iconId": "table"
      },
      {
        "name": "Code Block",
        "keys": "/code",
        "description": "Inserts syntax-highlighted code cell.",
        "iconId": "code"
      },
      {
        "name": "AI Assistant",
        "keys": "Space",
        "description": "Prompts Notion AI writer.",
        "iconId": "sparkles"
      },
      {
        "name": "Dark Mode",
        "keys": "Ctrl+Shift+L",
        "description": "Toggles dark and light mode themes.",
        "iconId": "moon"
      }
    ],
    "dial": {
      "cw": {
        "name": "Scroll Down",
        "keys": "Page Down",
        "description": "Scrolls down long document.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Top of Page",
        "keys": "Home",
        "description": "Scrolls straight back to page top.",
        "iconId": "arrow-up"
      },
      "ccw": {
        "name": "Scroll Up",
        "keys": "Page Up",
        "description": "Scrolls up long document.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "slack",
    "title": "Slack Team Chat",
    "description": "Workplace messaging: quick switcher Cmd+K, mute channel, @mention, threads, and huddle toggle.",
    "author": "Node",
    "hasPreview": true,
    "color": "#4a154b",
    "keys": [
      {
        "name": "Quick Switch",
        "keys": "Ctrl+K",
        "description": "Finds channels, direct messages, files.",
        "iconId": "search"
      },
      {
        "name": "Mute Channel",
        "keys": "Ctrl+Shift+M",
        "description": "Mutes notifications for current channel.",
        "iconId": "bell-off"
      },
      {
        "name": "Mention @",
        "keys": "@",
        "description": "Opens member mention auto-complete.",
        "iconId": "at"
      },
      {
        "name": "Thread Reply",
        "keys": "T",
        "description": "Opens thread discussion sidebar.",
        "iconId": "message-dots"
      },
      {
        "name": "Code Snippet",
        "keys": "Ctrl+Shift+Enter",
        "description": "Creates code and text snippet.",
        "iconId": "code"
      },
      {
        "name": "Search Slack",
        "keys": "Ctrl+F",
        "description": "Searches conversation history.",
        "iconId": "search"
      },
      {
        "name": "Emoji React",
        "keys": "Ctrl+Shift+\\",
        "description": "Opens emoji reaction palette.",
        "iconId": "mood-smile"
      },
      {
        "name": "Join Huddle",
        "keys": "Ctrl+Shift+H",
        "description": "Toggles live team voice huddle.",
        "iconId": "headphones"
      },
      {
        "name": "Set Status",
        "keys": "Ctrl+Shift+Y",
        "description": "Sets working status message.",
        "iconId": "user-check"
      }
    ],
    "dial": {
      "cw": {
        "name": "Next Channel",
        "keys": "Alt+Down",
        "description": "Jumps down to next unread channel.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Jump Unread",
        "keys": "Alt+Shift+Down",
        "description": "Jumps to newest unread message.",
        "iconId": "check"
      },
      "ccw": {
        "name": "Prev Channel",
        "keys": "Alt+Up",
        "description": "Jumps up to previous channel.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "zoom",
    "title": "Zoom & Teams",
    "description": "Conference room command: mic mute, camera toggle, screen sharing, participants, and raise hand.",
    "author": "Node",
    "hasPreview": true,
    "color": "#2d8cff",
    "keys": [
      {
        "name": "Mute Mic",
        "keys": "Alt+A",
        "description": "Toggles audio microphone mute.",
        "iconId": "microphone-off"
      },
      {
        "name": "Video Cam",
        "keys": "Alt+V",
        "description": "Toggles webcam video on or off.",
        "iconId": "video-off"
      },
      {
        "name": "Share Screen",
        "keys": "Alt+S",
        "description": "Starts or stops screen broadcast.",
        "iconId": "screen-share"
      },
      {
        "name": "Gallery View",
        "keys": "Alt+F1",
        "description": "Switches to active speaker or gallery.",
        "iconId": "layout-grid"
      },
      {
        "name": "Meeting Chat",
        "keys": "Alt+H",
        "description": "Toggles in-meeting chat sidebar.",
        "iconId": "message"
      },
      {
        "name": "Participants",
        "keys": "Alt+U",
        "description": "Displays meeting participants list.",
        "iconId": "users"
      },
      {
        "name": "Raise Hand",
        "keys": "Alt+Y",
        "description": "Toggles hand raise status.",
        "iconId": "hand-stop"
      },
      {
        "name": "Record Call",
        "keys": "Alt+R",
        "description": "Starts local or cloud recording.",
        "iconId": "disc"
      },
      {
        "name": "Leave Meeting",
        "keys": "Alt+Q",
        "description": "Prompts to leave or end meeting.",
        "iconId": "phone-off"
      }
    ],
    "dial": {
      "cw": {
        "name": "Speaker Vol +",
        "keys": "Volume Up",
        "description": "Increases meeting audio output.",
        "iconId": "volume"
      },
      "press": {
        "name": "Mute Mic",
        "keys": "Alt+A",
        "description": "Toggles meeting microphone.",
        "iconId": "microphone-off"
      },
      "ccw": {
        "name": "Speaker Vol -",
        "keys": "Volume Down",
        "description": "Lowers meeting audio output.",
        "iconId": "volume-off"
      }
    }
  },
  {
    "id": "obs",
    "title": "OBS Studio",
    "description": "Live streaming control: scenes, start stream, record, screenshot, and audio gain on the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#2a2e33",
    "keys": [
      {
        "name": "Start Stream",
        "keys": "Ctrl+F1",
        "description": "Starts live broadcast stream.",
        "iconId": "wifi"
      },
      {
        "name": "Record Call",
        "keys": "Ctrl+F2",
        "description": "Toggles video recording to disk.",
        "iconId": "disc"
      },
      {
        "name": "Scene 1",
        "keys": "Ctrl+Shift+1",
        "description": "Switches to Main Gameplay scene.",
        "iconId": "device-desktop"
      },
      {
        "name": "Scene 2",
        "keys": "Ctrl+Shift+2",
        "description": "Switches to Full Camera scene.",
        "iconId": "video"
      },
      {
        "name": "Scene 3",
        "keys": "Ctrl+Shift+3",
        "description": "Switches to Intermission scene.",
        "iconId": "presentation"
      },
      {
        "name": "Screenshot",
        "keys": "Win+Shift+S",
        "description": "Captures screen snapshot.",
        "iconId": "camera"
      },
      {
        "name": "Studio Mode",
        "keys": "Ctrl+Shift+S",
        "description": "Toggles OBS Studio mode preview.",
        "iconId": "layout-columns"
      },
      {
        "name": "Mute Audio",
        "keys": "Ctrl+Shift+D",
        "description": "Mutes desktop audio output.",
        "iconId": "volume-off"
      },
      {
        "name": "Virtual Cam",
        "keys": "Ctrl+Shift+V",
        "description": "Toggles virtual webcam output.",
        "iconId": "video"
      }
    ],
    "dial": {
      "cw": {
        "name": "Volume Up",
        "keys": "Volume Up",
        "description": "Raises monitor volume.",
        "iconId": "volume"
      },
      "press": {
        "name": "Audio Mute",
        "keys": "Media Mute",
        "description": "Toggles audio mute.",
        "iconId": "volume-off"
      },
      "ccw": {
        "name": "Volume Down",
        "keys": "Volume Down",
        "description": "Lowers monitor volume.",
        "iconId": "volume-off"
      }
    }
  },
  {
    "id": "discord",
    "title": "Discord",
    "description": "Voice chat & gaming: mute mic, deafen, screen share, push to talk, and server switching on the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#5865f2",
    "keys": [
      {
        "name": "Mute Mic",
        "keys": "Ctrl+Shift+M",
        "description": "Toggles microphone mute.",
        "iconId": "microphone-off"
      },
      {
        "name": "Deafen",
        "keys": "Ctrl+Shift+D",
        "description": "Deafens audio output.",
        "iconId": "headphones-off"
      },
      {
        "name": "Screen Share",
        "keys": "Ctrl+Shift+S",
        "description": "Toggles screen share stream.",
        "iconId": "screen-share"
      },
      {
        "name": "Quick Switch",
        "keys": "Ctrl+K",
        "description": "Opens search & channel switcher.",
        "iconId": "search"
      },
      {
        "name": "Toggle Video",
        "keys": "Ctrl+Shift+V",
        "description": "Toggles webcam on/off.",
        "iconId": "video-off"
      },
      {
        "name": "Emoji Picker",
        "keys": "Ctrl+E",
        "description": "Opens emoji and gif selector.",
        "iconId": "mood-smile"
      },
      {
        "name": "Search",
        "keys": "Ctrl+F",
        "description": "Searches channel messages.",
        "iconId": "search"
      },
      {
        "name": "Settings",
        "keys": "Ctrl+,",
        "description": "Opens Discord user settings.",
        "iconId": "settings"
      },
      {
        "name": "Push to Talk",
        "keys": "Ctrl",
        "description": "Activates push to talk voice.",
        "iconId": "microphone"
      }
    ],
    "dial": {
      "cw": {
        "name": "Next Server",
        "keys": "Alt+Down",
        "description": "Jumps to next server down.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Mute Mic",
        "keys": "Ctrl+Shift+M",
        "description": "Toggles mic mute.",
        "iconId": "microphone-off"
      },
      "ccw": {
        "name": "Prev Server",
        "keys": "Alt+Up",
        "description": "Jumps to previous server up.",
        "iconId": "player-skip-back"
      }
    }
  },
  {
    "id": "spotify",
    "title": "Spotify",
    "description": "Music playback & queues: play, skip, shuffle, like song, and master audio gain on the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#1db954",
    "keys": [
      {
        "name": "Play / Pause",
        "keys": "Space",
        "description": "Toggles music playback.",
        "iconId": "player-play"
      },
      {
        "name": "Next Track",
        "keys": "Ctrl+Right",
        "description": "Skips to next song.",
        "iconId": "player-skip-forward"
      },
      {
        "name": "Prev Track",
        "keys": "Ctrl+Left",
        "description": "Returns to previous song.",
        "iconId": "player-skip-back"
      },
      {
        "name": "Like Song",
        "keys": "Alt+Shift+B",
        "description": "Saves song to library.",
        "iconId": "heart"
      },
      {
        "name": "Shuffle",
        "keys": "Ctrl+S",
        "description": "Toggles shuffle mode.",
        "iconId": "arrows-split"
      },
      {
        "name": "Repeat",
        "keys": "Ctrl+R",
        "description": "Toggles repeat mode.",
        "iconId": "refresh"
      },
      {
        "name": "Search",
        "keys": "Ctrl+L",
        "description": "Focuses Spotify search bar.",
        "iconId": "search"
      },
      {
        "name": "Queue",
        "keys": "Ctrl+Q",
        "description": "Opens upcoming play queue.",
        "iconId": "list"
      },
      {
        "name": "Mute Audio",
        "keys": "Ctrl+Down",
        "description": "Mutes Spotify volume.",
        "iconId": "volume-off"
      }
    ],
    "dial": {
      "cw": {
        "name": "Volume Up",
        "keys": "Volume Up",
        "description": "Increases volume.",
        "iconId": "volume"
      },
      "press": {
        "name": "Play / Pause",
        "keys": "Media Play / Pause",
        "description": "Plays or pauses.",
        "iconId": "player-play"
      },
      "ccw": {
        "name": "Volume Down",
        "keys": "Volume Down",
        "description": "Decreases volume.",
        "iconId": "volume-off"
      }
    }
  },
  {
    "id": "windows",
    "title": "Windows Power",
    "description": "Multitasking essentials: quick link, task manager, snip, virtual desktops and system volume on the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#0078d4",
    "keys": [
      {
        "name": "Quick Link",
        "keys": "Win+X",
        "description": "Opens Windows Power User menu.",
        "iconId": "power"
      },
      {
        "name": "Task Manager",
        "keys": "Ctrl+Shift+Esc",
        "description": "Opens Task Manager.",
        "iconId": "gauge"
      },
      {
        "name": "Screen Snip",
        "keys": "Win+Shift+S",
        "description": "Opens Snipping Tool.",
        "iconId": "camera"
      },
      {
        "name": "File Explorer",
        "keys": "Win+E",
        "description": "Opens File Explorer.",
        "iconId": "folder"
      },
      {
        "name": "Run Dialog",
        "keys": "Win+R",
        "description": "Opens Windows Run dialog.",
        "iconId": "command"
      },
      {
        "name": "Action Center",
        "keys": "Win+A",
        "description": "Opens Quick Settings / Action Center.",
        "iconId": "settings"
      },
      {
        "name": "Show Desktop",
        "keys": "Win+D",
        "description": "Minimizes all windows to desktop.",
        "iconId": "home"
      },
      {
        "name": "Next Desktop",
        "keys": "Ctrl+Win+Right",
        "description": "Switches to next virtual desktop.",
        "iconId": "player-skip-forward"
      },
      {
        "name": "Prev Desktop",
        "keys": "Ctrl+Win+Left",
        "description": "Switches to previous virtual desktop.",
        "iconId": "player-skip-back"
      }
    ],
    "dial": {
      "cw": {
        "name": "Volume Up",
        "keys": "Volume Up",
        "description": "Raises system volume.",
        "iconId": "volume"
      },
      "press": {
        "name": "Mute Audio",
        "keys": "Media Mute",
        "description": "Toggles master audio mute.",
        "iconId": "volume-off"
      },
      "ccw": {
        "name": "Volume Down",
        "keys": "Volume Down",
        "description": "Lowers system volume.",
        "iconId": "volume-off"
      }
    }
  },
  {
    "id": "chatgpt",
    "title": "ChatGPT",
    "description": "Chat faster: new chats, search, copy replies and scroll with the dial.",
    "author": "Node",
    "hasPreview": true,
    "color": "#10a37f",
    "keys": [
      {
        "name": "New Chat",
        "keys": "Mod+Shift+O",
        "description": "Starts a fresh conversation.",
        "iconId": "sparkles"
      },
      {
        "name": "Search",
        "keys": "Mod+K",
        "description": "Searches your chats and history.",
        "iconId": "search"
      },
      {
        "name": "Focus Input",
        "keys": "Shift+Esc",
        "description": "Jumps the cursor to the message box.",
        "iconId": "pointer"
      },
      {
        "name": "Copy Reply",
        "keys": "Mod+Shift+C",
        "description": "Copies the last response.",
        "iconId": "copy"
      },
      {
        "name": "Copy Code",
        "keys": "Mod+Shift+;",
        "description": "Copies the last code block.",
        "iconId": "code"
      },
      {
        "name": "Sidebar",
        "keys": "Mod+Shift+S",
        "description": "Shows or hides the chat sidebar.",
        "iconId": "layout-columns"
      },
      {
        "name": "Instructions",
        "keys": "Mod+Shift+I",
        "description": "Opens your custom instructions.",
        "iconId": "settings"
      },
      {
        "name": "Delete Chat",
        "keys": "Mod+Shift+Backspace",
        "description": "Deletes the current chat.",
        "iconId": "trash"
      },
      {
        "name": "Shortcuts",
        "keys": "Mod+/",
        "description": "Shows every ChatGPT shortcut.",
        "iconId": "command"
      }
    ],
    "dial": {
      "cw": {
        "name": "Scroll Down",
        "keys": "Page Down",
        "description": "Scrolls down the conversation.",
        "iconId": "player-skip-forward"
      },
      "press": {
        "name": "Latest",
        "keys": "End",
        "description": "Jumps to the newest message.",
        "iconId": "arrow-down"
      },
      "ccw": {
        "name": "Scroll Up",
        "keys": "Page Up",
        "description": "Scrolls up the conversation.",
        "iconId": "player-skip-back"
      }
    }
  }
];
