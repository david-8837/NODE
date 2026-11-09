const fs = require('fs');

const NEW_X = `X=(e,t,n,i)=>({name:e,keys:t,desc:n,...(i?{iconId:i}:{})}),vd=(e,t,n,r,i)=>({name:e,keys:t,desc:r,multi:{onTap:t,doubleTap:n},...(i?{iconId:i}:{})})`;

const PRESETS = [
  // ==========================================
  // CODERS & DEVELOPERS
  // ==========================================
  {
    id: 'vscode',
    title: 'VS Code',
    description: 'Code with speed: command palette, quick open, terminal, file explorer and tab navigation on the dial.',
    author: 'Microsoft',
    hasPreview: true,
    color: '#007acc',
    keys: [
      `X('Palette','Ctrl+Shift+P','Opens VS Code command palette.','command')`,
      `X('Quick Open','Ctrl+P','Quickly opens any file.','file-search')`,
      `X('Terminal','Ctrl+Tilde','Toggles integrated terminal.','terminal-2')`,
      `X('Explorer','Ctrl+Shift+E','Focuses side file explorer.','folders')`,
      `X('Search Files','Ctrl+Shift+F','Searches across workspace files.','search')`,
      `X('Format Code','Shift+Alt+F','Auto-formats current document.','wand')`,
      `X('Comment','Ctrl+/','Toggles line comment.','code')`,
      `X('Split Editor','Ctrl+Backslash','Splits active editor window.','layout-columns')`,
      `X('Run Code','F5','Starts debugging or run.','bug')`
    ],
    dial: `{cw:X('Next Tab','Ctrl+Page Down','Switches to next editor tab.','player-skip-forward'),press:X('Close Tab','Ctrl+W','Closes active editor tab.','trash'),ccw:X('Prev Tab','Ctrl+Page Up','Switches to previous editor tab.','player-skip-back')}`
  },
  {
    id: 'github',
    title: 'GitHub & Git Dev',
    description: 'Git workflow accelerator: commit, push, pull, diff, branch, pull request, and stash controls.',
    author: 'GitHub',
    hasPreview: true,
    color: '#6e40c9',
    keys: [
      `X('Commit','Ctrl+Enter','Stages and commits staged changes.','git-commit')`,
      `X('Push','Ctrl+Shift+U','Pushes commits to remote origin.','arrow-up')`,
      `X('Pull','Ctrl+Shift+P','Pulls latest remote changes.','arrow-down')`,
      `X('Git Diff','Ctrl+Shift+D','Shows git changes difference.','git-compare')`,
      `X('New Branch','Ctrl+Shift+B','Creates new Git branch.','git-branch')`,
      `X('Pull Request','Ctrl+Shift+M','Opens new Pull Request.','git-pull-request')`,
      `X('Git Stash','Ctrl+Shift+S','Stashes working directory.','archive')`,
      `X('Git History','Ctrl+Shift+H','Views commit log history.','history')`,
      `X('Checkout','Ctrl+Shift+O','Checks out target branch.','check')`
    ],
    dial: `{cw:X('Next Commit','Down','Navigates to newer commit.','player-skip-forward'),press:X('Git Refresh','Ctrl+R','Refreshes git repository status.','refresh'),ccw:X('Prev Commit','Up','Navigates to older commit.','player-skip-back')}`
  },
  {
    id: 'terminal',
    title: 'Terminal & CLI',
    description: 'Command line power tools: clear, SIGINT Ctrl+C, background Ctrl+Z, piping, sudo, and grep search.',
    author: 'Linux / POSIX',
    hasPreview: true,
    color: '#22c55e',
    keys: [
      `X('Clear','Ctrl+L','Clears terminal screen buffer.','brush')`,
      `X('Interrupt','Ctrl+C','Sends SIGINT interrupt to process.','player-stop')`,
      `X('Background','Ctrl+Z','Suspends process to background.','minimize')`,
      `X('Pipe','|','Inserts Unix shell pipe operator.','arrows-split')`,
      `X('Sudo','sudo ','Prepends root admin privileges.','shield-lock')`,
      `X('History','Ctrl+R','Reverse search through command history.','history')`,
      `X('Grep Search','Ctrl+Shift+F','Fast grep across terminal buffer.','search')`,
      `X('SSH Session','Ctrl+Shift+T','Opens remote SSH session window.','server')`,
      `X('Exit Shell','Ctrl+D','Closes shell session gracefully.','logout')`
    ],
    dial: `{cw:X('Next Command','Down','Scrolls forward through bash history.','player-skip-forward'),press:X('Execute','Enter','Executes active shell command.','check'),ccw:X('Prev Command','Up','Recalls previous bash command.','player-skip-back')}`
  },
  {
    id: 'docker',
    title: 'Docker DevOps',
    description: 'Container management: compose up, compose down, container logs, live build, and system prune.',
    author: 'Docker',
    hasPreview: true,
    color: '#2496ed',
    keys: [
      `X('Container PS','docker ps','Lists running active containers.','list')`,
      `X('Compose Up','docker compose up -d','Starts stack in background mode.','player-play')`,
      `X('Compose Down','docker compose down','Stops and removes stack network.','player-stop')`,
      `X('Stream Logs','docker logs -f','Follows container output logs.','file-text')`,
      `X('Docker Build','docker build -t app .','Builds image from Dockerfile.','tool')`,
      `X('Exec Shell','docker exec -it','Opens bash terminal inside container.','terminal-2')`,
      `X('Stop All','docker stop $(docker ps -q)','Gracefully stops all running containers.','power')`,
      `X('System Prune','docker system prune -f','Reclaims unused disk memory.','trash')`,
      `X('Restart Stack','docker compose restart','Restarts container stack service.','refresh')`
    ],
    dial: `{cw:X('Scroll Logs Dn','Page Down','Scrolls down container output.','player-skip-forward'),press:X('Inspect','Enter','Inspects highlighted container.','search'),ccw:X('Scroll Logs Up','Page Up','Scrolls up container output.','player-skip-back')}`
  },
  {
    id: 'chrome_devtools',
    title: 'Chrome DevTools',
    description: 'Web developer tools: inspect element, console, network tab, device toolbar, and hard cache reload.',
    author: 'Google',
    hasPreview: true,
    color: '#4285f4',
    keys: [
      `X('Inspect','Ctrl+Shift+C','Activates element inspector picker.','pointer')`,
      `X('Console','Ctrl+Shift+J','Jumps straight to DevTools console.','terminal-2')`,
      `X('Network Tab','Ctrl+Shift+E','Inspects network waterfall requests.','network')`,
      `X('Responsive','Ctrl+Shift+M','Toggles mobile device emulation.','devices')`,
      `X('Hard Reload','Ctrl+Shift+R','Bypasses cache and hard reloads page.','refresh')`,
      `X('Clear Cache','Ctrl+Shift+Delete','Opens browser clear cache dialogue.','trash')`,
      `X('Sources Debug','Ctrl+P','Opens script source debugger.','code')`,
      `X('Performance','Ctrl+Shift+F','Records performance profile timeline.','gauge')`,
      `X('Tablet View','Ctrl+Alt+M','Switches device to tablet preset.','device-tablet')`
    ],
    dial: `{cw:X('Next Panel','Ctrl+]','Switches to next DevTools tab.','player-skip-forward'),press:X('Reload','Ctrl+R','Refreshes active browser page.','refresh'),ccw:X('Prev Panel','Ctrl+[','Switches to previous DevTools tab.','player-skip-back')}`
  },

  // ==========================================
  // EDITORS & CREATIVE SUITE
  // ==========================================
  {
    id: 'photoshop',
    title: 'Photoshop',
    description: 'Retouch and paint: core tools, layers, transform, and brush size on the dial.',
    author: 'Adobe',
    hasPreview: true,
    color: '#31a8ff',
    keys: [
      `X('Move','V','Moves layers and selections.','pointer')`,
      `X('Brush','B','Paints soft or hard strokes.','brush')`,
      `X('Eraser','E','Erases parts of a layer.','trash')`,
      `X('Lasso','L','Draws a free-form selection.','crop')`,
      `X('Eyedropper','I','Picks a color from the image.','palette')`,
      `X('Transform','Mod+T','Scales, rotates or skews a layer.','maximize')`,
      `X('Duplicate','Mod+J','Duplicates the layer.','copy')`,
      `X('Merge Down','Mod+E','Merges into the layer below.','layers-intersect')`,
      `vd('Undo / Redo','Mod+Z','Mod+Shift+Z','Tap to undo, double tap to redo.','arrow-back-up')`
    ],
    dial: `{cw:X('Brush +',']','Makes the brush bigger.','circle-dot'),press:X('Fit Screen','Mod+0','Fits the image on screen.','maximize'),ccw:X('Brush -','[','Makes the brush smaller.','circle-dot')}`
  },
  {
    id: 'illustrator',
    title: 'Illustrator',
    description: 'Vector essentials: selection, pen, shapes, grouping and zoom on the dial.',
    author: 'Adobe',
    hasPreview: true,
    color: '#ff9a00',
    keys: [
      `X('Select','V','Selects and moves whole objects.','pointer')`,
      `X('Direct Select','A','Selects single points and paths.','pointer')`,
      `X('Pen','P','Draws precise paths.','vector-bezier')`,
      `X('Type','T','Adds editable text.','typography')`,
      `X('Rectangle','M','Draws rectangles.','shape')`,
      `X('Eyedropper','I','Copies colors and styles.','palette')`,
      `X('Group','Mod+G','Groups the selected objects.','box-multiple')`,
      `X('Outline','Mod+Y','Switches outline view on or off.','eye')`,
      `vd('Undo / Redo','Mod+Z','Mod+Shift+Z','Tap to undo, double tap to redo.','arrow-back-up')`
    ],
    dial: `{cw:X('Zoom In','Mod+=','Zooms in on the artboard.','maximize'),press:X('Fit','Mod+0','Fits the artboard on screen.','maximize'),ccw:X('Zoom Out','Mod+-','Zooms out of the artboard.','minimize')}`
  },
  {
    id: 'premiere',
    title: 'Premiere Pro',
    description: 'Cut video fast: razor, marks, ripple delete and frame stepping on the dial.',
    author: 'Adobe',
    hasPreview: true,
    color: '#9999ff',
    keys: [
      `X('Select','V','Switches to the selection tool.','pointer')`,
      `X('Razor','C','Cuts clips on the timeline.','scissors')`,
      `X('Add Edit','Mod+K','Cuts the clip at the playhead.','scissors')`,
      `X('Ripple Del','Shift+Del','Deletes and closes the gap.','trash')`,
      `X('Mark In','I','Sets the start of a selection.','bookmark')`,
      `X('Mark Out','O','Sets the end of a selection.','bookmark')`,
      `X('Match Frame','F','Finds the source clip in the bin.','search')`,
      `X('Export','Mod+M','Opens the export settings.','device-floppy')`,
      `X('Play / Pause','Space','Starts or stops playback.','player-play')`
    ],
    dial: `{cw:X('Step Fwd','Right','Steps one frame forward.','player-skip-forward'),press:X('Play','Space','Plays or pauses playback.','player-play'),ccw:X('Step Back','Left','Steps one frame backward.','player-skip-back')}`
  },
  {
    id: 'aftereffects',
    title: 'After Effects',
    description: 'Motion graphics powerhouse: keyframes, RAM preview, easy ease, pre-compose, and graph editor.',
    author: 'Adobe',
    hasPreview: true,
    color: '#d291ff',
    keys: [
      `X('Keyframe','Alt+Shift+P','Adds position keyframe at playhead.','diamond')`,
      `X('RAM Preview','Space','Pre-renders and plays preview.','player-play')`,
      `X('Easy Ease','F9','Smoothes keyframe bezier interpolation.','vector-bezier')`,
      `X('Trim In/Out','Alt+[','Trims layer start point to current time.','arrows-left-right')`,
      `X('Split Layer','Ctrl+Shift+D','Splits selected layer into two.','scissors')`,
      `X('Graph Editor','Shift+F3','Toggles velocity speed graph curve.','chart-line')`,
      `X('Render Queue','Ctrl+M','Sends composition to render queue.','movie')`,
      `X('Pre-compose','Ctrl+Shift+C','Nests layers into pre-composition.','box')`,
      `X('Null Object','Ctrl+Alt+Shift+Y','Spawns new parent tracking Null.','crosshair')`
    ],
    dial: `{cw:X('Next Keyframe','K','Jumps forward to next keyframe.','player-skip-forward'),press:X('Play / Stop','Space','Toggles timeline playback.','player-play'),ccw:X('Prev Keyframe','J','Jumps backward to previous keyframe.','player-skip-back')}`
  },
  {
    id: 'davinci',
    title: 'DaVinci Resolve',
    description: 'Edit and color: blade, ripples, transition, color wheels, and frame jog on the dial.',
    author: 'Blackmagic Design',
    hasPreview: true,
    color: '#29b6f6',
    keys: [
      `X('Blade','B','Selects the blade cut tool.','scissors')`,
      `X('Ripple Cut','Mod+Shift+X','Cuts clip and ripples timeline.','scissors')`,
      `X('Transition','Mod+T','Applies standard cross dissolve.','sparkles')`,
      `X('Color Page','Shift+6','Switches directly to color wheels page.','palette')`,
      `X('Inspector','Mod+4','Opens clip video/audio inspector.','adjustments-horizontal')`,
      `X('Timeline Zoom','Shift+Z','Toggles full timeline overview zoom.','maximize')`,
      `X('Marker','M','Drops an edit marker point.','bookmark')`,
      `X('Play / Stop','Space','Toggles timeline playback.','player-play')`,
      `X('Quick Export','Alt+Shift+K','Opens fast rendering export.','device-floppy')`
    ],
    dial: `{cw:X('Jog Fwd','Right','Steps playhead forward one frame.','player-skip-forward'),press:X('Play','Space','Plays or pauses playback.','player-play'),ccw:X('Jog Back','Left','Steps playhead backward one frame.','player-skip-back')}`
  },
  {
    id: 'blender',
    title: 'Blender 3D',
    description: 'Model and sculpt: extrude, inset, bevel, loop cuts, F12 render, and viewport orbit on the dial.',
    author: 'Blender Foundation',
    hasPreview: true,
    color: '#f5792a',
    keys: [
      `X('Extrude','E','Extrudes faces or vertices.','maximize')`,
      `X('Inset','I','Insets boundary faces.','minimize')`,
      `X('Bevel','Mod+B','Bevels edges smoothly.','vector-bezier')`,
      `X('Loop Cut','Mod+R','Cuts edge loop ring.','scissors')`,
      `X('Render','F12','Renders active scene camera.','camera')`,
      `X('Shade Smooth','W','Toggles smooth geometry normals.','sparkles')`,
      `X('X-Ray','Alt+Z','Toggles transparent see-through view.','eye')`,
      `X('Camera View','Numpad 0','Snaps view directly to camera.','video')`,
      `X('Solid / Wire','Z','Opens viewport shading pie menu.','box')`
    ],
    dial: `{cw:X('Orbit Right','Numpad 6','Orbits viewport turntable right.','player-skip-forward'),press:X('View Selected','Numpad .','Centers view on active object.','crosshair'),ccw:X('Orbit Left','Numpad 4','Orbits viewport turntable left.','player-skip-back')}`
  },
  {
    id: 'figma',
    title: 'Figma',
    description: 'Design tools at your fingertips: frames, shapes, auto layout, component creation, and zoom.',
    author: 'Figma',
    hasPreview: true,
    color: '#f24e1e',
    keys: [
      `X('Frame','F','Draws a new frame.','layout-columns')`,
      `X('Rectangle','R','Draws a rectangle.','shape')`,
      `X('Text','T','Adds a text layer.','typography')`,
      `X('Pen','P','Draws precise vector paths.','vector-bezier')`,
      `X('Auto Layout','Shift+A','Adds auto layout to the selection.','layout-columns')`,
      `X('Component','Mod+Alt+K','Turns the selection into a component.','box-multiple')`,
      `X('Comment','C','Drops a comment on the canvas.','message')`,
      `X('Duplicate','Mod+D','Duplicates the selection.','copy')`,
      `X('Actions','Mod+/','Searches tools and commands.','command')`
    ],
    dial: `{cw:X('Zoom In','Mod+=','Zooms in on the canvas.','maximize'),press:X('Zoom Fit','Shift+1','Fits everything on screen.','maximize'),ccw:X('Zoom Out','Mod+-','Zooms out of the canvas.','minimize')}`
  },
  {
    id: 'framer',
    title: 'Framer',
    description: 'Build pages quickly: frames, text, insert menu, live preview, and canvas zoom on the dial.',
    author: 'Framer',
    hasPreview: true,
    color: '#0055ff',
    keys: [
      `X('Frame','F','Draws a new frame.','layout-columns')`,
      `X('Text','T','Adds a text layer.','typography')`,
      `X('Rectangle','R','Draws a rectangle.','shape')`,
      `X('Insert','I','Opens the insert menu.','box-multiple')`,
      `X('Preview','Mod+P','Opens a live preview of your site.','eye')`,
      `X('Quick Actions','Mod+K','Searches every command.','command')`,
      `X('Duplicate','Mod+D','Duplicates the selection.','copy')`,
      `X('Group','Mod+G','Groups the selected layers.','box')`,
      `X('Undo','Mod+Z','Undoes your last change.','arrow-back-up')`
    ],
    dial: `{cw:X('Zoom In','Mod+=','Zooms in on the canvas.','maximize'),press:X('Zoom Fit','Shift+1','Fits everything on screen.','maximize'),ccw:X('Zoom Out','Mod+-','Zooms out of the canvas.','minimize')}`
  },
  {
    id: 'canva',
    title: 'Canva Design',
    description: 'Rapid graphics: text, elements, uploads, grouping, alignment, locking, and export download.',
    author: 'Canva',
    hasPreview: true,
    color: '#00c4cc',
    keys: [
      `X('Add Text','T','Adds text box to design canvas.','typography')`,
      `X('Elements','C','Opens stickers, shapes, graphics bin.','shape')`,
      `X('Uploads','Ctrl+U','Opens image and asset uploads.','cloud-upload')`,
      `X('Duplicate','Ctrl+D','Duplicates selected element.','copy')`,
      `X('Group','Ctrl+G','Groups elements together.','box-multiple')`,
      `X('Lock Element','Ctrl+Alt+L','Locks element against movement.','lock')`,
      `X('Align Center','Ctrl+Shift+C','Centers element on canvas.','layout-columns')`,
      `X('Download','Ctrl+Shift+S','Opens PNG/PDF download menu.','download')`,
      `X('Fullscreen','Ctrl+Alt+P','Presents design in full screen.','maximize')`
    ],
    dial: `{cw:X('Zoom In','Ctrl+=','Zooms in on Canva canvas.','maximize'),press:X('Reset View','Ctrl+0','Resets canvas zoom to 100%.','maximize'),ccw:X('Zoom Out','Ctrl+-','Zooms out of Canva canvas.','minimize')}`
  },
  {
    id: 'audacity',
    title: 'Audacity Audio',
    description: 'Audio production: record, cut, noise removal, amplify, compress, normalize, and WAV export.',
    author: 'Audacity',
    hasPreview: true,
    color: '#2b5cff',
    keys: [
      `X('Record','R','Begins audio capture on active mic.','circle-dot')`,
      `X('Stop / Play','Space','Starts or stops timeline transport.','player-play')`,
      `X('Cut Audio','Ctrl+X','Cuts highlighted audio waveform.','scissors')`,
      `X('Noise Filter','Ctrl+Alt+N','Applies learned noise reduction.','waveform')`,
      `X('Amplify Gain','Ctrl+Alt+A','Boosts selected audio decibels.','volume')`,
      `X('Compressor','Ctrl+Alt+C','Evens dynamic volume range.','arrows-split')`,
      `X('Split Clip','Ctrl+I','Splits track at cursor playhead.','scissors')`,
      `X('Normalize','Ctrl+Alt+M','Normalizes peak volume to -1 dB.','adjustments-horizontal')`,
      `X('Export WAV','Ctrl+Shift+E','Exports master audio to lossless WAV.','file-export')`
    ],
    dial: `{cw:X('Zoom Wave In','Ctrl+1','Zooms in on audio sample peaks.','maximize'),press:X('Play / Stop','Space','Toggles audio playback.','player-play'),ccw:X('Zoom Wave Out','Ctrl+3','Zooms out across full track length.','minimize')}`
  },
  {
    id: 'affinity',
    title: 'Affinity Designer',
    description: 'Precision vector creation: node tool, pen, artistic text, vector fill, and persona switching.',
    author: 'Serif',
    hasPreview: true,
    color: '#75d957',
    keys: [
      `X('Move Tool','V','Moves and transforms active layers.','pointer')`,
      `X('Node Tool','A','Edits vector anchor nodes and curves.','pointer')`,
      `X('Pen Tool','P','Plots clean Bezier vector contours.','vector-bezier')`,
      `X('Art Text','T','Adds headline artistic typography.','typography')`,
      `X('Rectangle','M','Draws shapes and rounded rectangles.','shape')`,
      `X('Vector Fill','G','Applies smooth gradient shading.','palette')`,
      `X('Group Layers','Ctrl+G','Groups selected vector objects.','box-multiple')`,
      `X('Pixel Persona','Ctrl+Alt+2','Toggles raster brush pixel workspace.','brush')`,
      `vd('Undo / Redo','Ctrl+Z','Ctrl+Shift+Z','Tap to undo, double tap to redo.','arrow-back-up')`
    ],
    dial: `{cw:X('Zoom In','Ctrl+=','Zooms into vector artwork.','maximize'),press:X('Zoom 100%','Ctrl+1','Snaps zoom to pixel-perfect 100%.','maximize'),ccw:X('Zoom Out','Ctrl+-','Zooms out of vector artwork.','minimize')}`
  },

  // ==========================================
  // OFFICE & PRODUCTIVITY SUITE
  // ==========================================
  {
    id: 'excel',
    title: 'Microsoft Excel',
    description: 'Spreadsheet mastery: AutoSum, currency format, filter/sort, freeze panes, row insert, and charts.',
    author: 'Microsoft',
    hasPreview: true,
    color: '#107c41',
    keys: [
      `X('AutoSum','Alt+=','Inserts automatic SUM calculation formula.','sum')`,
      `X('Currency','Ctrl+Shift+$','Formats cell as local currency currency.','currency-dollar')`,
      `X('Filter / Sort','Ctrl+Shift+L','Toggles table column filters.','filter')`,
      `X('Freeze Panes','Alt+W+F+F','Freezes header row and columns.','pin')`,
      `X('Insert Row','Ctrl+Shift+Plus','Inserts new blank spreadsheet row.','table-plus')`,
      `X('Delete Row','Ctrl+Minus','Deletes highlighted row or column.','table-minus')`,
      `X('VLookup','Alt+M+Q','Opens Lookup & Reference formulas.','search')`,
      `X('New Sheet','Shift+F11','Adds a new blank worksheet tab.','file-plus')`,
      `X('Insert Chart','Alt+F1','Generates embedded column chart.','chart-bar')`
    ],
    dial: `{cw:X('Next Sheet','Ctrl+Page Down','Switches to next worksheet tab.','player-skip-forward'),press:X('Recalculate','F9','Forces full workbook recalculation.','refresh'),ccw:X('Prev Sheet','Ctrl+Page Up','Switches to previous worksheet tab.','player-skip-back')}`
  },
  {
    id: 'word',
    title: 'Microsoft Word',
    description: 'Document drafting: bold, italic, H1 heading, bullet list, tables, page breaks, and word count.',
    author: 'Microsoft',
    hasPreview: true,
    color: '#185abd',
    keys: [
      `X('Bold Text','Ctrl+B','Toggles bold text weighting.','bold')`,
      `X('Italic Text','Ctrl+I','Toggles italic font style.','italic')`,
      `X('Heading 1','Ctrl+Alt+1','Applies primary Heading 1 style.','heading')`,
      `X('Bullet List','Ctrl+Shift+L','Creates bulleted list item.','list')`,
      `X('Insert Table','Alt+N+T','Opens table insertion grid.','table')`,
      `X('Find/Replace','Ctrl+H','Opens Find & Replace dialog.','replace')`,
      `X('Page Break','Ctrl+Enter','Inserts hard page break.','page-break')`,
      `X('Add Comment','Ctrl+Alt+M','Inserts revision comment balloon.','message-plus')`,
      `X('Word Count','Ctrl+Shift+G','Displays live document word count.','notes')`
    ],
    dial: `{cw:X('Zoom In','Ctrl+WheelUp','Enlarges document view zoom.','maximize'),press:X('100% View','Alt+W+1','Resets document to 100% scale.','maximize'),ccw:X('Zoom Out','Ctrl+WheelDown','Reduces document view zoom.','minimize')}`
  },
  {
    id: 'powerpoint',
    title: 'PowerPoint',
    description: 'Presentation builder: new slide, F5 slideshow, duplicate, grouping, shape tools, and slide sorter.',
    author: 'Microsoft',
    hasPreview: true,
    color: '#c43e1c',
    keys: [
      `X('New Slide','Ctrl+M','Inserts a new presentation slide.','presentation')`,
      `X('Present F5','F5','Begins slideshow from first slide.','slideshow')`,
      `X('Duplicate','Ctrl+D','Duplicates selected shape or slide.','copy')`,
      `X('Group Shapes','Ctrl+G','Groups selected slide elements.','box-multiple')`,
      `X('Bring Forward','Ctrl+Shift+]','Brings shape in front of layers.','layers-intersect')`,
      `X('Align Center','Alt+H+G+A+C','Centers object on presentation slide.','layout-align-center')`,
      `X('Insert Shape','Alt+N+S+H','Opens vector shapes drop-down.','shape')`,
      `X('Text Box','Alt+N+X','Draws a new slide text box.','letter-t')`,
      `X('Slide Sorter','Alt+W+L','Switches to overview slide sorter.','layout-grid')`
    ],
    dial: `{cw:X('Next Slide','Right','Advances to next slide in deck.','player-skip-forward'),press:X('Current Slide','Shift+F5','Presents from current active slide.','player-play'),ccw:X('Prev Slide','Left','Returns to previous slide in deck.','player-skip-back')}`
  },
  {
    id: 'notion',
    title: 'Notion Workspace',
    description: 'Productivity hub: search Cmd+P, new subpage, task checkbox, toggle lists, tables, and AI assistant.',
    author: 'Notion',
    hasPreview: true,
    color: '#37352f',
    keys: [
      `X('Quick Search','Ctrl+P','Quickly jumps to any page or note.','search')`,
      `X('New Page','Ctrl+N','Spawns new blank Notion document.','file-plus')`,
      `X('To-Do Box','[] ','Creates interactive checkable task box.','square-check')`,
      `X('Toggle List','> ','Creates collapsible nested list.','chevron-right')`,
      `X('Callout Box','/callout','Inserts highlighted callout tip card.','bulb')`,
      `X('Data Table','/table','Inserts inline Notion database table.','table')`,
      `X('Code Block','/code','Inserts syntax-highlighted code cell.','code')`,
      `X('AI Assistant','Space','Prompts Notion AI writer.','sparkles')`,
      `X('Dark Mode','Ctrl+Shift+L','Toggles dark and light mode themes.','moon')`
    ],
    dial: `{cw:X('Scroll Down','Page Down','Scrolls down long document.','player-skip-forward'),press:X('Top of Page','Home','Scrolls straight back to page top.','arrow-up'),ccw:X('Scroll Up','Page Up','Scrolls up long document.','player-skip-back')}`
  },
  {
    id: 'slack',
    title: 'Slack Team Chat',
    description: 'Workplace messaging: quick switcher Cmd+K, mute channel, @mention, threads, and huddle toggle.',
    author: 'Slack',
    hasPreview: true,
    color: '#4a154b',
    keys: [
      `X('Quick Switch','Ctrl+K','Finds channels, direct messages, files.','search')`,
      `X('Mute Channel','Ctrl+Shift+M','Mutes notifications for current channel.','bell-off')`,
      `X('Mention @','@','Opens member mention auto-complete.','at')`,
      `X('Thread Reply','T','Opens thread discussion sidebar.','message-dots')`,
      `X('Code Snippet','Ctrl+Shift+Enter','Creates code and text snippet.','code')`,
      `X('Search Slack','Ctrl+F','Searches conversation history.','search')`,
      `X('Emoji React','Ctrl+Shift+\\\\','Opens emoji reaction palette.','mood-smile')`,
      `X('Join Huddle','Ctrl+Shift+H','Toggles live team voice huddle.','headphones')`,
      `X('Set Status','Ctrl+Shift+Y','Sets working status message.','user-check')`
    ],
    dial: `{cw:X('Next Channel','Alt+Down','Jumps down to next unread channel.','player-skip-forward'),press:X('Jump Unread','Alt+Shift+Down','Jumps to newest unread message.','check'),ccw:X('Prev Channel','Alt+Up','Jumps up to previous channel.','player-skip-back')}`
  },
  {
    id: 'zoom',
    title: 'Zoom & Teams',
    description: 'Conference room command: mic mute, camera toggle, screen sharing, participants, and raise hand.',
    author: 'Zoom',
    hasPreview: true,
    color: '#2d8cff',
    keys: [
      `X('Mute Mic','Alt+A','Toggles audio microphone mute.','microphone-off')`,
      `X('Video Cam','Alt+V','Toggles webcam video on or off.','video-off')`,
      `X('Share Screen','Alt+S','Starts or stops screen broadcast.','screen-share')`,
      `X('Gallery View','Alt+F1','Switches to active speaker or gallery.','layout-grid')`,
      `X('Meeting Chat','Alt+H','Toggles in-meeting chat sidebar.','message')`,
      `X('Participants','Alt+U','Displays meeting participants list.','users')`,
      `X('Raise Hand','Alt+Y','Toggles hand raise status.','hand-stop')`,
      `X('Record Call','Alt+R','Starts local or cloud recording.','disc')`,
      `X('Leave Meeting','Alt+Q','Prompts to leave or end meeting.','phone-off')`
    ],
    dial: `{cw:X('Speaker Vol +','Volume Up','Increases meeting audio output.','volume'),press:X('Mute Mic','Alt+A','Toggles meeting microphone.','microphone-off'),ccw:X('Speaker Vol -','Volume Down','Lowers meeting audio output.','volume-off')}`
  },

  // ==========================================
  // STREAMING & DAILY ESSENTIALS
  // ==========================================
  {
    id: 'obs',
    title: 'OBS Studio',
    description: 'Live streaming control: scenes, start stream, record, screenshot, and audio gain on the dial.',
    author: 'OBS Project',
    hasPreview: true,
    color: '#2a2e33',
    keys: [
      `X('Start Stream','Ctrl+F1','Starts live broadcast stream.','wifi')`,
      `X('Record Call','Ctrl+F2','Toggles video recording to disk.','disc')`,
      `X('Scene 1','Ctrl+Shift+1','Switches to Main Gameplay scene.','device-desktop')`,
      `X('Scene 2','Ctrl+Shift+2','Switches to Full Camera scene.','video')`,
      `X('Scene 3','Ctrl+Shift+3','Switches to Intermission scene.','presentation')`,
      `X('Screenshot','Win+Shift+S','Captures screen snapshot.','camera')`,
      `X('Studio Mode','Ctrl+Shift+S','Toggles OBS Studio mode preview.','layout-columns')`,
      `X('Mute Audio','Ctrl+Shift+D','Mutes desktop audio output.','volume-off')`,
      `X('Virtual Cam','Ctrl+Shift+V','Toggles virtual webcam output.','video')`
    ],
    dial: `{cw:X('Volume Up','Volume Up','Raises monitor volume.','volume'),press:X('Audio Mute','Media Mute','Toggles audio mute.','volume-off'),ccw:X('Volume Down','Volume Down','Lowers monitor volume.','volume-off')}`
  },
  {
    id: 'discord',
    title: 'Discord',
    description: 'Voice chat & gaming: mute mic, deafen, screen share, push to talk, and server switching on the dial.',
    author: 'Discord',
    hasPreview: true,
    color: '#5865f2',
    keys: [
      `X('Mute Mic','Ctrl+Shift+M','Toggles microphone mute.','microphone-off')`,
      `X('Deafen','Ctrl+Shift+D','Deafens audio output.','headphones-off')`,
      `X('Screen Share','Ctrl+Shift+S','Toggles screen share stream.','screen-share')`,
      `X('Quick Switch','Ctrl+K','Opens search & channel switcher.','search')`,
      `X('Toggle Video','Ctrl+Shift+V','Toggles webcam on/off.','video-off')`,
      `X('Emoji Picker','Ctrl+E','Opens emoji and gif selector.','mood-smile')`,
      `X('Search','Ctrl+F','Searches channel messages.','search')`,
      `X('Settings','Ctrl+,','Opens Discord user settings.','settings')`,
      `X('Push to Talk','Ctrl','Activates push to talk voice.','microphone')`
    ],
    dial: `{cw:X('Next Server','Alt+Down','Jumps to next server down.','player-skip-forward'),press:X('Mute Mic','Ctrl+Shift+M','Toggles mic mute.','microphone-off'),ccw:X('Prev Server','Alt+Up','Jumps to previous server up.','player-skip-back')}`
  },
  {
    id: 'spotify',
    title: 'Spotify',
    description: 'Music playback & queues: play, skip, shuffle, like song, and master audio gain on the dial.',
    author: 'Spotify',
    hasPreview: true,
    color: '#1db954',
    keys: [
      `X('Play / Pause','Space','Toggles music playback.','player-play')`,
      `X('Next Track','Ctrl+Right','Skips to next song.','player-skip-forward')`,
      `X('Prev Track','Ctrl+Left','Returns to previous song.','player-skip-back')`,
      `X('Like Song','Alt+Shift+B','Saves song to library.','heart')`,
      `X('Shuffle','Ctrl+S','Toggles shuffle mode.','arrows-split')`,
      `X('Repeat','Ctrl+R','Toggles repeat mode.','refresh')`,
      `X('Search','Ctrl+L','Focuses Spotify search bar.','search')`,
      `X('Queue','Ctrl+Q','Opens upcoming play queue.','list')`,
      `X('Mute Audio','Ctrl+Down','Mutes Spotify volume.','volume-off')`
    ],
    dial: `{cw:X('Volume Up','Volume Up','Increases volume.','volume'),press:X('Play / Pause','Media Play / Pause','Plays or pauses.','player-play'),ccw:X('Volume Down','Volume Down','Decreases volume.','volume-off')}`
  },
  {
    id: 'windows',
    title: 'Windows Power',
    description: 'Multitasking essentials: quick link, task manager, snip, virtual desktops and system volume on the dial.',
    author: 'Microsoft',
    hasPreview: true,
    color: '#0078d4',
    keys: [
      `X('Quick Link','Win+X','Opens Windows Power User menu.','power')`,
      `X('Task Manager','Ctrl+Shift+Esc','Opens Task Manager.','gauge')`,
      `X('Screen Snip','Win+Shift+S','Opens Snipping Tool.','camera')`,
      `X('File Explorer','Win+E','Opens File Explorer.','folder')`,
      `X('Run Dialog','Win+R','Opens Windows Run dialog.','command')`,
      `X('Action Center','Win+A','Opens Quick Settings / Action Center.','settings')`,
      `X('Show Desktop','Win+D','Minimizes all windows to desktop.','home')`,
      `X('Next Desktop','Ctrl+Win+Right','Switches to next virtual desktop.','player-skip-forward')`,
      `X('Prev Desktop','Ctrl+Win+Left','Switches to previous virtual desktop.','player-skip-back')`
    ],
    dial: `{cw:X('Volume Up','Volume Up','Raises system volume.','volume'),press:X('Mute Audio','Media Mute','Toggles master audio mute.','volume-off'),ccw:X('Volume Down','Volume Down','Lowers system volume.','volume-off')}`
  },
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    description: 'Chat faster: new chats, search, copy replies and scroll with the dial.',
    author: 'OpenAI',
    hasPreview: true,
    color: '#10a37f',
    keys: [
      `X('New Chat','Mod+Shift+O','Starts a fresh conversation.','sparkles')`,
      `X('Search','Mod+K','Searches your chats and history.','search')`,
      `X('Focus Input','Shift+Esc','Jumps the cursor to the message box.','pointer')`,
      `X('Copy Reply','Mod+Shift+C','Copies the last response.','copy')`,
      `X('Copy Code','Mod+Shift+;','Copies the last code block.','code')`,
      `X('Sidebar','Mod+Shift+S','Shows or hides the chat sidebar.','layout-columns')`,
      `X('Instructions','Mod+Shift+I','Opens your custom instructions.','settings')`,
      `X('Delete Chat','Mod+Shift+Backspace','Deletes the current chat.','trash')`,
      `X('Shortcuts','Mod+/','Shows every ChatGPT shortcut.','command')`
    ],
    dial: `{cw:X('Scroll Down','Page Down','Scrolls down the conversation.','player-skip-forward'),press:X('Latest','End','Jumps to the newest message.','arrow-down'),ccw:X('Scroll Up','Page Up','Scrolls up the conversation.','player-skip-back')}`
  }
];

