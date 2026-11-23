// ── Static catalog: categories, packages, FAQs, testimonials, SEO routes ──

export const SITE = {
  name: 'Ganga Aarti Booking',
  origin: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SITE_ORIGIN) || 'https://ganga-aarti-wedding.vercel.app',
  phone: '+91 90000 00000',
  whatsapp: '919000000000',
  email: 'namaste@gangaaartibooking.in',
  city: 'Varanasi, Uttar Pradesh',
}

export const CATEGORIES = [
  {
    slug: 'ganga-aarti',
    name: 'Ganga Aarti',
    hindi: 'गंगा आरती',
    icon: '🪔',
    image: '/images/hero-aarti.jpg',
    tagline: 'Shaadi mein Maa Ganga ki divya aarti — venue par ya ghat par',
    startingPrice: 11000,
    unit: 'per event',
    description:
      'Wedding mein Ganga Aarti booking — trained purohiton ki team aapke venue par ya Varanasi ke ghat par Maa Ganga ki bhavya aarti karti hai. Shankhnaad, ghanta-ghadiyal, bade deep aur Vedic mantron ke saath dulha-dulhan aur poora parivaar aashirwad paata hai. Ganga aarti wedding booking ke liye ye hamari sabse khaas seva hai.',
    features: ['5–11 purohiton ki team', 'Bade aarti deep, shankh aur ghante', 'Dulha-dulhan ke liye vishesh sankalp', 'Venue ya ghat — dono vyavastha', 'Phool, diya aur prasad samagri shamil'],
    keywords: 'ganga aarti wedding booking, shaadi mein ganga aarti, ganga aarti for wedding varanasi',
    faqs: [
      ['Kya Ganga Aarti shaadi ke venue par ho sakti hai?', 'Haan. Hamari purohit team aapke marriage lawn, hotel ya banquet hall mein poori vidhi ke saath Ganga Aarti karti hai. Varanasi mein ghat par aarti ka bhi vikalp hai.'],
      ['Aarti mein kitna samay lagta hai?', 'Poori aarti lagbhag 30–45 minute ki hoti hai, sankalp aur aashirwad sahit.'],
      ['Booking kitne din pehle karni chahiye?', 'Kam se kam 7–10 din pehle booking karein taaki date aur team pakki ho jaye. Shubh muhurat wale dinon mein 3–4 hafte pehle booking behtar hai.'],
    ],
  },
  {
    slug: 'pandit-ji',
    name: 'Pandit Ji',
    hindi: 'पंडित जी',
    icon: '🙏',
    image: '/images/pandit-puja.jpg',
    tagline: 'Shaadi ke liye anubhavi Pandit Ji — poori vidhi, sahi muhurat',
    startingPrice: 5100,
    unit: 'per event',
    description:
      'Shaadi ke liye Pandit Ji booking — Vedic vidhi se vivah sanskar, kanyadaan, phere, Ganesh pujan aur griha pravesh. Hamare Pandit Ji 10+ saal ke anubhav ke saath Hindi mein har vidhi ka arth samjhate hue puja karate hain, taaki parivaar ke sab log jud sakein.',
    features: ['Vedic vidhi se sampurn vivah', 'Muhurat aur kundli paramarsh', 'Puja samagri ki list pehle se', 'Hindi mein vidhi ka varnan', 'Satyanarayan katha / griha pravesh bhi uplabdh'],
    keywords: 'shaadi ke liye pandit ji, wedding pandit booking varanasi, vivah puja pandit',
    faqs: [
      ['Kya puja samagri bhi aap dete hain?', 'Samagri ki poori list hum pehle dete hain. Chaahein to samagri sahit package bhi le sakte hain — quotation mein chun lein.'],
      ['Pandit Ji kaun si parampara se puja karte hain?', 'Sanatan Vedic parampara se. Kashi ke anubhavi purohit uplabdh hain; kshetriya reeti (UP, Bihar, Bengali, Marwari) ke anusaar bhi vyavastha ho sakti hai.'],
    ],
  },
  {
    slug: 'gaadi',
    name: 'Gaadi (Wedding Cars)',
    hindi: 'गाड़ी',
    icon: '🚗',
    image: '/images/wedding-car.jpg',
    tagline: 'Baraat aur vidaai ke liye sajji hui gaadiyan — driver sahit',
    startingPrice: 2500,
    unit: 'per day',
    description:
      'Wedding car booking Varanasi — dulhe ki gaadi, baraat ke liye gaadiyan aur mehmaanon ke liye cab. Swift Dzire se lekar Innova Crysta aur luxury sedan tak, phoolon se sajji gaadi, saaf-suthra driver aur samay par seva.',
    features: ['Phoolon se sajawat shamil', 'Anubhavi, vinamr driver', 'Baraat, vidaai, airport pickup', 'AC gaadiyan, saaf interior', 'Ghante ya din ke hisaab se booking'],
    keywords: 'wedding car booking varanasi, shaadi ke liye gaadi, baraat car hire',
    faqs: [
      ['Gaadi ki sajawat ka alag charge hai?', 'Basic phool sajawat package mein shamil hai. Vishesh theme sajawat ke liye quotation mein batayein.'],
      ['Outstation (doosre shahar) ke liye gaadi milegi?', 'Haan, Varanasi se UP ke sabhi pramukh shaharon ke liye gaadi uplabdh hai.'],
    ],
  },
  {
    slug: 'tent-decoration',
    name: 'Tent & Decoration',
    hindi: 'टेंट व सजावट',
    icon: '🎪',
    image: '/images/tent-decor.jpg',
    tagline: 'Mandap, stage, phool aur lighting — sapno jaisi sajawat',
    startingPrice: 15000,
    unit: 'per event',
    description:
      'Wedding tent aur decoration booking — shaadi ka mandap, jaimala stage, entry gate, phoolon ki sajawat, LED lighting aur baithne ki vyavastha. Chhote ghar ki shaadi se lekar bade marriage lawn tak, har budget ke liye package.',
    features: ['Mandap + jaimala stage', 'Taaze phool aur theme sajawat', 'LED aur fairy lighting', 'Kursi, sofa, table vyavastha', 'Generator backup vikalp'],
    keywords: 'wedding tent booking, shaadi decoration varanasi, mandap sajawat',
    faqs: [
      ['Kya site visit karke estimate milta hai?', 'Haan, bade events ke liye hamari team venue dekhkar sahi quotation deti hai.'],
      ['Barish ke liye waterproof vyavastha hai?', 'Haan, waterproof tent aur covered stage ke vikalp uplabdh hain.'],
    ],
  },
  {
    slug: 'dj-sound',
    name: 'DJ & Sound',
    hindi: 'डीजे व साउंड',
    icon: '🎧',
    image: '/images/dj-setup.jpg',
    tagline: 'Sangeet aur baraat ke liye DJ, dhol aur sound system',
    startingPrice: 8000,
    unit: 'per event',
    description:
      'Wedding DJ booking — sangeet night, haldi aur baraat ke liye professional DJ, powerful sound system, LED screen aur dhol wala. Bollywood, Bhojpuri aur purane geeton ka perfect mix, parivaar ke hisaab se playlist.',
    features: ['Professional DJ + anchor vikalp', 'Baraat ke liye dhol + DJ on wheels', 'LED screen aur lighting', 'Wireless mic vyavastha', 'Parivaar ki playlist pehle se taiyaar'],
    keywords: 'wedding dj booking varanasi, shaadi dj sound, sangeet dj',
    faqs: [
      ['Raat ko kitne baje tak DJ chal sakta hai?', 'Sthaniya niyamon ke anusaar aam taur par 10 baje tak tez awaaz ki anumati hoti hai; uske baad halki awaaz mein karyakram jaari reh sakta hai.'],
    ],
  },
  {
    slug: 'catering',
    name: 'Catering',
    hindi: 'कैटरिंग',
    icon: '🍛',
    image: '/images/catering-wedding.jpg',
    tagline: 'Shaadi ka khana — satvik, shakahari aur multi-cuisine menu',
    startingPrice: 350,
    unit: 'per plate',
    description:
      'Wedding catering booking — Banarasi satvik khana, North Indian, chaat counter, mithaas aur live counter. Bina lahsun-pyaaz ka khana bhi uplabdh. Safai aur swaad ki poori guarantee ke saath trained serving staff.',
    features: ['Satvik / bina lahsun-pyaaz vikalp', 'Live chaat aur tandoor counter', 'Trained serving staff', 'Pehle tasting ki suvidha (bade order par)', '300–5000 mehmaanon tak ki vyavastha'],
    keywords: 'wedding catering varanasi, shaadi ka khana booking, satvik catering',
    faqs: [
      ['Minimum kitne plate ka order hota hai?', 'Aam taur par 100 plate se shuruaat hoti hai. Chhote karyakram ke liye quotation maangein.'],
    ],
  },
  {
    slug: 'photography',
    name: 'Photography & Video',
    hindi: 'फोटोग्राफी',
    icon: '📸',
    image: '/images/photography-wedding.jpg',
    tagline: 'Candid photography, film aur drone — yaadein hamesha ke liye',
    startingPrice: 15000,
    unit: 'per event',
    description:
      'Wedding photography booking — candid aur traditional photography, cinematic wedding film, drone shots aur same-day teaser. Dulha-dulhan ke har khaas pal ko khoobsurati se capture karne wali anubhavi team.',
    features: ['Candid + traditional dono style', 'Cinematic film aur teaser', 'Drone coverage vikalp', 'Premium album design', '7–15 din mein delivery'],
    keywords: 'wedding photography varanasi, shaadi photographer booking, candid wedding photography',
    faqs: [
      ['Photos kitne din mein milti hain?', 'Edited photos 7–10 din aur film 15 din ke andar mil jaati hai. Teaser 2–3 din mein.'],
    ],
  },
  {
    slug: 'band-baja',
    name: 'Band Baja',
    hindi: 'बैंड बाजा',
    icon: '🥁',
    image: '/images/band-baja.jpg',
    tagline: 'Baraat ke liye brass band, ghoda gaadi aur mashal',
    startingPrice: 5100,
    unit: 'per event',
    description:
      'Baraat band baja booking — traditional brass band, shehnai, ghoda/gaadi, mashal aur आतिशबाज़ी ki vyavastha. Dulhe ki savari se lekar dwar puja tak, poori baraat shandaar.',
    features: ['Brass band 8–21 kalakar', 'Safed ghoda aur sajji baggi', 'Mashal aur lighting vyavastha', 'Shehnai vaadan vikalp', 'Uniform wala band'],
    keywords: 'band baja booking varanasi, baraat band, shaadi ghoda gaadi',
    faqs: [
      ['Band mein kitne log hote hain?', 'Package ke hisaab se 8 se 21 kalakar hote hain. Quotation mein apni pasand batayein.'],
    ],
  },
]

