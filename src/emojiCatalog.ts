// Record actual module evaluation for packaged-app lazy-load diagnostics.
if (typeof performance !== 'undefined') performance.mark?.('node:emoji-catalog-module-loaded');

export interface EmojiCatalogEntry { emoji: string; keywords: string }

export const SELECTABLE_EMOJI_LIST: EmojiCatalogEntry[] = [
  {
    "emoji": "😀",
    "keywords": "grinning face happy smile"
  },
  {
    "emoji": "😃",
    "keywords": "smiley face happy open"
  },
  {
    "emoji": "😄",
    "keywords": "smile laugh joy"
  },
  {
    "emoji": "😁",
    "keywords": "beam grin toothy"
  },
  {
    "emoji": "😆",
    "keywords": "laugh squint haha"
  },
  {
    "emoji": "😅",
    "keywords": "sweat smile relief phew"
  },
  {
    "emoji": "🤣",
    "keywords": "rofl rolling laughing funny"
  },
  {
    "emoji": "😂",
    "keywords": "joy tears cry laughing"
  },
  {
    "emoji": "🙂",
    "keywords": "slightly smiling gentle"
  },
  {
    "emoji": "🙃",
    "keywords": "upside down silly sarcastic"
  },
  {
    "emoji": "😉",
    "keywords": "wink flirt joke"
  },
  {
    "emoji": "😊",
    "keywords": "blush happy warm"
  },
  {
    "emoji": "😇",
    "keywords": "innocent halo angel holy"
  },
  {
    "emoji": "🥰",
    "keywords": "love hearts adore fond"
  },
  {
    "emoji": "😍",
    "keywords": "heart eyes crush adore"
  },
  {
    "emoji": "🤩",
    "keywords": "star struck excited amazed"
  },
  {
    "emoji": "😘",
    "keywords": "kiss blow love heart"
  },
  {
    "emoji": "😗",
    "keywords": "kissing whistle gentle"
  },
  {
    "emoji": "😚",
    "keywords": "kissing closed eyes warm"
  },
  {
    "emoji": "😙",
    "keywords": "kissing smile gentle"
  },
  {
    "emoji": "😋",
    "keywords": "yum delicious food tasty"
  },
  {
    "emoji": "😛",
    "keywords": "tongue silly playful"
  },
  {
    "emoji": "😜",
    "keywords": "wink tongue wacky joke"
  },
  {
    "emoji": "🤪",
    "keywords": "zany crazy wild derp"
  },
  {
    "emoji": "😝",
    "keywords": "squint tongue goof prank"
  },
  {
    "emoji": "🤑",
    "keywords": "money face cash rich dollar"
  },
  {
    "emoji": "🤗",
    "keywords": "hugs open hands embrace"
  },
  {
    "emoji": "🤭",
    "keywords": "giggle oops secret teehee"
  },
  {
    "emoji": "🤫",
    "keywords": "shh quiet silence secret"
  },
  {
    "emoji": "🤔",
    "keywords": "thinking hmm ponder wonder"
  },
  {
    "emoji": "🤐",
    "keywords": "zipper mouth secret quiet"
  },
  {
    "emoji": "🤨",
    "keywords": "raised eyebrow sus skeptical"
  },
  {
    "emoji": "😐",
    "keywords": "neutral poker face flat"
  },
  {
    "emoji": "😑",
    "keywords": "expressionless blank unimpressed"
  },
  {
    "emoji": "😶",
    "keywords": "no mouth silent muted"
  },
  {
    "emoji": "😏",
    "keywords": "smirk cool sly ironic"
  },
  {
    "emoji": "😒",
    "keywords": "unamused side eye bored"
  },
  {
    "emoji": "🙄",
    "keywords": "eye roll whatever duh"
  },
  {
    "emoji": "😬",
    "keywords": "grimace awkward yikes oof"
  },
  {
    "emoji": "🤥",
    "keywords": "lying pinocchio fake deceit"
  },
  {
    "emoji": "😌",
    "keywords": "relieved calm zen peace"
  },
  {
    "emoji": "😔",
    "keywords": "pensive sad wistful"
  },
  {
    "emoji": "😪",
    "keywords": "sleepy snot tired doze"
  },
  {
    "emoji": "🤤",
    "keywords": "drooling hungry desire"
  },
  {
    "emoji": "😴",
    "keywords": "sleeping zzz bed rest"
  },
  {
    "emoji": "😷",
    "keywords": "mask sick covid doctor"
  },
  {
    "emoji": "🤒",
    "keywords": "thermometer ill fever flu"
  },
  {
    "emoji": "🤕",
    "keywords": "bandage hurt head injury"
  },
  {
    "emoji": "🤢",
    "keywords": "nauseated sick gross disgust"
  },
  {
    "emoji": "🤮",
    "keywords": "vomit puke sick disgust"
  },
  {
    "emoji": "🥵",
    "keywords": "hot sweating red heat fever"
  },
  {
    "emoji": "🥶",
    "keywords": "cold freezing blue ice chill"
  },
  {
    "emoji": "🥴",
    "keywords": "woozy drunk dizzy tipsy"
  },
  {
    "emoji": "😵",
    "keywords": "dizzy knocked out shock"
  },
  {
    "emoji": "🤯",
    "keywords": "mind blown explosion shock"
  },
  {
    "emoji": "🤠",
    "keywords": "cowboy hat western yeehaw"
  },
  {
    "emoji": "🥳",
    "keywords": "party celebration confetti hat"
  },
  {
    "emoji": "😎",
    "keywords": "sunglasses cool boss chill"
  },
  {
    "emoji": "🤓",
    "keywords": "nerd glasses smart geek"
  },
  {
    "emoji": "🧐",
    "keywords": "monocle classy inspect clue"
  },
  {
    "emoji": "😕",
    "keywords": "confused puzzled shrug"
  },
  {
    "emoji": "😟",
    "keywords": "worried anxious concern"
  },
  {
    "emoji": "🙁",
    "keywords": "slightly frowning sad unhappy"
  },
  {
    "emoji": "😮",
    "keywords": "open mouth surprise gasp wow"
  },
  {
    "emoji": "😯",
    "keywords": "hushed surprise quiet shock"
  },
  {
    "emoji": "😲",
    "keywords": "astonished shocked amazed"
  },
  {
    "emoji": "😳",
    "keywords": "flushed embarrassed blush red"
  },
  {
    "emoji": "🥺",
    "keywords": "pleading puppy eyes please beg"
  },
  {
    "emoji": "😦",
    "keywords": "frowning open mouth dismay"
  },
  {
    "emoji": "😧",
    "keywords": "anguished shocked scared"
  },
  {
    "emoji": "😨",
    "keywords": "fearful scared worried dread"
  },
  {
    "emoji": "😰",
    "keywords": "anxious blue sweat stress panicking"
  },
  {
    "emoji": "😥",
    "keywords": "sad relieved sweat sigh"
  },
  {
    "emoji": "😢",
    "keywords": "crying tear sad weep"
  },
  {
    "emoji": "😭",
    "keywords": "loudly crying sobbing weeping tear"
  },
  {
    "emoji": "😱",
    "keywords": "screaming horror fear ghost panic"
  },
  {
    "emoji": "😖",
    "keywords": "confounded frustrated stressed"
  },
  {
    "emoji": "😣",
    "keywords": "persevering struggling tough"
  },
  {
    "emoji": "😞",
    "keywords": "disappointed upset sad regret"
  },
  {
    "emoji": "😓",
    "keywords": "downcast sweat sigh exhausted"
  },
  {
    "emoji": "😩",
    "keywords": "weary tired frustrated groan"
  },
  {
    "emoji": "😫",
    "keywords": "tired exhausted fed up moan"
  },
  {
    "emoji": "🥱",
    "keywords": "yawn sleepy tired bored"
  },
  {
    "emoji": "😤",
    "keywords": "triumph steam angry huff proud"
  },
  {
    "emoji": "😡",
    "keywords": "pouting angry mad furious rage"
  },
  {
    "emoji": "😠",
    "keywords": "angry irritated mad annoyed"
  },
  {
    "emoji": "🤬",
    "keywords": "cursing swearing angry symbols rage"
  },
  {
    "emoji": "😈",
    "keywords": "devil purple evil grin mischievous"
  },
  {
    "emoji": "👿",
    "keywords": "angry devil evil demon"
  },
  {
    "emoji": "💀",
    "keywords": "skull dead skeleton death rip"
  },
  {
    "emoji": "☠️",
    "keywords": "skull crossbones danger poison pirate"
  },
  {
    "emoji": "💩",
    "keywords": "poop turd brown crap funny"
  },
  {
    "emoji": "🤡",
    "keywords": "clown circus fool joke"
  },
  {
    "emoji": "👹",
    "keywords": "ogre monster japanese demon"
  },
  {
    "emoji": "👺",
    "keywords": "goblin red mask monster"
  },
  {
    "emoji": "👻",
    "keywords": "ghost phantom spooky halloween boo"
  },
  {
    "emoji": "👽",
    "keywords": "alien ufo extraterrestrial sci-fi"
  },
  {
    "emoji": "👾",
    "keywords": "alien monster 8bit arcade pixel retro"
  },
  {
    "emoji": "🤖",
    "keywords": "robot bot automation machine droid"
  },
  {
    "emoji": "👋",
    "keywords": "wave hello bye greeting hand"
  },
  {
    "emoji": "🤚",
    "keywords": "raised back of hand stop high"
  },
  {
    "emoji": "🖐️",
    "keywords": "hand splayed fingers palm stop"
  },
  {
    "emoji": "✋",
    "keywords": "raised hand stop high five palm"
  },
  {
    "emoji": "🖖",
    "keywords": "vulcan salute spock star trek live long"
  },
  {
    "emoji": "👌",
    "keywords": "ok sign perfect good got it"
  },
  {
    "emoji": "🤌",
    "keywords": "pinched fingers italian chef kiss what"
  },
  {
    "emoji": "🤏",
    "keywords": "pinching hand tiny small little bit"
  },
  {
    "emoji": "✌️",
    "keywords": "peace victory v hand two sign"
  },
  {
    "emoji": "🤞",
    "keywords": "crossed fingers luck hope wish"
  },
  {
    "emoji": "🤟",
    "keywords": "love you gesture hand sign ilu"
  },
  {
    "emoji": "🤘",
    "keywords": "rock on horns heavy metal concert"
  },
  {
    "emoji": "🤙",
    "keywords": "call me shaka hang loose surf phone"
  },
  {
    "emoji": "👈",
    "keywords": "point left finger direction back"
  },
  {
    "emoji": "👉",
    "keywords": "point right finger direction next forward"
  },
  {
    "emoji": "👆",
    "keywords": "point up finger direction high above"
  },
  {
    "emoji": "🖕",
    "keywords": "middle finger rude insult offensive"
  },
  {
    "emoji": "👇",
    "keywords": "point down finger direction low below"
  },
  {
    "emoji": "☝️",
    "keywords": "index pointing up one first listen reminder"
  },
  {
    "emoji": "👍",
    "keywords": "thumbs up like approve good yes agree"
  },
  {
    "emoji": "👎",
    "keywords": "thumbs down dislike bad reject no disagree"
  },
  {
    "emoji": "✊",
    "keywords": "raised fist power strength solidarity punch"
  },
  {
    "emoji": "👊",
    "keywords": "oncoming fist punch bump strike brofist"
  },
  {
    "emoji": "🤛",
    "keywords": "fist left punch bump strike"
  },
  {
    "emoji": "🤜",
    "keywords": "fist right bump strike brofist"
  },
  {
    "emoji": "👏",
    "keywords": "clapping hands applause bravo congrats props"
  },
  {
    "emoji": "🙌",
    "keywords": "raising hands celebrate praise hooray yay"
  },
  {
    "emoji": "👐",
    "keywords": "open hands hug welcome jazz hands"
  },
  {
    "emoji": "🤲",
    "keywords": "palms up together open offer pray pray"
  },
  {
    "emoji": "🤝",
    "keywords": "handshake deal agree partner pact meeting"
  },
  {
    "emoji": "🙏",
    "keywords": "folded hands pray please thank you namaste bow"
  },
  {
    "emoji": "✍️",
    "keywords": "writing hand pen pencil author note draw"
  },
  {
    "emoji": "💅",
    "keywords": "nail polish beauty sassy flex care"
  },
  {
    "emoji": "🤳",
    "keywords": "selfie camera photo smartphone take picture"
  },
  {
    "emoji": "💪",
    "keywords": "flexed biceps muscle strong power fitness gym workout"
  },
  {
    "emoji": "🦾",
    "keywords": "mechanical arm bionic cyborg prosthetics strength robot"
  },
  {
    "emoji": "💻",
    "keywords": "laptop computer macbook pc screen work notebook"
  },
  {
    "emoji": "🖥️",
    "keywords": "desktop computer monitor display imac workstation"
  },
  {
    "emoji": "🖨️",
    "keywords": "printer paper office documents print copy scan"
  },
  {
    "emoji": "⌨️",
    "keywords": "keyboard type macro key switch typing mechanical"
  },
  {
    "emoji": "🖱️",
    "keywords": "mouse click cursor optical pointer scroll wheel"
  },
  {
    "emoji": "🖲️",
    "keywords": "trackball mouse control ergonomics pointer"
  },
  {
    "emoji": "💽",
    "keywords": "minidisc optical computer data storage md"
  },
  {
    "emoji": "💾",
    "keywords": "floppy disk save 3.5 backup retro storage"
  },
  {
    "emoji": "💿",
    "keywords": "optical disc cd compact disc music audio software rom"
  },
  {
    "emoji": "📀",
    "keywords": "dvd disc blu ray video media movie software optical"
  },
  {
    "emoji": "📼",
    "keywords": "videocassette vhs tape retro video analog recording"
  },
  {
    "emoji": "📷",
    "keywords": "camera photo photography snapshot picture shoot dslr"
  },
  {
    "emoji": "📸",
    "keywords": "camera flash photography snapshot photo capture picture press"
  },
  {
    "emoji": "📹",
    "keywords": "video camera camcorder recording filming broadcast film"
  },
  {
    "emoji": "🎥",
    "keywords": "movie camera cinema film director cinema production studio"
  },
  {
    "emoji": "📽️",
    "keywords": "film projector cinema movie vintage theater display"
  },
  {
    "emoji": "🎞️",
    "keywords": "film frames negative cinema movie production editing reel"
  },
  {
    "emoji": "📞",
    "keywords": "telephone telephone receiver call phone landline voice ring"
  },
  {
    "emoji": "☎️",
    "keywords": "telephone classic red vintage call voice phone ring"
  },
  {
    "emoji": "📟",
    "keywords": "pager retro beeper tech communication alert 90s vintage"
  },
  {
    "emoji": "📠",
    "keywords": "fax machine documents transmission scan office retro phone"
  },
  {
    "emoji": "📺",
    "keywords": "television tv display screen broadcast cathode retro tube crt"
  },
  {
    "emoji": "📻",
    "keywords": "radio wireless fm am music broadcast audio podcast transmission"
  },
  {
    "emoji": "🎙️",
    "keywords": "studio microphone recording podcast voice mic vocalist streaming audio"
  },
  {
    "emoji": "🎚️",
    "keywords": "level slider fader audio mixer soundboard studio mastering volume balance"
  },
  {
    "emoji": "🎛️",
    "keywords": "control knobs dial equalizer synthesizer dj synth console audio tuning"
  },
  {
    "emoji": "⏱️",
    "keywords": "stopwatch timer chronometer clock speed measure counter track interval"
  },
  {
    "emoji": "⏲️",
    "keywords": "timer clock countdown kitchen alarm chronometer tick ring interval"
  },
  {
    "emoji": "⏰",
    "keywords": "alarm clock wake up morning time alert schedule deadline reminder"
  },
  {
    "emoji": "🕰️",
    "keywords": "mantelpiece clock vintage antique time pendulum tick hour shelf"
  },
  {
    "emoji": "⌛",
    "keywords": "hourglass done time sand timer expired finish complete waiting measure"
  },
  {
    "emoji": "⏳",
    "keywords": "hourglass sand flowing running time clock loading processing patience timer"
  },
  {
    "emoji": "📡",
    "keywords": "satellite antenna dish broadcast signal network wireless space streaming comms"
  },
  {
    "emoji": "🔋",
    "keywords": "battery power energy charge full capacity level cell electric life"
  },
  {
    "emoji": "🔌",
    "keywords": "electric plug cable connector wire cord socket power charging outlet"
  },
  {
    "emoji": "💡",
    "keywords": "light bulb idea brainstorm innovation bright inspiration electric smart glow"
  },
  {
    "emoji": "🔦",
    "keywords": "flashlight torch beam search inspect night dark spotlight explore find"
  },
  {
    "emoji": "🕯️",
    "keywords": "candle flame wax light mood flame glow romantic dark burn"
  },
  {
    "emoji": "🧯",
    "keywords": "fire extinguisher safety put out flame emergency hazard fire drill alert"
  },
  {
    "emoji": "🛢️",
    "keywords": "oil drum barrel petroleum fuel crude resource tank container storage chemical"
  },
  {
    "emoji": "🎮",
    "keywords": "video game controller gamepad playstation xbox nintendo steam play arcade"
  },
  {
    "emoji": "🕹️",
    "keywords": "joystick arcade retro gaming simulator flight controller vintage arcade stick"
  },
  {
    "emoji": "👾",
    "keywords": "alien monster space invaders pixel retro 8bit game arcade vintage gamer"
  },
  {
    "emoji": "🎲",
    "keywords": "game die dice board game chance gamble luck roll tabletop dnd"
  },
  {
    "emoji": "♟️",
    "keywords": "chess pawn board game strategy tactic chess piece move checkmate play"
  },
  {
    "emoji": "🎯",
    "keywords": "bullseye dart direct hit target goal focus precision aim mark accuracy"
  },
  {
    "emoji": "🎳",
    "keywords": "bowling ball pins strike spare sports game alley roll frame"
  },
  {
    "emoji": "🎪",
    "keywords": "circus tent carnival festival fair fun event performance magic show show"
  },
  {
    "emoji": "🎨",
    "keywords": "artist palette paint drawing colors brush creative canvas design artwork design"
  },
  {
    "emoji": "🎬",
    "keywords": "clapper board film movie cinema cut action director scene take production"
  },
  {
    "emoji": "🎤",
    "keywords": "microphone singing karaoke vocal podcast voice audio stage artist speech"
  },
  {
    "emoji": "🎧",
    "keywords": "headphones audio sound listening music dj studio monitors headset podcast"
  },
  {
    "emoji": "🎼",
    "keywords": "musical score sheet music notes melody treble clef harmony composition classical"
  },
  {
    "emoji": "🎹",
    "keywords": "musical keyboard piano synth synthesizer keys midi organ acoustic chords sound"
  },
  {
    "emoji": "🥁",
    "keywords": "drum snare drumstick percussion rhythm beat groove tempo rock marching band"
  },
  {
    "emoji": "🎷",
    "keywords": "saxophone jazz brass instrument horn solo blues groove music woodwind soul"
  },
  {
    "emoji": "🎺",
    "keywords": "trumpet brass instrument horn fanfare jazz fanfare orchestra classical fanfare"
  },
  {
    "emoji": "🎸",
    "keywords": "guitar electric guitar rock metal acoustic bass solo strings riff music jam"
  },
  {
    "emoji": "🪕",
    "keywords": "banjo country folk bluegrass strings pluck instrument acoustic rhythm vintage"
  },
  {
    "emoji": "🎻",
    "keywords": "violin fiddle cello orchestra strings acoustic classical bow melody concerto"
  },
  {
    "emoji": "🎟️",
    "keywords": "admission ticket raffle movie show event cinema concert cinema entrance voucher"
  },
  {
    "emoji": "🎫",
    "keywords": "ticket pass bus train boarding movie pass concert admit access receipt voucher"
  },
  {
    "emoji": "🏆",
    "keywords": "trophy cup winner victory first place prize award achievement champion gold best"
  },
  {
    "emoji": "🥇",
    "keywords": "1st place medal gold winner first victory champion best award medal honors prize"
  },
  {
    "emoji": "🥈",
    "keywords": "2nd place medal silver runner up second victory award medal tournament prize"
  },
  {
    "emoji": "🥉",
    "keywords": "3rd place medal bronze third place podium award medal tournament prize honors"
  },
  {
    "emoji": "🏅",
    "keywords": "sports medal award champion tournament ribbon honor achievement competition winner"
  },
  {
    "emoji": "🎖️",
    "keywords": "military medal badge ribbon decoration honor veteran soldier hero service award"
  },
  {
    "emoji": "📁",
    "keywords": "file folder directory documents organize archive storage paper files path desktop"
  },
  {
    "emoji": "📂",
    "keywords": "open file folder directory documents view browse files explorer desktop explorer"
  },
  {
    "emoji": "📄",
    "keywords": "page facing up document paper text article script contract file report sheet"
  },
  {
    "emoji": "📃",
    "keywords": "page with curl scroll document manuscript report note statement record list"
  },
  {
    "emoji": "📑",
    "keywords": "bookmark tabs index tags document paper file chapters section divider list organize"
  },
  {
    "emoji": "📊",
    "keywords": "bar chart statistics analytics graph data metric diagram performance progress report"
  },
  {
    "emoji": "📈",
    "keywords": "chart increasing trend growth profit success stock market surge progress analytics up"
  },
  {
    "emoji": "📉",
    "keywords": "chart decreasing trend decline loss deficit stock market dip drop down fall recession"
  },
  {
    "emoji": "🗒️",
    "keywords": "spiral notepad memo note pad writing paper sketch reminder notebook journal list"
  },
  {
    "emoji": "🗓️",
    "keywords": "spiral calendar schedule appointment date month planner diary organizer booking day"
  },
  {
    "emoji": "📆",
    "keywords": "tear off calendar schedule day date event deadline appointment monthly annual daily"
  },
  {
    "emoji": "📅",
    "keywords": "calendar date schedule month event appointment deadline planner year timetable schedule"
  },
  {
    "emoji": "📇",
    "keywords": "card index rolodex contacts directory rolodex address book names records cards organize"
  },
  {
    "emoji": "🗃️",
    "keywords": "card file box archive index organizer storage drawer records catalog container database"
  },
  {
    "emoji": "🗳️",
    "keywords": "ballot box with ballot vote election poll choice decision democracy citizen feedback"
  },
  {
    "emoji": "🗄️",
    "keywords": "file cabinet archive storage office records documents drawers organizing files steel"
  },
  {
    "emoji": "📋",
    "keywords": "clipboard paste board memo checklist audit tasks survey inspection notes copy paste"
  },
  {
    "emoji": "📌",
    "keywords": "pushpin tack notice reminder attach bulletin pin point location mark corkboard map"
  },
  {
    "emoji": "📍",
    "keywords": "round pushpin map pin location destination target marker pointer compass spot gps place"
  },
  {
    "emoji": "📎",
    "keywords": "paperclip attach document office link clip stationery bind fastener staple joining"
  },
  {
    "emoji": "🖇️",
    "keywords": "linked paperclips documents office attachment file fastener connection bind join bunch"
  },
  {
    "emoji": "📏",
    "keywords": "straight ruler measure length distance centimeter inch straight line drafting tool"
  },
  {
    "emoji": "📐",
    "keywords": "triangular ruler triangle geometry math drafting angle architecture engineer measuring scale"
  },
  {
    "emoji": "✂️",
    "keywords": "scissors cut snip shear razor tool editing trim clip crop craft paper tailor barber"
  },
  {
    "emoji": "🗂️",
    "keywords": "card index dividers tabs catalog organization filing categorize label folder binder sections"
  },
  {
    "emoji": "🗞️",
    "keywords": "rolled up newspaper press news media journalism article gazette headline print dispatch"
  },
  {
    "emoji": "📰",
    "keywords": "newspaper news media journalism headline article report gazette press scoop paper daily"
  },
  {
    "emoji": "🏷️",
    "keywords": "label tag price marker sale metadata discount bookmark identification sticker ticket"
  },
  {
    "emoji": "🔖",
    "keywords": "bookmark ribbon marker reading book save favorite tag indicator chapter page mark placeholder"
  },
  {
    "emoji": "✉️",
    "keywords": "envelope mail email letter post message correspondence postal office dispatch memo inbox"
  },
  {
    "emoji": "📧",
    "keywords": "e-mail email electronic mail message digital letter correspondence contact webmail inbox"
  },
  {
    "emoji": "📨",
    "keywords": "incoming envelope received letter mail email message notification delivered arriving post"
  },
  {
    "emoji": "📩",
    "keywords": "envelope with arrow sending outbound dispatch sent post email message outward delivery submit"
  },
  {
    "emoji": "📤",
    "keywords": "outbox tray mail sending out queue outgoing communication files submit dispatch delivery tray"
  },
  {
    "emoji": "📥",
    "keywords": "inbox tray incoming mail inbox messages receive queue letters storage paper incoming dock"
  },
  {
    "emoji": "📦",
    "keywords": "package box parcel delivery courier postal amazon shipping cardboard cargo crate transport"
  },
  {
    "emoji": "⚡",
    "keywords": "high voltage lightning bolt electric spark shock flash power charge storm energy fast"
  },
  {
    "emoji": "🔥",
    "keywords": "fire flame hot burn blaze viral trend lit spicy passionate energy heat ignite warmth"
  },
  {
    "emoji": "✨",
    "keywords": "sparkles magic shine clean glitter twinkle stars new polished glow premium radiant special"
  },
  {
    "emoji": "🚀",
    "keywords": "rocket ship launch fast boost spaceship orbit speed startup blast off space flight propel"
  },
  {
    "emoji": "💎",
    "keywords": "gem stone diamond jewel precious crystal luxury treasure stone value ring brilliant sparkling"
  },
  {
    "emoji": "🎯",
    "keywords": "bullseye dart direct hit focus target goal aim accuracy mission priority hit point scope"
  },
  {
    "emoji": "💡",
    "keywords": "light bulb idea brainstorm innovation solution smart bright insight creative eureka clever"
  },
  {
    "emoji": "🔑",
    "keywords": "key password security unlock login secret credential token cipher access entry code vault"
  },
  {
    "emoji": "🗝️",
    "keywords": "old key antique vintage skeleton key treasure secret mystery locked access escape entry"
  },
  {
    "emoji": "🔒",
    "keywords": "locked padlock security safety private protection safe secret access barrier secure safe"
  },
  {
    "emoji": "🔓",
    "keywords": "unlocked padlock open accessible free decrypted unsealed entry bypass access clear release"
  },
  {
    "emoji": "🔔",
    "keywords": "bell alert notification alarm chime ring sound update attention reminder siren reminder"
  },
  {
    "emoji": "🔕",
    "keywords": "bell with slash mute silent quiet do not disturb alert disabled no sound soundless off"
  },
  {
    "emoji": "📢",
    "keywords": "loudspeaker megaphone announcement shout alert broadcast cheer call volume public talk speech"
  },
  {
    "emoji": "📣",
    "keywords": "megaphone cheering rally announcement shout voice audio promo boost call advertising volume"
  },
  {
    "emoji": "✅",
    "keywords": "check mark button done verified completed success correct right approved passed tick ok yes"
  },
  {
    "emoji": "❌",
    "keywords": "cross mark cancel error reject fail wrong no incorrect forbidden close stop delete denied"
  },
  {
    "emoji": "❎",
    "keywords": "cross mark button square negative reject disable close delete clear cancel uncheck error"
  },
  {
    "emoji": "➕",
    "keywords": "plus sign add new positive increment sum join create insert append attach include more extra"
  },
  {
    "emoji": "➖",
    "keywords": "minus sign subtract remove negative decrease difference less deduct drop strip eliminate delete"
  },
  {
    "emoji": "➗",
    "keywords": "division sign math calculate ratio split divide share fraction partition distribute algorithm"
  },
  {
    "emoji": "✖️",
    "keywords": "multiplication sign times product math cross calculate multiply expand factorial repeat duplicate"
  },
  {
    "emoji": "♾️",
    "keywords": "infinity loop eternal endless forever continuous repeat limitless persistent unbounded timeless"
  },
  {
    "emoji": "‼️",
    "keywords": "double exclamation mark urgent critical alert emergency surprise attention shock important warning"
  },
  {
    "emoji": "⁉️",
    "keywords": "exclamation question mark interrobang surprise disbelief confusion mystery what huh riddle query"
  },
  {
    "emoji": "❓",
    "keywords": "question mark red ask help faq inquiry wonder doubt puzzle unknown riddle question investigate"
  },
  {
    "emoji": "❔",
    "keywords": "white question mark ask help query doubt uncertain wonder faq riddle prompt inquire unknown"
  },
  {
    "emoji": "❕",
    "keywords": "white exclamation mark alert notice attention caution notification important surprise hint note"
  },
  {
    "emoji": "❗",
    "keywords": "red exclamation mark danger alert warning caution urgent priority notice error attention stop"
  },
  {
    "emoji": "⭕",
    "keywords": "heavy large circle ok correct valid target ring bullseye complete circle pass approved halo loop"
  },
  {
    "emoji": "🛑",
    "keywords": "octagonal stop sign traffic halt pause break cease forbid terminate end abort hold arrest guard"
  },
  {
    "emoji": "⛔",
    "keywords": "no entry restricted prohibited denied forbidden unauthorized access entry barred warning roadblock"
  },
  {
    "emoji": "📛",
    "keywords": "name badge identification employee visitor hello sticker tag credential label security visitor"
  },
  {
    "emoji": "🚫",
    "keywords": "prohibited sign forbidden banned stop restricted denied cancel disallowed no invalid illegal"
  },
  {
    "emoji": "💯",
    "keywords": "hundred points 100 percent perfect full score score top excellent flawless absolute complete max"
  },
  {
    "emoji": "🔄",
    "keywords": "counterclockwise arrows counter rotation refresh reload update sync loop retry loop recycle swap"
  },
  {
    "emoji": "🔃",
    "keywords": "clockwise vertical arrows reload repeat sync update refresh loop cycle turn around exchange iterate"
  },
  {
    "emoji": "🔀",
    "keywords": "shuffle tracks button random mix cross tracks playback unordered variation switch playlist dynamic"
  },
  {
    "emoji": "🔁",
    "keywords": "repeat button loop replay repeat track cycle infinite rerun recurrent again duplicate playback"
  },
  {
    "emoji": "🔂",
    "keywords": "repeat single button repeat once replay current loop single song cycle recurrent again duplicate"
  },
  {
    "emoji": "▶️",
    "keywords": "play button start resume run media execute forward trigger initiate action resume listen watch"
  },
  {
    "emoji": "⏩",
    "keywords": "fast forward button speed skip accelerate double speed seek advance push forward rush ahead skip"
  },
  {
    "emoji": "⏭️",
    "keywords": "next track button skip next jump forward following proceed advance subsequent leap forward step"
  },
  {
    "emoji": "⏯️",
    "keywords": "play or pause button toggle start halt media switch trigger toggle alternate control listen play"
  },
  {
    "emoji": "◀️",
    "keywords": "reverse button play backwards rewind reverse orientation left step back inverse prior retreat"
  },
  {
    "emoji": "⏪",
    "keywords": "fast reverse button rewind skip backward seek back retreat back track rush back rewind reverse"
  },
  {
    "emoji": "⏮️",
    "keywords": "previous track button jump backward track back return rewind back track prior initial rewind step"
  },
  {
    "emoji": "🔼",
    "keywords": "upwards button triangle up elevate rise scroll ascend upper higher raise navigate peak roof top"
  },
  {
    "emoji": "⏫",
    "keywords": "fast up button double up shift elevate jump top ceiling apex peak ascend high elevation rocket"
  },
  {
    "emoji": "🔽",
    "keywords": "downwards button triangle down drop lower scroll descend floor base decline bottom fall deep navigate"
  },
  {
    "emoji": "⏬",
    "keywords": "fast down button double down dive drop plunge bottom floor drop base descend deep sink bottom jump"
  },
  {
    "emoji": "⏸️",
    "keywords": "pause button halt hold suspend break freeze intermission waiting stand standby delay intermission"
  },
  {
    "emoji": "⏹️",
    "keywords": "stop button terminate abort halt square end finish reset conclude power down cancel zero cut"
  },
  {
    "emoji": "⏺️",
    "keywords": "record button capture audio video tape red circle streaming surveillance mic capture register save"
  },
  {
    "emoji": "⏏️",
    "keywords": "eject button remove disk media pop out release disconnect push unmount hardware external slot detach"
  },
  {
    "emoji": "🔈",
    "keywords": "speaker low volume audio sound acoustic soft quiet tone faint whisper output player monitor minimal"
  },
  {
    "emoji": "🔉",
    "keywords": "speaker medium volume audio sound acoustic moderate balance regular dynamic level audible podcast voice"
  },
  {
    "emoji": "🔊",
    "keywords": "speaker high volume loud audio sound blast noisy amplification max stereo sound concert sonic power"
  },
  {
    "emoji": "🔇",
    "keywords": "muted speaker silent mute volume disabled quiet silence peace quiet audio zero no sound cancelled deaf"
  },
  {
    "emoji": "🚀",
    "keywords": "rocket space launch boost blast flight ship shuttle cosmos"
  },
  {
    "emoji": "🛸",
    "keywords": "flying saucer ufo alien sci fi spacecraft saucer extraterrestrial"
  },
  {
    "emoji": "🛰️",
    "keywords": "satellite orbital communication weather gps space solar array"
  },
  {
    "emoji": "🌌",
    "keywords": "milky way galaxy space stars universe cosmos nebulae"
  },
  {
    "emoji": "🪐",
    "keywords": "ringed planet saturn jupiter orbit outer space gravity"
  },
  {
    "emoji": "🌍",
    "keywords": "globe showing europe africa earth world planet geography map"
  },
  {
    "emoji": "🌎",
    "keywords": "globe showing americas earth world planet geography western map"
  },
  {
    "emoji": "🌏",
    "keywords": "globe showing asia australia earth world planet geography eastern map"
  },
  {
    "emoji": "🌕",
    "keywords": "full moon bright night lunar sphere orbit glowing space"
  },
  {
    "emoji": "🌖",
    "keywords": "waning gibbous moon phase lunar night space shadow orbit"
  },
  {
    "emoji": "🌗",
    "keywords": "last quarter moon phase lunar night space shadow orbit"
  },
  {
    "emoji": "🌘",
    "keywords": "waning crescent moon phase lunar night space shadow orbit"
  },
  {
    "emoji": "🌑",
    "keywords": "new moon phase lunar dark night space shadow orbit eclipse"
  },
  {
    "emoji": "🌒",
    "keywords": "waxing crescent moon phase lunar night space shadow orbit"
  },
  {
    "emoji": "🌓",
    "keywords": "first quarter moon phase lunar night space shadow orbit"
  },
  {
    "emoji": "🌔",
    "keywords": "waxing gibbous moon phase lunar night space shadow orbit"
  },
  {
    "emoji": "🌙",
    "keywords": "crescent moon night dream sleep bedtime silent dark sky"
  },
  {
    "emoji": "☀️",
    "keywords": "sun sunny warm bright summer daylight solar morning shine"
  },
  {
    "emoji": "🌟",
    "keywords": "glowing star sparkle golden shine rank success glitter flash"
  },
  {
    "emoji": "⭐",
    "keywords": "star favorite bookmark yellow golden rate gold point classic"
  },
  {
    "emoji": "🌠",
    "keywords": "shooting star meteor wish night cosmic streak falling star"
  },
  {
    "emoji": "☄️",
    "keywords": "comet asteroid ice meteor space tail cosmic blazing sky"
  },
  {
    "emoji": "💥",
    "keywords": "collision boom explosion impact blast shock loud pow hit"
  },
  {
    "emoji": "🔥",
    "keywords": "fire flame hot burn campfire warm bonfire heat ignite blaze"
  },
  {
    "emoji": "🌈",
    "keywords": "rainbow pride spectrum colors colorful sky weather vibrant arc"
  },
  {
    "emoji": "🌪️",
    "keywords": "tornado twister cyclone whirlwind storm wind vortex funnel"
  },
  {
    "emoji": "🌊",
    "keywords": "water wave ocean tsunami sea surf splash blue tides surf"
  },
  {
    "emoji": "💧",
    "keywords": "droplet water tear splash sweat leak drop rain fluid aqua"
  },
  {
    "emoji": "❄️",
    "keywords": "snowflake cold snow winter freeze ice crystal chilly frost"
  },
  {
    "emoji": "⛄",
    "keywords": "snowman without snow winter holiday frost cold festive ice"
  },
  {
    "emoji": "💨",
    "keywords": "dashing away wind speed puff fast rush run smoke vapor gas"
  },
  {
    "emoji": "☁️",
    "keywords": "cloud overcast weather sky shadow cotton soft air atmosphere"
  },
  {
    "emoji": "⛅",
    "keywords": "sun behind cloud partly cloudy daytime weather sky overcast warm"
  },
  {
    "emoji": "🌧️",
    "keywords": "cloud with rain wet precipitation storm rainy season weather drops"
  },
  {
    "emoji": "⛈️",
    "keywords": "cloud with lightning and rain thunderstorm weather storm shock danger"
  },
  {
    "emoji": "🌦️",
    "keywords": "sun behind rain cloud sunshower rainbow weather spring shower sky"
  },
  {
    "emoji": "🧠",
    "keywords": "brain mind think smart ai intelligence neurology thought idea"
  },
  {
    "emoji": "🧬",
    "keywords": "dna double helix genetics biology science gene medical genome code"
  },
  {
    "emoji": "🧪",
    "keywords": "test tube chemistry lab science experiment flask sample beaker"
  },
  {
    "emoji": "🔬",
    "keywords": "microscope science biology research lab inspect zoom examine cell"
  },
  {
    "emoji": "❤️",
    "keywords": "red heart love romantic passion favorite affection heart"
  },
  {
    "emoji": "🧡",
    "keywords": "orange heart love warm friend care energy autumn"
  },
  {
    "emoji": "💛",
    "keywords": "yellow heart friendship joy sunny happy golden affection"
  },
  {
    "emoji": "💚",
    "keywords": "green heart nature health eco organic environment life"
  },
  {
    "emoji": "💙",
    "keywords": "blue heart trust calm loyalty cool peace oceanic classic"
  },
  {
    "emoji": "💜",
    "keywords": "purple heart luxury magic royalty compassion regal stylish"
  },
  {
    "emoji": "🖤",
    "keywords": "black heart dark gothic edgy shadow classic sorrow emo"
  },
  {
    "emoji": "🤍",
    "keywords": "white heart pure clean peaceful angelic innocent gentle"
  },
  {
    "emoji": "🤎",
    "keywords": "brown heart warm earthy chocolate coffee cozy snug rustic"
  },
  {
    "emoji": "💔",
    "keywords": "broken heart heartbreak breakup sorrow sad pain wounded grief"
  },
  {
    "emoji": "❣️",
    "keywords": "heart exclamation mark love alert attention passion punctuation"
  },
  {
    "emoji": "💕",
    "keywords": "two hearts floating love affection romance couple sweet fond"
  },
  {
    "emoji": "💞",
    "keywords": "revolving hearts spinning love passion connection dynamic adore"
  },
  {
    "emoji": "💓",
    "keywords": "beating heart pulse love alive excitement shock vibrance"
  },
  {
    "emoji": "💗",
    "keywords": "growing heart expansion love tender affection romance swell"
  },
  {
    "emoji": "💖",
    "keywords": "sparkling heart glitz shiny shimmer magic glitter romance"
  },
  {
    "emoji": "💘",
    "keywords": "heart with arrow cupid shot in love crush romantic struck"
  },
  {
    "emoji": "💝",
    "keywords": "heart with ribbon gift present valentine chocolate surprise token"
  },
  {
    "emoji": "💟",
    "keywords": "heart decoration purple square badge sweet ornament crest"
  },
  {
    "emoji": "🔴",
    "keywords": "red circle dot record button stop error marker bullet badge"
  },
  {
    "emoji": "🟠",
    "keywords": "orange circle dot warning pause marker orange badge bullet"
  },
  {
    "emoji": "🟡",
    "keywords": "yellow circle dot caution standby marker amber badge bullet"
  },
  {
    "emoji": "🟢",
    "keywords": "green circle dot active live running ok passed success bullet"
  },
  {
    "emoji": "🔵",
    "keywords": "blue circle dot info system network indicator primary bullet"
  },
  {
    "emoji": "🟣",
    "keywords": "purple circle dot creative special marker purple badge bullet"
  },
  {
    "emoji": "⚫",
    "keywords": "black circle dot dark off inactive bullet solid marker"
  },
  {
    "emoji": "⚪",
    "keywords": "white circle dot blank light clean bullet clear marker"
  },
  {
    "emoji": "🟤",
    "keywords": "brown circle dot earth natural neutral bullet solid marker"
  },
  {
    "emoji": "🟥",
    "keywords": "red square block stop critical alert flag indicator corner solid"
  },
  {
    "emoji": "🟧",
    "keywords": "orange square block attention medium alert indicator corner solid"
  },
  {
    "emoji": "🟨",
    "keywords": "yellow square block caution warning indicator corner solid"
  },
  {
    "emoji": "🟩",
    "keywords": "green square block verified pass success ok indicator corner solid"
  },
  {
    "emoji": "🟦",
    "keywords": "blue square block system primary tile indicator corner solid"
  },
  {
    "emoji": "🟪",
    "keywords": "purple square block special creative tile indicator corner solid"
  },
  {
    "emoji": "⬛",
    "keywords": "black square block dark off darkmode tile indicator corner solid"
  },
  {
    "emoji": "⬜",
    "keywords": "white square block light clear bright tile indicator corner solid"
  },
  {
    "emoji": "🟫",
    "keywords": "brown square block neutral earth wood tile indicator corner solid"
  },
  {
    "emoji": "🐶",
    "keywords": "dog puppy pet bark canine friend cute"
  },
  {
    "emoji": "🐱",
    "keywords": "cat kitten pet meow feline cute"
  },
  {
    "emoji": "🦊",
    "keywords": "fox cunning clever orange wild"
  },
  {
    "emoji": "🐻",
    "keywords": "bear teddy wild animal brown"
  },
  {
    "emoji": "🐼",
    "keywords": "panda cute bear bamboo china"
  },
  {
    "emoji": "🦁",
    "keywords": "lion king wild roar brave cat"
  },
  {
    "emoji": "🐯",
    "keywords": "tiger wild cat stripes roar fierce"
  },
  {
    "emoji": "🐵",
    "keywords": "monkey cheeky clever animal jungle"
  },
  {
    "emoji": "🐸",
    "keywords": "frog toad green ribbit meme pond"
  },
  {
    "emoji": "🐙",
    "keywords": "octopus sea creature tentacles kraken ocean"
  },
  {
    "emoji": "🦋",
    "keywords": "butterfly insect wings beautiful flutter transformation"
  },
  {
    "emoji": "🌸",
    "keywords": "cherry blossom flower sakura pink spring bloom"
  },
  {
    "emoji": "🌲",
    "keywords": "evergreen tree pine forest nature wood timber"
  },
  {
    "emoji": "🍀",
    "keywords": "four leaf clover lucky fortune irish st patricks"
  },
  {
    "emoji": "🍎",
    "keywords": "red apple fruit healthy sweet fresh food"
  },
  {
    "emoji": "🍕",
    "keywords": "pizza slice cheese pepperoni fast food tasty"
  },
  {
    "emoji": "🍔",
    "keywords": "hamburger burger beef fast food diner lunch"
  },
  {
    "emoji": "🍟",
    "keywords": "french fries potato crispy fast food snack"
  },
  {
    "emoji": "🌮",
    "keywords": "taco mexican food snack shell dinner"
  },
  {
    "emoji": "🍣",
    "keywords": "sushi sashimi japanese seafood raw fish rice"
  },
  {
    "emoji": "🍦",
    "keywords": "ice cream soft serve cone dessert sweet summer"
  },
  {
    "emoji": "🍩",
    "keywords": "doughnut donut glazed sweet bakery pastry snack"
  },
  {
    "emoji": "🍺",
    "keywords": "beer mug drink alcohol bar pub celebration cheers"
  },
  {
    "emoji": "🍷",
    "keywords": "wine glass red wine drink alcohol party dinner"
  },
  {
    "emoji": "☕",
    "keywords": "hot beverage coffee tea cup caffeine espresso mug morning"
  },
  {
    "emoji": "🍵",
    "keywords": "teacup without handle green tea matcha herbal hot drink"
  },
  {
    "emoji": "🍿",
    "keywords": "popcorn movie theater snack butter cinema entertainment"
  },
  {
    "emoji": "🧁",
    "keywords": "cupcake dessert bakery sweet frosting cake party"
  },
  {
    "emoji": "🎂",
    "keywords": "birthday cake celebration party candles anniversary dessert"
  },
  {
    "emoji": "🍰",
    "keywords": "shortcake strawberry cake slice pastry dessert sweet"
  }
];