function generatePresetsArrayCode() {
  const items = PRESETS.map(p => {
    return `{id:\`${p.id}\`,title:\`${p.title}\`,description:\`${p.description}\`,author:\`${p.author}\`,hasPreview:!0,color:\`${p.color}\`,keys:[${p.keys.join(',')}],dial:${p.dial}}`;
  });
  return 'yd=[' + items.join(',') + ']';
}

const NEW_GET_ACTION_ICON = `function getActionIcon(name, keys) {
  let n = (name || '').toLowerCase();
  let k = (keys || '').toLowerCase();
  if (n.includes('paste')) return 'clipboard';
  if (n.includes('copy') || n.includes('duplicate')) return 'copy';
  if (n.includes('cut') || n.includes('razor') || n.includes('blade') || n.includes('split')) return 'scissors';
  if (n.includes('screenshot') || n.includes('capture') || n.includes('snapshot') || n.includes('photo')) return 'camera';
  if (n.includes('video-off') || n.includes('mute video')) return 'video-off';
  if (n.includes('video') || n.includes('webcam') || n.includes('cam')) return 'video';
  if (n.includes('crop')) return 'crop';
  if (n.includes('brush') || n.includes('paint') || n.includes('draw')) return 'brush';
  if (n.includes('palette') || n.includes('color')) return 'palette';
  if (n.includes('save') || n.includes('disk') || n.includes('export')) return 'device-floppy';
  if (n.includes('download') || n.includes('fetch') || n.includes('pull')) return 'download';
  if (n.includes('upload') || n.includes('push') || n.includes('publish')) return 'upload';
  if (n.includes('delete') || n.includes('trash') || n.includes('remove') || n.includes('clear') || n.includes('bin')) return 'trash';
  if (n.includes('undo') || n.includes('revert')) return 'arrow-back-up';
  if (n.includes('redo') || n.includes('repeat')) return 'arrow-forward-up';
  if (n.includes('deafen') || n.includes('headphone-off')) return 'headphones-off';
  if (n.includes('headphone') || n.includes('headset') || n.includes('huddle')) return 'headphones';
  if (n.includes('mute mic') || n.includes('mic mute') || n.includes('unmute mic')) return 'microphone-off';
  if (n.includes('mute') || n.includes('silence')) return 'volume-off';
  if (n.includes('volume') || n.includes('audio') || n.includes('sound')) return 'volume';
  if (n.includes('mic') || n.includes('voice') || n.includes('record')) return 'microphone';
  if (n.includes('skip') || n.includes('next track') || n.includes('forward')) return 'player-skip-forward';
  if (n.includes('prev track') || n.includes('previous') || n.includes('back')) return 'player-skip-back';
  if (n.includes('setting') || n.includes('config') || n.includes('preference')) return 'settings';
  if (n.includes('search') || n.includes('find') || n.includes('lookup') || n.includes('query')) return 'search';
  if (n.includes('mail') || n.includes('email') || n.includes('inbox')) return 'mail';
  if (n.includes('calendar') || n.includes('schedule') || n.includes('date')) return 'calendar';
  if (n.includes('browser') || n.includes('web') || n.includes('url') || n.includes('internet') || n.includes('link')) return 'world';
  if (n.includes('explorer') || n.includes('folder') || n.includes('directory')) return 'folder';
  if (n.includes('file') || n.includes('doc') || n.includes('page')) return 'file-text';
  if (n.includes('chat') || n.includes('message') || n.includes('reply') || n.includes('comment')) return 'message';
  if (n.includes('branch')) return 'git-branch';
  if (n.includes('commit')) return 'git-commit';
  if (n.includes('merge') || n.includes('pr') || n.includes('pull request')) return 'git-pull-request';
  if (n.includes('diff') || n.includes('compare')) return 'git-compare';
  if (n.includes('format')) return 'wand';
  if (n.includes('code') || n.includes('bracket') || n.includes('syntax')) return 'code';
  if (n.includes('terminal') || n.includes('command') || n.includes('cmd') || n.includes('shell') || n.includes('console')) return 'terminal-2';
  if (n.includes('game') || n.includes('controller') || n.includes('joystick')) return 'device-gamepad';
  if (n.includes('power') || n.includes('shutdown') || n.includes('sleep') || n.includes('restart')) return 'power';
  if (n.includes('home') || n.includes('desktop') || n.includes('start')) return 'home';
  if (n.includes('check') || n.includes('done') || n.includes('task')) return 'check';
  if (n.includes('slider') || n.includes('tuning') || n.includes('levels') || n.includes('adjust')) return 'adjustments-horizontal';
  if (n.includes('share') || n.includes('screen share')) return 'screen-share';
  if (n.includes('monitor') || n.includes('screen') || n.includes('display')) return 'device-desktop';
  if (n.includes('zoom in') || n.includes('fit') || n.includes('maximize')) return 'maximize';
  if (n.includes('zoom out') || n.includes('minimize')) return 'minimize';
  if (n.includes('refresh') || n.includes('reload') || n.includes('sync')) return 'refresh';
  if (n.includes('layer') || n.includes('component') || n.includes('group') || n.includes('frame')) return 'layers-intersect';
  if (n.includes('text') || n.includes('type') || n.includes('font')) return 'typography';
  if (n.includes('bold')) return 'bold';
  if (n.includes('italic')) return 'italic';
  if (n.includes('heading')) return 'heading';
  if (n.includes('table')) return 'table';
  if (n.includes('chart') || n.includes('graph')) return 'chart-bar';
  if (n.includes('filter')) return 'filter';
  if (n.includes('sum')) return 'sum';
  if (n.includes('present') || n.includes('slide')) return 'presentation';
  if (n.includes('emoji') || n.includes('smile') || n.includes('react')) return 'mood-smile';
  if (n.includes('participant') || n.includes('user') || n.includes('people')) return 'users';
  if (n.includes('hand') || n.includes('raise hand')) return 'hand-stop';
  if (n.includes('play') || n.includes('pause') || n.includes('media')) return 'player-play';
  if (n.includes('lock') || n.includes('protect')) return 'lock';
  if (n.includes('bell') || n.includes('alert') || n.includes('notify')) return 'bell';
  if (n.includes('bookmark') || n.includes('tag') || n.includes('pin')) return 'bookmark';
  if (n.includes('sun') || n.includes('bright') || n.includes('light')) return 'sun';
  if (n.includes('disc') || n.includes('stream') || n.includes('obs')) return 'disc';
  if (n.includes('wifi') || n.includes('network')) return 'wifi';
  if (n.includes('bluetooth')) return 'bluetooth';
  if (n.includes('star') || n.includes('rate')) return 'star';
  if (n.includes('heart') || n.includes('love') || n.includes('like')) return 'heart';
  if (n.includes('prompt') || n.includes('ai') || n.includes('smart') || n.includes('auto') || n.includes('instruction')) return 'sparkles';
  return 'bolt';
}`;