export const categoryBySlug = (slug) => CATEGORIES.find((c) => c.slug === slug)

export const AARTI_PACKAGES = [
  {
    id: 'pkg-shubh-aarti',
    name: 'Shubh Aarti Ceremony',
    hindi: 'शुभ आरती',
    price: 11000,
    unit: 'per event',
    category: 'ganga-aarti',
    image: '/images/couple-aarti.jpg',
    features: ['5 purohiton dwara Ganga Aarti', 'Dulha-dulhan sankalp aur aashirwad', 'Diya, phool, prasad samagri shamil', 'Venue par vyavastha (Varanasi kshetra)', 'Aarti avadhi ~30 minute'],
  },
  {
    id: 'pkg-family-aarti',
    name: 'Family Ganga Aarti',
    hindi: 'पारिवारिक गंगा आरती',
    price: 21000,
    unit: 'per event',
    category: 'ganga-aarti',
    image: '/images/hero-aarti.jpg',
    popular: true,
    features: ['7 purohiton dwara bhavya Ganga Aarti', 'Poora parivaar shamil — sankalp sabke naam se', 'Ganga jal kalash aur prasad vyavastha', 'Venue ya Dashashwamedh/Assi ghat vikalp', 'Shankhnaad aur ghanta-ghadiyal ke saath', 'Aarti avadhi ~45 minute'],
  },
  {
    id: 'pkg-grand-aarti',
    name: 'Grand Wedding Aarti',
    hindi: 'भव्य विवाह आरती',
    price: 51000,
    unit: 'per event',
    category: 'ganga-aarti',
    image: '/images/grand-aarti.jpg',
    features: ['11 purohiton dwara mahaaarti', 'Vishesh sajawat — 501 diya aur phool', 'Dulha-dulhan ke liye Ganga snan-sankalp (ghat par)', 'Live streaming ghar baithe parivaar ke liye', 'Prasad aur Ganga jal ghar tak', 'Poora event coordinator shamil'],
  },
]

