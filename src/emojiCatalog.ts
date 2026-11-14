// Record actual module evaluation for packaged-app lazy-load diagnostics.
if (typeof performance !== 'undefined') performance.mark?.('node:emoji-catalog-module-loaded');

export interface EmojiCatalogEntry { emoji: string; keywords: string }

// One entry per line keeps the complete lazy-loaded catalog compact without losing search terms.
const CATALOG_LINES = `😀 grinning face happy smile
😃 smiley face happy open
😄 smile laugh joy
😁 beam grin toothy
😆 laugh squint haha
😅 sweat smile relief phew
🤣 rofl rolling laughing funny
😂 joy tears cry laughing
🙂 slightly smiling gentle
🙃 upside down silly sarcastic
😉 wink flirt joke
😊 blush happy warm
😇 innocent halo angel holy
🥰 love hearts adore fond
😍 heart eyes crush adore
🤩 star struck excited amazed
😘 kiss blow love heart
😗 kissing whistle gentle
😚 kissing closed eyes warm
😙 kissing smile gentle
😋 yum delicious food tasty
😛 tongue silly playful
😜 wink tongue wacky joke
🤪 zany crazy wild derp
😝 squint tongue goof prank
🤑 money face cash rich dollar
🤗 hugs open hands embrace
🤭 giggle oops secret teehee
🤫 shh quiet silence secret
🤔 thinking hmm ponder wonder
🤐 zipper mouth secret quiet
🤨 raised eyebrow sus skeptical
😐 neutral poker face flat
😑 expressionless blank unimpressed
😶 no mouth silent muted
😏 smirk cool sly ironic
😒 unamused side eye bored
🙄 eye roll whatever duh
😬 grimace awkward yikes oof
🤥 lying pinocchio fake deceit
😌 relieved calm zen peace
😔 pensive sad wistful
😪 sleepy snot tired doze
🤤 drooling hungry desire
😴 sleeping zzz bed rest
😷 mask sick covid doctor
🤒 thermometer ill fever flu
🤕 bandage hurt head injury
🤢 nauseated sick gross disgust
🤮 vomit puke sick disgust
🥵 hot sweating red heat fever
🥶 cold freezing blue ice chill
🥴 woozy drunk dizzy tipsy
😵 dizzy knocked out shock
🤯 mind blown explosion shock
🤠 cowboy hat western yeehaw
🥳 party celebration confetti hat
😎 sunglasses cool boss chill
🤓 nerd glasses smart geek
🧐 monocle classy inspect clue
😕 confused puzzled shrug
😟 worried anxious concern
🙁 slightly frowning sad unhappy
😮 open mouth surprise gasp wow
😯 hushed surprise quiet shock
😲 astonished shocked amazed
😳 flushed embarrassed blush red
🥺 pleading puppy eyes please beg
😦 frowning open mouth dismay
😧 anguished shocked scared
😨 fearful scared worried dread
😰 anxious blue sweat stress panicking
😥 sad relieved sweat sigh
😢 crying tear sad weep
😭 loudly crying sobbing weeping tear
😱 screaming horror fear ghost panic
😖 confounded frustrated stressed
😣 persevering struggling tough
😞 disappointed upset sad regret
😓 downcast sweat sigh exhausted
😩 weary tired frustrated groan
😫 tired exhausted fed up moan
🥱 yawn sleepy tired bored
😤 triumph steam angry huff proud
😡 pouting angry mad furious rage
😠 angry irritated mad annoyed
🤬 cursing swearing angry symbols rage
😈 devil purple evil grin mischievous
👿 angry devil evil demon
💀 skull dead skeleton death rip
☠️ skull crossbones danger poison pirate
💩 poop turd brown crap funny
🤡 clown circus fool joke
👹 ogre monster japanese demon
👺 goblin red mask monster
👻 ghost phantom spooky halloween boo
👽 alien ufo extraterrestrial sci-fi
👾 alien monster 8bit arcade pixel retro
🤖 robot bot automation machine droid
👋 wave hello bye greeting hand
🤚 raised back of hand stop high
🖐️ hand splayed fingers palm stop
✋ raised hand stop high five palm
🖖 vulcan salute spock star trek live long
👌 ok sign perfect good got it
🤌 pinched fingers italian chef kiss what
🤏 pinching hand tiny small little bit
✌️ peace victory v hand two sign
🤞 crossed fingers luck hope wish
🤟 love you gesture hand sign ilu
🤘 rock on horns heavy metal concert
🤙 call me shaka hang loose surf phone
👈 point left finger direction back
👉 point right finger direction next forward
👆 point up finger direction high above
🖕 middle finger rude insult offensive
👇 point down finger direction low below
☝️ index pointing up one first listen reminder
👍 thumbs up like approve good yes agree
👎 thumbs down dislike bad reject no disagree
✊ raised fist power strength solidarity punch
👊 oncoming fist punch bump strike brofist
🤛 fist left punch bump strike
🤜 fist right bump strike brofist
👏 clapping hands applause bravo congrats props
🙌 raising hands celebrate praise hooray yay
👐 open hands hug welcome jazz hands
🤲 palms up together open offer pray pray
🤝 handshake deal agree partner pact meeting
🙏 folded hands pray please thank you namaste bow
✍️ writing hand pen pencil author note draw
💅 nail polish beauty sassy flex care
🤳 selfie camera photo smartphone take picture
💪 flexed biceps muscle strong power fitness gym workout
🦾 mechanical arm bionic cyborg prosthetics strength robot
💻 laptop computer macbook pc screen work notebook
🖥️ desktop computer monitor display imac workstation
🖨️ printer paper office documents print copy scan
⌨️ keyboard type macro key switch typing mechanical
🖱️ mouse click cursor optical pointer scroll wheel
🖲️ trackball mouse control ergonomics pointer
💽 minidisc optical computer data storage md
💾 floppy disk save 3.5 backup retro storage
💿 optical disc cd compact disc music audio software rom
📀 dvd disc blu ray video media movie software optical
📼 videocassette vhs tape retro video analog recording
📷 camera photo photography snapshot picture shoot dslr
📸 camera flash photography snapshot photo capture picture press
📹 video camera camcorder recording filming broadcast film
🎥 movie camera cinema film director cinema production studio
📽️ film projector cinema movie vintage theater display
🎞️ film frames negative cinema movie production editing reel
📞 telephone telephone receiver call phone landline voice ring
☎️ telephone classic red vintage call voice phone ring
📟 pager retro beeper tech communication alert 90s vintage
📠 fax machine documents transmission scan office retro phone
📺 television tv display screen broadcast cathode retro tube crt
📻 radio wireless fm am music broadcast audio podcast transmission
🎙️ studio microphone recording podcast voice mic vocalist streaming audio
🎚️ level slider fader audio mixer soundboard studio mastering volume balance
🎛️ control knobs dial equalizer synthesizer dj synth console audio tuning
⏱️ stopwatch timer chronometer clock speed measure counter track interval
⏲️ timer clock countdown kitchen alarm chronometer tick ring interval
⏰ alarm clock wake up morning time alert schedule deadline reminder
🕰️ mantelpiece clock vintage antique time pendulum tick hour shelf
⌛ hourglass done time sand timer expired finish complete waiting measure
⏳ hourglass sand flowing running time clock loading processing patience timer
📡 satellite antenna dish broadcast signal network wireless space streaming comms
🔋 battery power energy charge full capacity level cell electric life
🔌 electric plug cable connector wire cord socket power charging outlet
💡 light bulb idea brainstorm innovation bright inspiration electric smart glow
🔦 flashlight torch beam search inspect night dark spotlight explore find
🕯️ candle flame wax light mood flame glow romantic dark burn
🧯 fire extinguisher safety put out flame emergency hazard fire drill alert
🛢️ oil drum barrel petroleum fuel crude resource tank container storage chemical
🎮 video game controller gamepad playstation xbox nintendo steam play arcade
🕹️ joystick arcade retro gaming simulator flight controller vintage arcade stick
👾 alien monster space invaders pixel retro 8bit game arcade vintage gamer
🎲 game die dice board game chance gamble luck roll tabletop dnd
♟️ chess pawn board game strategy tactic chess piece move checkmate play
🎯 bullseye dart direct hit target goal focus precision aim mark accuracy
🎳 bowling ball pins strike spare sports game alley roll frame
🎪 circus tent carnival festival fair fun event performance magic show show
🎨 artist palette paint drawing colors brush creative canvas design artwork design
🎬 clapper board film movie cinema cut action director scene take production
🎤 microphone singing karaoke vocal podcast voice audio stage artist speech
🎧 headphones audio sound listening music dj studio monitors headset podcast
🎼 musical score sheet music notes melody treble clef harmony composition classical
🎹 musical keyboard piano synth synthesizer keys midi organ acoustic chords sound
🥁 drum snare drumstick percussion rhythm beat groove tempo rock marching band
🎷 saxophone jazz brass instrument horn solo blues groove music woodwind soul
🎺 trumpet brass instrument horn fanfare jazz fanfare orchestra classical fanfare
🎸 guitar electric guitar rock metal acoustic bass solo strings riff music jam
🪕 banjo country folk bluegrass strings pluck instrument acoustic rhythm vintage
🎻 violin fiddle cello orchestra strings acoustic classical bow melody concerto
🎟️ admission ticket raffle movie show event cinema concert cinema entrance voucher
🎫 ticket pass bus train boarding movie pass concert admit access receipt voucher
🏆 trophy cup winner victory first place prize award achievement champion gold best
🥇 1st place medal gold winner first victory champion best award medal honors prize
🥈 2nd place medal silver runner up second victory award medal tournament prize
🥉 3rd place medal bronze third place podium award medal tournament prize honors
🏅 sports medal award champion tournament ribbon honor achievement competition winner
🎖️ military medal badge ribbon decoration honor veteran soldier hero service award
📁 file folder directory documents organize archive storage paper files path desktop
📂 open file folder directory documents view browse files explorer desktop explorer
📄 page facing up document paper text article script contract file report sheet
📃 page with curl scroll document manuscript report note statement record list
📑 bookmark tabs index tags document paper file chapters section divider list organize
📊 bar chart statistics analytics graph data metric diagram performance progress report
📈 chart increasing trend growth profit success stock market surge progress analytics up
📉 chart decreasing trend decline loss deficit stock market dip drop down fall recession
🗒️ spiral notepad memo note pad writing paper sketch reminder notebook journal list
🗓️ spiral calendar schedule appointment date month planner diary organizer booking day
📆 tear off calendar schedule day date event deadline appointment monthly annual daily
📅 calendar date schedule month event appointment deadline planner year timetable schedule
📇 card index rolodex contacts directory rolodex address book names records cards organize
🗃️ card file box archive index organizer storage drawer records catalog container database
🗳️ ballot box with ballot vote election poll choice decision democracy citizen feedback
🗄️ file cabinet archive storage office records documents drawers organizing files steel
📋 clipboard paste board memo checklist audit tasks survey inspection notes copy paste
📌 pushpin tack notice reminder attach bulletin pin point location mark corkboard map
📍 round pushpin map pin location destination target marker pointer compass spot gps place
📎 paperclip attach document office link clip stationery bind fastener staple joining
🖇️ linked paperclips documents office attachment file fastener connection bind join bunch
📏 straight ruler measure length distance centimeter inch straight line drafting tool
📐 triangular ruler triangle geometry math drafting angle architecture engineer measuring scale
✂️ scissors cut snip shear razor tool editing trim clip crop craft paper tailor barber
🗂️ card index dividers tabs catalog organization filing categorize label folder binder sections
🗞️ rolled up newspaper press news media journalism article gazette headline print dispatch
📰 newspaper news media journalism headline article report gazette press scoop paper daily
🏷️ label tag price marker sale metadata discount bookmark identification sticker ticket
🔖 bookmark ribbon marker reading book save favorite tag indicator chapter page mark placeholder
✉️ envelope mail email letter post message correspondence postal office dispatch memo inbox
📧 e-mail email electronic mail message digital letter correspondence contact webmail inbox
📨 incoming envelope received letter mail email message notification delivered arriving post
📩 envelope with arrow sending outbound dispatch sent post email message outward delivery submit
📤 outbox tray mail sending out queue outgoing communication files submit dispatch delivery tray
📥 inbox tray incoming mail inbox messages receive queue letters storage paper incoming dock
📦 package box parcel delivery courier postal amazon shipping cardboard cargo crate transport
⚡ high voltage lightning bolt electric spark shock flash power charge storm energy fast
🔥 fire flame hot burn blaze viral trend lit spicy passionate energy heat ignite warmth
✨ sparkles magic shine clean glitter twinkle stars new polished glow premium radiant special
🚀 rocket ship launch fast boost spaceship orbit speed startup blast off space flight propel
💎 gem stone diamond jewel precious crystal luxury treasure stone value ring brilliant sparkling
🎯 bullseye dart direct hit focus target goal aim accuracy mission priority hit point scope
💡 light bulb idea brainstorm innovation solution smart bright insight creative eureka clever
🔑 key password security unlock login secret credential token cipher access entry code vault
🗝️ old key antique vintage skeleton key treasure secret mystery locked access escape entry
🔒 locked padlock security safety private protection safe secret access barrier secure safe
🔓 unlocked padlock open accessible free decrypted unsealed entry bypass access clear release
🔔 bell alert notification alarm chime ring sound update attention reminder siren reminder
🔕 bell with slash mute silent quiet do not disturb alert disabled no sound soundless off
📢 loudspeaker megaphone announcement shout alert broadcast cheer call volume public talk speech
📣 megaphone cheering rally announcement shout voice audio promo boost call advertising volume
✅ check mark button done verified completed success correct right approved passed tick ok yes
❌ cross mark cancel error reject fail wrong no incorrect forbidden close stop delete denied
❎ cross mark button square negative reject disable close delete clear cancel uncheck error
➕ plus sign add new positive increment sum join create insert append attach include more extra
➖ minus sign subtract remove negative decrease difference less deduct drop strip eliminate delete
➗ division sign math calculate ratio split divide share fraction partition distribute algorithm
✖️ multiplication sign times product math cross calculate multiply expand factorial repeat duplicate
♾️ infinity loop eternal endless forever continuous repeat limitless persistent unbounded timeless
‼️ double exclamation mark urgent critical alert emergency surprise attention shock important warning
⁉️ exclamation question mark interrobang surprise disbelief confusion mystery what huh riddle query
❓ question mark red ask help faq inquiry wonder doubt puzzle unknown riddle question investigate
❔ white question mark ask help query doubt uncertain wonder faq riddle prompt inquire unknown
❕ white exclamation mark alert notice attention caution notification important surprise hint note
❗ red exclamation mark danger alert warning caution urgent priority notice error attention stop
⭕ heavy large circle ok correct valid target ring bullseye complete circle pass approved halo loop
🛑 octagonal stop sign traffic halt pause break cease forbid terminate end abort hold arrest guard
⛔ no entry restricted prohibited denied forbidden unauthorized access entry barred warning roadblock
📛 name badge identification employee visitor hello sticker tag credential label security visitor
🚫 prohibited sign forbidden banned stop restricted denied cancel disallowed no invalid illegal
💯 hundred points 100 percent perfect full score score top excellent flawless absolute complete max
🔄 counterclockwise arrows counter rotation refresh reload update sync loop retry loop recycle swap
🔃 clockwise vertical arrows reload repeat sync update refresh loop cycle turn around exchange iterate
🔀 shuffle tracks button random mix cross tracks playback unordered variation switch playlist dynamic
🔁 repeat button loop replay repeat track cycle infinite rerun recurrent again duplicate playback
🔂 repeat single button repeat once replay current loop single song cycle recurrent again duplicate
▶️ play button start resume run media execute forward trigger initiate action resume listen watch
⏩ fast forward button speed skip accelerate double speed seek advance push forward rush ahead skip
⏭️ next track button skip next jump forward following proceed advance subsequent leap forward step
⏯️ play or pause button toggle start halt media switch trigger toggle alternate control listen play
◀️ reverse button play backwards rewind reverse orientation left step back inverse prior retreat
⏪ fast reverse button rewind skip backward seek back retreat back track rush back rewind reverse
⏮️ previous track button jump backward track back return rewind back track prior initial rewind step
🔼 upwards button triangle up elevate rise scroll ascend upper higher raise navigate peak roof top
⏫ fast up button double up shift elevate jump top ceiling apex peak ascend high elevation rocket
🔽 downwards button triangle down drop lower scroll descend floor base decline bottom fall deep navigate
⏬ fast down button double down dive drop plunge bottom floor drop base descend deep sink bottom jump
⏸️ pause button halt hold suspend break freeze intermission waiting stand standby delay intermission
⏹️ stop button terminate abort halt square end finish reset conclude power down cancel zero cut
⏺️ record button capture audio video tape red circle streaming surveillance mic capture register save
⏏️ eject button remove disk media pop out release disconnect push unmount hardware external slot detach
🔈 speaker low volume audio sound acoustic soft quiet tone faint whisper output player monitor minimal
🔉 speaker medium volume audio sound acoustic moderate balance regular dynamic level audible podcast voice
🔊 speaker high volume loud audio sound blast noisy amplification max stereo sound concert sonic power
🔇 muted speaker silent mute volume disabled quiet silence peace quiet audio zero no sound cancelled deaf
🚀 rocket space launch boost blast flight ship shuttle cosmos
🛸 flying saucer ufo alien sci fi spacecraft saucer extraterrestrial
🛰️ satellite orbital communication weather gps space solar array
🌌 milky way galaxy space stars universe cosmos nebulae
🪐 ringed planet saturn jupiter orbit outer space gravity
🌍 globe showing europe africa earth world planet geography map
🌎 globe showing americas earth world planet geography western map
🌏 globe showing asia australia earth world planet geography eastern map
🌕 full moon bright night lunar sphere orbit glowing space
🌖 waning gibbous moon phase lunar night space shadow orbit
🌗 last quarter moon phase lunar night space shadow orbit
🌘 waning crescent moon phase lunar night space shadow orbit
🌑 new moon phase lunar dark night space shadow orbit eclipse
🌒 waxing crescent moon phase lunar night space shadow orbit
🌓 first quarter moon phase lunar night space shadow orbit
🌔 waxing gibbous moon phase lunar night space shadow orbit
🌙 crescent moon night dream sleep bedtime silent dark sky
☀️ sun sunny warm bright summer daylight solar morning shine
🌟 glowing star sparkle golden shine rank success glitter flash
⭐ star favorite bookmark yellow golden rate gold point classic
🌠 shooting star meteor wish night cosmic streak falling star
☄️ comet asteroid ice meteor space tail cosmic blazing sky
💥 collision boom explosion impact blast shock loud pow hit
🔥 fire flame hot burn campfire warm bonfire heat ignite blaze
🌈 rainbow pride spectrum colors colorful sky weather vibrant arc
🌪️ tornado twister cyclone whirlwind storm wind vortex funnel
🌊 water wave ocean tsunami sea surf splash blue tides surf
💧 droplet water tear splash sweat leak drop rain fluid aqua
❄️ snowflake cold snow winter freeze ice crystal chilly frost
⛄ snowman without snow winter holiday frost cold festive ice
💨 dashing away wind speed puff fast rush run smoke vapor gas
☁️ cloud overcast weather sky shadow cotton soft air atmosphere
⛅ sun behind cloud partly cloudy daytime weather sky overcast warm
🌧️ cloud with rain wet precipitation storm rainy season weather drops
⛈️ cloud with lightning and rain thunderstorm weather storm shock danger
🌦️ sun behind rain cloud sunshower rainbow weather spring shower sky
🧠 brain mind think smart ai intelligence neurology thought idea
🧬 dna double helix genetics biology science gene medical genome code
🧪 test tube chemistry lab science experiment flask sample beaker
🔬 microscope science biology research lab inspect zoom examine cell
❤️ red heart love romantic passion favorite affection heart
🧡 orange heart love warm friend care energy autumn
💛 yellow heart friendship joy sunny happy golden affection
💚 green heart nature health eco organic environment life
💙 blue heart trust calm loyalty cool peace oceanic classic
💜 purple heart luxury magic royalty compassion regal stylish
🖤 black heart dark gothic edgy shadow classic sorrow emo
🤍 white heart pure clean peaceful angelic innocent gentle
🤎 brown heart warm earthy chocolate coffee cozy snug rustic
💔 broken heart heartbreak breakup sorrow sad pain wounded grief
❣️ heart exclamation mark love alert attention passion punctuation
💕 two hearts floating love affection romance couple sweet fond
💞 revolving hearts spinning love passion connection dynamic adore
💓 beating heart pulse love alive excitement shock vibrance
💗 growing heart expansion love tender affection romance swell
💖 sparkling heart glitz shiny shimmer magic glitter romance
💘 heart with arrow cupid shot in love crush romantic struck
💝 heart with ribbon gift present valentine chocolate surprise token
💟 heart decoration purple square badge sweet ornament crest
🔴 red circle dot record button stop error marker bullet badge
🟠 orange circle dot warning pause marker orange badge bullet
🟡 yellow circle dot caution standby marker amber badge bullet
🟢 green circle dot active live running ok passed success bullet
🔵 blue circle dot info system network indicator primary bullet
🟣 purple circle dot creative special marker purple badge bullet
⚫ black circle dot dark off inactive bullet solid marker
⚪ white circle dot blank light clean bullet clear marker
🟤 brown circle dot earth natural neutral bullet solid marker
🟥 red square block stop critical alert flag indicator corner solid
🟧 orange square block attention medium alert indicator corner solid
🟨 yellow square block caution warning indicator corner solid
🟩 green square block verified pass success ok indicator corner solid
🟦 blue square block system primary tile indicator corner solid
🟪 purple square block special creative tile indicator corner solid
⬛ black square block dark off darkmode tile indicator corner solid
⬜ white square block light clear bright tile indicator corner solid
🟫 brown square block neutral earth wood tile indicator corner solid
🐶 dog puppy pet bark canine friend cute
🐱 cat kitten pet meow feline cute
🦊 fox cunning clever orange wild
🐻 bear teddy wild animal brown
🐼 panda cute bear bamboo china
🦁 lion king wild roar brave cat
🐯 tiger wild cat stripes roar fierce
🐵 monkey cheeky clever animal jungle
🐸 frog toad green ribbit meme pond
🐙 octopus sea creature tentacles kraken ocean
🦋 butterfly insect wings beautiful flutter transformation
🌸 cherry blossom flower sakura pink spring bloom
🌲 evergreen tree pine forest nature wood timber
🍀 four leaf clover lucky fortune irish st patricks
🍎 red apple fruit healthy sweet fresh food
🍕 pizza slice cheese pepperoni fast food tasty
🍔 hamburger burger beef fast food diner lunch
🍟 french fries potato crispy fast food snack
🌮 taco mexican food snack shell dinner
🍣 sushi sashimi japanese seafood raw fish rice
🍦 ice cream soft serve cone dessert sweet summer
🍩 doughnut donut glazed sweet bakery pastry snack
🍺 beer mug drink alcohol bar pub celebration cheers
🍷 wine glass red wine drink alcohol party dinner
☕ hot beverage coffee tea cup caffeine espresso mug morning
🍵 teacup without handle green tea matcha herbal hot drink
🍿 popcorn movie theater snack butter cinema entertainment
🧁 cupcake dessert bakery sweet frosting cake party
🎂 birthday cake celebration party candles anniversary dessert
🍰 shortcake strawberry cake slice pastry dessert sweet`;

export const SELECTABLE_EMOJI_LIST: EmojiCatalogEntry[] = CATALOG_LINES.split('\n').map((line) => {
  const separator = line.indexOf(' ');
  return { emoji: line.slice(0, separator), keywords: line.slice(separator + 1) };
});