const NEW_ED = `function Ed(e, t) {
  let n = JSON.parse(JSON.stringify(_d)), r = [], i = [], smarts = [];
  bd.forEach((a, o) => {
    let s = e.keys[o], c = \`preset-\${e.id}-\${a}\`;
    let icon = s.iconId || getActionIcon(s.name, s.keys || (s.multi ? s.multi.onTap : ''));
    if (s.multi) {
      let rTap = wd(s.multi.onTap, t), rDouble = s.multi.doubleTap ? wd(s.multi.doubleTap, t) : '',
          l = \`\${s.name} (onTap: \${rTap}\${rDouble ? \`, doubleTap: \${rDouble}\` : ''})\`;
      let actObj = { id: c, main: s.name, listLabel: l, macropadLabel: xd[s.name] ?? s.name, iconId: icon, actionType: 'Multi-step action' };
      i.push(actObj);
      n[a] = { label: xd[s.name] ?? s.name, actionType: 'Multi-step action', binding: l, color: e.color, iconId: icon, actionId: c };
    } else if (Td(s.keys)) {
      let kFormatted = wd(s.keys, t);
      let l = \`\${s.name} (\${kFormatted})\`;
      let isSmart = (s.name || '').toLowerCase().includes('prompt') || (s.name || '').toLowerCase().includes('ai') || (s.name || '').toLowerCase().includes('instruction') || (s.name || '').toLowerCase().includes('custom instructions');
      let actObj = { id: c, main: s.name, listLabel: l, macropadLabel: xd[s.name] ?? s.name, iconId: icon, actionType: isSmart ? 'Smart Action' : 'Shortcut' };
      if (isSmart) {
        smarts.push(actObj);
        n[a] = { label: xd[s.name] ?? s.name, actionType: 'Smart Action', binding: l, color: e.color, iconId: icon, actionId: c };
      } else {
        r.push(actObj);
        n[a] = { label: xd[s.name] ?? s.name, actionType: 'Shortcut', binding: l, color: e.color, iconId: icon, actionId: c };
      }
    } else {
      let singleLabel = s.keys.length <= 3 ? s.keys.toUpperCase() : s.keys;
      n[a] = { label: singleLabel, actionType: 'Basic input', binding: \`\${s.name} (\${s.keys})\`, color: e.color, iconId: icon, actionId: c };
    }
  });
  let aDial = item => ({ label: Cd(item.name), binding: \`\${item.name} (\${wd(item.keys, t)})\` });
  n['dial-tl'] = {
    label: e.title,
    actionType: 'Shortcut',
    binding: \`\${e.title} Dial\`,
    encoderActions: { cw: aDial(e.dial.cw), press: aDial(e.dial.press), ccw: aDial(e.dial.ccw) }
  };
  return { layer: n, actions: r, multis: i, smarts: smarts };
}`;