export const PANDIT_PACKAGES = [
  { id: 'pkg-pandit-shubh', name: 'Shubh Vivah Puja', price: 5100, unit: 'per event', category: 'pandit-ji', image: '/images/pandit-puja.jpg', features: ['Ganesh pujan + vivah sanskar', 'Anubhavi Pandit Ji (10+ varsh)', 'Samagri list pehle se', 'Avadhi ~2–3 ghante'] },
  { id: 'pkg-pandit-sampurn', name: 'Sampurn Vivah Sanskar', price: 11000, unit: 'per event', category: 'pandit-ji', image: '/images/pandit-puja.jpg', popular: true, features: ['Haldi se vidaai tak saari vidhi', 'Kanyadaan, phere, sindoor-daan', 'Samagri sahit package vikalp', 'Do Pandit Ji ki team'] },
  { id: 'pkg-pandit-grand', name: 'Vivah + Griha Pravesh + Satyanarayan Katha', price: 21000, unit: 'per event', category: 'pandit-ji', image: '/images/pandit-puja.jpg', features: ['Vivah sanskar sampurn', 'Griha pravesh puja', 'Satyanarayan katha', 'Kundli aur muhurat paramarsh shamil'] },
]

export const TESTIMONIALS = [
  { name: 'Priya & Rohit Sharma', city: 'Varanasi', text: 'Hamari shaadi mein Ganga Aarti sabse yaadgaar pal tha. Jaise hi bade deep jale aur shankhnaad hua, saare mehmaan bhavuk ho gaye. Team samay par aayi aur sab kuchh bahut vyavasthit tha.', service: 'Family Ganga Aarti' },
  { name: 'Anjali Gupta', city: 'Lucknow', text: 'Ek hi jagah se pandit ji, gaadi aur decoration sab book ho gaya. Quotation pehle mila, koi chhupa charge nahi. Maa ko satvik khana bahut pasand aaya.', service: 'Pandit Ji + Catering' },
  { name: 'Vikash Yadav', city: 'Jaunpur', text: 'Baraat ke liye band baja aur DJ dono yahin se liya. Rates bazaar se kam aur kaam professional. Vidaai ki gaadi phoolon se itni sundar sajji thi!', service: 'Band Baja + DJ' },
  { name: 'Sunita Mishra', city: 'Prayagraj', text: 'Beti ki shaadi mein Grand Wedding Aarti karayi. Ghat par mahaul divya tha — jaise Kashi ki aarti hamare parivaar ke liye ho rahi ho. Dhanyavaad is seva ke liye.', service: 'Grand Wedding Aarti' },
]