// Genuine official brand badges for all 27 apps
const NEW_BD = `function Bd({id:e}){switch(e){
case\`chatgpt\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#10a37f] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(16,163,127,0.35)]\`,children:(0,B.jsx)(\`svg\`,{width:\`18\`,height:\`18\`,viewBox:\`0 0 24 24\`,fill:\`none\`,stroke:\`white\`,strokeWidth:\`1.8\`,strokeLinecap:\`round\`,strokeLinejoin:\`round\`,children:(0,B.jsx)(\`path\`,{d:\`M11.217 19.384a3.501 3.501 0 0 0 6.783 -1.217v-5.167l-6 -3.35 M5.214 15.014a3.501 3.501 0 0 0 4.446 5.266l4.34 -2.534v-6.946 M6 7.63c-1.391 -.236 -2.787 .395 -3.534 1.689a3.474 3.474 0 0 0 1.271 4.745l4.263 2.514l6 -3.348 M12.783 4.616a3.501 3.501 0 0 0 -6.783 1.217v5.067l6 3.45 M18.786 8.986a3.501 3.501 0 0 0 -4.446 -5.266l-4.34 2.534v6.946 M18 16.302c1.391 .236 2.787 -.395 3.534 -1.689a3.474 3.474 0 0 0 -1.271 -4.745l-4.308 -2.514l-5.955 3.42\`})})});
case\`vscode\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#007acc] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,122,204,0.35)]\`,children:(0,B.jsx)(\`svg\`,{width:\`18\`,height:\`18\`,viewBox:\`0 0 24 24\`,fill:\`none\`,stroke:\`white\`,strokeWidth:\`2\`,strokeLinecap:\`round\`,strokeLinejoin:\`round\`,children:(0,B.jsx)(\`path\`,{d:\`M16 3v18l4 -2.5v-13l-4 -2.5 M9.165 13.903l-4.165 3.597l-2 -1l4.333 -4.5m1.735 -1.802l6.932 -7.198v5l-4.795 4.141 M16 16.5l-11 -10l-2 1l13 13.5\`})})});
case\`github\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#181717] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.35)]\`,children:(0,B.jsx)(\`svg\`,{width:\`18\`,height:\`18\`,viewBox:\`0 0 24 24\`,fill:\`white\`,children:(0,B.jsx)(\`path\`,{d:\`M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12\`})})});
case\`terminal\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#18181b] border border-[#27272a] flex items-center justify-center shrink-0\`,children:(0,B.jsx)(\`span\`,{className:\`font-mono text-[#22c55e] font-bold text-[13px] tracking-tight leading-none\`,children:\`>_\`})});
case\`docker\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#2496ed] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(36,150,237,0.35)]\`,children:(0,B.jsx)(\`svg\`,{width:\`20\`,height:\`16\`,viewBox:\`0 0 24 24\`,fill:\`white\`,children:(0,B.jsx)(\`path\`,{d:\`M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z\`})})});
case\`chrome_devtools\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-white flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.12)]\`,children:(0,B.jsxs)(\`svg\`,{width:\`18\`,height:\`18\`,viewBox:\`0 0 24 24\`,children:[(0,B.jsx)(\`circle\`,{cx:\`12\`,cy:\`12\`,r:\`10\`,fill:\`#4285F4\`}),(0,B.jsx)(\`circle\`,{cx:\`12\`,cy:\`12\`,r:\`8\`,fill:\`#EA4335\`}),(0,B.jsx)(\`circle\`,{cx:\`12\`,cy:\`12\`,r:\`5.5\`,fill:\`#FBBC05\`}),(0,B.jsx)(\`circle\`,{cx:\`12\`,cy:\`12\`,r:\`3.8\`,fill:\`#34A853\`}),(0,B.jsx)(\`circle\`,{cx:\`12\`,cy:\`12\`,r:\`2.2\`,fill:\`white\`})]})});
case\`excel\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#107c41] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(16,124,65,0.35)]\`,children:(0,B.jsx)(\`span\`,{className:\`text-white font-extrabold text-[15px] font-sans tracking-tight\`,children:\`X\`})});
case\`word\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#185abd] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(24,90,189,0.35)]\`,children:(0,B.jsx)(\`span\`,{className:\`text-white font-extrabold text-[15px] font-sans tracking-tight\`,children:\`W\`})});
case\`powerpoint\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#c43e1c] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(196,62,28,0.35)]\`,children:(0,B.jsx)(\`span\`,{className:\`text-white font-extrabold text-[15px] font-sans tracking-tight\`,children:\`P\`})});
case\`notion\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-white border border-[#e5e5e5] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.08)]\`,children:(0,B.jsx)(\`svg\`,{width:\`17\`,height:\`17\`,viewBox:\`0 0 24 24\`,fill:\`#000000\`,children:(0,B.jsx)(\`path\`,{d:\`M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z\`})})});
case\`slack\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#4a154b] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(74,21,75,0.35)]\`,children:(0,B.jsx)(\`svg\`,{width:\`18\`,height:\`18\`,viewBox:\`0 0 24 24\`,fill:\`none\`,stroke:\`white\`,strokeWidth:\`2.2\`,strokeLinecap:\`round\`,strokeLinejoin:\`round\`,children:(0,B.jsx)(\`path\`,{d:\`M12 12v-6a2 2 0 0 1 4 0v6m0 -2a2 2 0 1 1 2 2h-6 M12 12h6a2 2 0 0 1 0 4h-6m2 0a2 2 0 1 1 -2 2v-6 M12 12v6a2 2 0 0 1 -4 0v-6m0 2a2 2 0 1 1 -2 -2h6 M12 12h-6a2 2 0 0 1 0 -4h6m-2 0a2 2 0 1 1 2 -2v6\`})})});
case\`zoom\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#2d8cff] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(45,140,255,0.35)]\`,children:(0,B.jsx)(\`svg\`,{width:\`18\`,height:\`18\`,viewBox:\`0 0 24 24\`,fill:\`white\`,children:(0,B.jsx)(\`path\`,{d:\`M4 6.5A2.5 2.5 0 0 1 6.5 4h8A2.5 2.5 0 0 1 17 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 4 17.5v-11zM18.5 8.789l3.658-2.613A1 1 0 0 1 23.7 7v10a1 1 0 0 1-1.542.824L18.5 15.21V8.79z\`})})});
case\`obs\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#1a1a1a] border border-[#333] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.3)]\`,children:(0,B.jsx)(\`svg\`,{width:\`18\`,height:\`18\`,viewBox:\`0 0 24 24\`,fill:\`white\`,children:(0,B.jsx)(\`path\`,{d:\`M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.3 14.5c-1.3.8-2.8 1.1-4.3.7-1.1-.3-2-.9-2.7-1.8l2.6-1.5c.4.4.9.7 1.4.8.9.2 1.8 0 2.5-.5.8-.6 1.2-1.5 1.2-2.5 0-.4-.1-.7-.2-1.1l2.6-1.5c.5 1 .7 2.1.6 3.2-.1 1.6-.9 3-2.1 3.9l-1.6.3zm-6.6-5c0-.9.3-1.8.8-2.5.6-.8 1.5-1.2 2.5-1.2.4 0 .7.1 1.1.2l1.5-2.6c-1-.5-2.1-.7-3.2-.6-1.6.1-3 .9-3.9 2.1-.8 1.3-1.1 2.8-.7 4.3.3 1.1.9 2 1.8 2.7l1.5-2.6c-.4-.4-.7-.9-.8-1.4-.1-.3-.1-.6-.1-.9zm7.3-1.5c-.4-.4-.9-.7-1.4-.8-.9-.2-1.8 0-2.5.5-.8.6-1.2 1.5-1.2 2.5 0 .4.1.7.2 1.1l-2.6 1.5c-.5-1-.7-2.1-.6-3.2.1-1.6.9-3 2.1-3.9.8-.6 1.8-.9 2.8-.9 1.1 0 2.2.4 3.1 1.2l-1.5 2.6z\`})})});
case\`discord\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#5865f2] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(88,101,242,0.35)]\`,children:(0,B.jsx)(\`svg\`,{width:\`19\`,height:\`15\`,viewBox:\`0 0 24 24\`,fill:\`white\`,children:(0,B.jsx)(\`path\`,{d:\`M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z\`})})});
case\`spotify\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#1db954] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(29,185,84,0.35)]\`,children:(0,B.jsx)(\`svg\`,{width:\`18\`,height:\`18\`,viewBox:\`0 0 24 24\`,fill:\`#000000\`,children:(0,B.jsx)(\`path\`,{d:\`M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z\`})})});
case\`windows\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#0078d4] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,120,212,0.35)]\`,children:(0,B.jsx)(\`svg\`,{width:\`16\`,height:\`16\`,viewBox:\`0 0 24 24\`,fill:\`white\`,children:(0,B.jsx)(\`path\`,{d:\`M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801\`})})});
case\`aftereffects\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#00005b] border border-[#2b005e] flex items-center justify-center shrink-0\`,children:(0,B.jsx)(\`span\`,{className:\`text-[#d291ff] font-bold text-[13px] tracking-tight\`,children:\`Ae\`})});
case\`canva\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-gradient-to-tr from-[#00c4cc] to-[#7d2ae8] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,196,204,0.35)]\`,children:(0,B.jsx)(\`span\`,{className:\`text-white font-serif font-black italic text-[16px] leading-none\`,children:\`C\`})});
case\`audacity\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#1a1f3c] border border-[#283266] flex items-center justify-center shrink-0\`,children:(0,B.jsxs)(\`svg\`,{width:\`18\`,height:\`18\`,viewBox:\`0 0 24 24\`,fill:\`none\`,stroke:\`#facc15\`,strokeWidth:\`2\`,strokeLinecap:\`round\`,strokeLinejoin:\`round\`,children:[(0,B.jsx)(\`path\`,{d:\`M4 14v-3a8 8 0 1 1 16 0v3\`}),(0,B.jsx)(\`path\`,{d:\`M18 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM4 14h3v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z\`}),(0,B.jsx)(\`path\`,{d:\`M9 12v3M12 9v9M15 11v5\`,stroke:\`#38bdf8\`,strokeWidth:\`1.8\`})]})});
case\`framer\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-gradient-to-b from-[#25b8ff] to-[#0055ff] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,85,255,0.35)]\`,children:(0,B.jsx)(\`svg\`,{width:\`14\`,height:\`18\`,viewBox:\`0 0 14 20\`,fill:\`white\`,children:(0,B.jsx)(\`path\`,{d:\`M1 1H13V7H7L1 1ZM1 7H7L13 13H1V7ZM1 13H7V19L1 13Z\`})})});
case\`figma\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#1e1e1e] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.3)]\`,children:(0,B.jsxs)(\`svg\`,{width:\`13\`,height:\`19\`,viewBox:\`0 0 14 21\`,fill:\`none\`,children:[(0,B.jsx)(\`path\`,{d:\`M3.5 21C5.43 21 7 19.43 7 17.5V14H3.5C1.57 14 0 15.57 0 17.5C0 19.43 1.57 21 3.5 21Z\`,fill:\`#0ACF83\`}),(0,B.jsx)(\`path\`,{d:\`M0 10.5C0 8.57 1.57 7 3.5 7H7V14H3.5C1.57 14 0 12.43 0 10.5Z\`,fill:\`#A259FF\`}),(0,B.jsx)(\`path\`,{d:\`M0 3.5C0 1.57 1.57 0 3.5 0H7V7H3.5C1.57 7 0 5.43 0 3.5Z\`,fill:\`#F24E1E\`}),(0,B.jsx)(\`path\`,{d:\`M7 0H10.5C12.43 0 14 1.57 14 3.5C14 5.43 12.43 7 10.5 7H7V0Z\`,fill:\`#FF7262\`}),(0,B.jsx)(\`path\`,{d:\`M14 10.5C14 12.43 12.43 14 10.5 14C8.57 14 7 12.43 7 10.5C7 8.57 8.57 7 10.5 7C12.43 7 14 8.57 14 10.5Z\`,fill:\`#1ABCFE\`})]})});
case\`illustrator\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#330000] flex items-center justify-center shrink-0\`,children:(0,B.jsx)(\`span\`,{className:\`text-[#ff9a00] font-bold text-[13px] tracking-tight\`,children:\`Ai\`})});
case\`photoshop\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#001e36] flex items-center justify-center shrink-0\`,children:(0,B.jsx)(\`span\`,{className:\`text-[#31a8ff] font-bold text-[13px] tracking-tight\`,children:\`Ps\`})});
case\`premiere\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#00005b] flex items-center justify-center shrink-0\`,children:(0,B.jsx)(\`span\`,{className:\`text-[#9999ff] font-bold text-[13px] tracking-tight\`,children:\`Pr\`})});
case\`blender\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#232323] flex items-center justify-center shrink-0\`,children:(0,B.jsxs)(\`svg\`,{width:\`20\`,height:\`17\`,viewBox:\`0 0 24 20\`,fill:\`none\`,children:[(0,B.jsx)(\`path\`,{d:\`M9.5 3.5L16.5 7.5M5 9.5H15.5M14.5 13.5C14.5 16.26 12.04 18.5 9 18.5C5.96 18.5 3.5 16.26 3.5 13.5C3.5 10.74 5.96 8.5 9 8.5C12.04 8.5 14.5 10.74 14.5 13.5Z\`,stroke:\`#f5792a\`,strokeWidth:\`2.3\`,strokeLinecap:\`round\`}),(0,B.jsx)(\`circle\`,{cx:\`9\`,cy:\`13.5\`,r:\`2.4\`,fill:\`#2685e8\`})]})});
case\`davinci\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#1b2028] flex items-center justify-center shrink-0\`,children:(0,B.jsxs)(\`svg\`,{width:\`20\`,height:\`20\`,viewBox:\`0 0 24 24\`,fill:\`none\`,children:[(0,B.jsx)(\`circle\`,{cx:\`12\`,cy:\`7.5\`,r:\`4\`,stroke:\`#29b6f6\`,strokeWidth:\`2.2\`}),(0,B.jsx)(\`circle\`,{cx:\`8.2\`,cy:\`14.5\`,r:\`4\`,stroke:\`#ffca28\`,strokeWidth:\`2.2\`}),(0,B.jsx)(\`circle\`,{cx:\`15.8\`,cy:\`14.5\`,r:\`4\`,stroke:\`#ef5350\`,strokeWidth:\`2.2\`})]})});
case\`affinity\`:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#75d957] flex items-center justify-center shrink-0\`,children:(0,B.jsx)(\`span\`,{className:\`text-[#111111] font-extrabold text-[19px] leading-none -mt-0.5\`,children:\`a\`})});
default:return(0,B.jsx)(\`div\`,{className:\`w-[30px] h-[30px] rounded-[7px] bg-[#222222] flex items-center justify-center shrink-0 text-white\`,children:(0,B.jsx)(Kd,{id:\`sparkles\`,size:16})})}}`;

// Execute patching on index.html
let html = fs.readFileSync('index.html', 'utf8');

// 1. Replace X declaration
const xOldStart = html.indexOf('X=(e,t,n)=>({name:e,keys:t,desc:n})');
if (xOldStart === -1) throw new Error('Could not find old X declaration');
const xOldEnd = html.indexOf(',yd=[', xOldStart);
html = html.slice(0, xOldStart) + NEW_X + html.slice(xOldEnd);
console.log('Replaced X & vd helper functions');

// 2. Replace yd array
const ydStart = html.indexOf('yd=[');
if (ydStart === -1) throw new Error('Could not find yd=[');
const ydEnd = html.indexOf('],bd=', ydStart) + 1;
const newYdCode = generatePresetsArrayCode();
html = html.slice(0, ydStart) + newYdCode + html.slice(ydEnd);
console.log('Replaced yd array with ' + PRESETS.length + ' professional presets');

// 3. Replace getActionIcon
const gaiStart = html.indexOf('function getActionIcon(name, keys) {');
if (gaiStart === -1) throw new Error('Could not find getActionIcon');
const gaiEnd = html.indexOf('var Td = e => {', gaiStart);
html = html.slice(0, gaiStart) + NEW_GET_ACTION_ICON + '\n' + html.slice(gaiEnd);
console.log('Replaced getActionIcon with comprehensive Tabler keymappings');

// 4. Replace Ed
const edStart = html.indexOf('function Ed(e, t) {');
if (edStart === -1) throw new Error('Could not find function Ed');
const edEnd = html.indexOf('var Dd=[{id:', edStart);
if (edEnd === -1) throw new Error('Could not find var Dd=[{id: after function Ed');
html = html.slice(0, edStart) + NEW_ED + '\n' + html.slice(edEnd);
console.log('Replaced function Ed with iconId propagation');

// 5. Replace Bd component in line 318
const bdStart = html.indexOf('function Bd({id:e}){switch(e){');
if (bdStart === -1) throw new Error('Could not find function Bd({id:e})');
const bdEnd = html.indexOf('function Vd(', bdStart);
html = html.slice(0, bdStart) + NEW_BD + html.slice(bdEnd);
console.log('Replaced function Bd with official app logos for all 27 apps');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html!');