export const GENERAL_FAQS = [
  ['Booking kaise hoti hai?', 'Pehle free quotation maangein — service, shaadi ki date aur shahar batayein. Partners aapko rate bhejenge. Jo quotation pasand aaye use accept karein, booking pakki ho jayegi.'],
  ['Kya advance payment karna padta hai?', 'Booking pakki karne ke liye aam taur par 25% advance lagta hai. Baaki rakam karyakram ke din seva ke baad. Har partner ki shartein quotation mein saaf likhi hoti hain.'],
  ['Kaun-kaun se shaharon mein seva milti hai?', 'Varanasi hamara mukhyalaya hai. UP ke pramukh shahar — Lucknow, Prayagraj, Jaunpur, Gorakhpur, Ayodhya — mein bhi adhiktar sevayein uplabdh hain.'],
  ['Booking cancel karni ho to?', 'Shaadi ki date se 15 din pehle tak cancel karne par advance ka adhiktar hissa wapas milta hai. Vishesh shartein booking page par dikhti hain.'],
  ['Partner (vendor) kaise banein?', 'Sign up karte samay "Partner" chunein. Apne products/services add karein, quotation bhejein aur booking paayein. Commission sirf pakki booking par lagta hai.'],
  ['Ganga Aarti ke liye kya-kya taiyaari humein karni hoti hai?', 'Kuchh nahi — purohit, samagri, sajawat sab hamari team laati hai. Sirf venue par ek saaf jagah aur samay par upasthiti chahiye.'],
]

export const GALLERY = [
  { src: '/images/hero-aarti.jpg', caption: 'Shaadi samaroh mein Ganga Aarti' },
  { src: '/images/couple-aarti.jpg', caption: 'Dulha-dulhan ki pehli aarti' },
  { src: '/images/pandit-puja.jpg', caption: 'Pandit Ji dwara vivah puja' },
  { src: '/images/tent-decor.jpg', caption: 'Mandap aur stage sajawat' },
  { src: '/images/wedding-car.jpg', caption: 'Vidaai ke liye sajji gaadi' },
  { src: '/images/dj-setup.jpg', caption: 'Sangeet night DJ' },
]

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
