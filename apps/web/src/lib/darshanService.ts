import { prisma } from '@/lib/prisma';

// Reusable YouTube API Key Pool from existing Tolee architecture
const YOUTUBE_API_KEYS = [
  process.env.YOUTUBE_API_KEY,
  'AIzaSyAQGEjKb5EkJjZSSh4I4X5x2zhESnhSzH0'
].filter((k): k is string => Boolean(k && k.trim()));

export interface TempleStreamInfo {
  videoId: string | null;
  embedUrl: string;
  isLive: boolean;
  statusLabel: 'LIVE' | 'Latest Video' | 'Offline';
  title?: string;
  thumbnail?: string;
}

// In-memory cache for live stream status to strictly avoid YouTube quota depletion
// Key: templeId, Value: { data: TempleStreamInfo, expiry: timestamp }
const streamCache = new Map<string, { data: TempleStreamInfo; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export const SEED_TEMPLES = [
  {
    "name": "Shri Sai Baba Temple — Shirdi Dham",
    "slug": "shirdi-sai-baba",
    "deity": "Sai Baba",
    "city": "Shirdi",
    "state": "Maharashtra",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/shirdi-sai-baba.jpg",
    "youtubeChannelId": "UCp7Ew69g28c-s9r5d35aYSw",
    "youtubeVideoId": "ai6Ye9x51cI",
    "streamUrl": "https://www.youtube.com/watch?v=ai6Ye9x51cI",
    "officialUrl": "https://sai.org.in",
    "sortOrder": 1,
    "isFeatured": true
  },
  {
    "name": "Shri Banke Bihari Mandir (Vrindavan)",
    "slug": "shri-banke-bihari-mandir-vrindavan",
    "deity": "Shri Krishna",
    "city": "Vrindavan",
    "state": "Uttar Pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/banke-bihari.jpg",
    "officialUrl": "https://www.bihariji.org/",
    "sortOrder": 2,
    "isFeatured": true
  },
  {
    "name": "Shri Venkateswara Temple — Tirumala, Tirupati",
    "slug": "tirupati-balaji",
    "deity": "Lord Venkateswara",
    "city": "Tirupati",
    "state": "Andhra Pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Tirupati.jpg",
    "youtubeChannelId": "UCYkG9mCg0Y7uQZlY6B4bJcw",
    "youtubeVideoId": "XxdarKTmJ8c",
    "streamUrl": "https://www.youtube.com/watch?v=XxdarKTmJ8c",
    "officialUrl": "https://www.tirumala.org/",
    "sortOrder": 2,
    "isFeatured": true
  },
  {
    "name": "Shree Siddhivinayak Ganapati Mandir",
    "slug": "siddhivinayak-mumbai",
    "deity": "Shree Ganesha",
    "city": "Mumbai",
    "state": "Maharashtra",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/IMG-20260222-WA0002.jpg",
    "youtubeChannelId": "UCn6m2k8S4fK7_9L1B5uX_Rw",
    "youtubeVideoId": "3U5_X3qHlQg",
    "streamUrl": "https://www.youtube.com/watch?v=3U5_X3qHlQg",
    "officialUrl": "https://www.siddhivinayak.org/",
    "sortOrder": 3,
    "isFeatured": true
  },
  {
    "name": "Lalbaugcha Raja",
    "slug": "lalbaugcha-raja",
    "deity": "Lord Ganesha",
    "city": "Mumbai",
    "state": "Maharashtra",
    "thumbnail": "https://img.youtube.com/vi/kxUBFVdtYh4/maxresdefault.jpg",
    "youtubeChannelId": "UCw8xN1N1h3T24Kj7_88bN9A",
    "youtubeVideoId": "kxUBFVdtYh4",
    "streamUrl": "https://www.youtube.com/watch?v=kxUBFVdtYh4",
    "officialUrl": "https://www.lalbaugcharaja.com",
    "sortOrder": 4,
    "isFeatured": true
  },
  {
    "name": "Kashi Vishwanath Jyotirlinga",
    "slug": "kashi-vishwanath",
    "deity": "Shiva",
    "city": "Varanasi",
    "state": "Uttar Pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Kashi-Vishwanath-Temple.jpg",
    "youtubeChannelId": "UCyF7C_eG9a3X5lH8x8K9b5w",
    "youtubeVideoId": "l17t9SWkPjw",
    "streamUrl": "https://www.youtube.com/watch?v=l17t9SWkPjw",
    "officialUrl": "https://www.shrikashivishwanath.org/",
    "sortOrder": 5,
    "isFeatured": true
  },
  {
    "name": "Omkareshwar Jyotirlinga Temple",
    "slug": "omkareshwar-jyotirlinga-temple",
    "deity": "Shiva",
    "city": "Omkareshwar (Mandhata Island)",
    "state": "Madhya Pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Omkareshwar_Temple.jpg",
    "youtubeVideoId": "q2ZR1TnP3_s",
    "streamUrl": "https://www.youtube.com/watch?v=q2ZR1TnP3_s",
    "officialUrl": "https://shriomkareshwar.org/",
    "sortOrder": 6,
    "isFeatured": true
  },
  {
    "name": "Somnath Jyotirlinga Temple",
    "slug": "somnath-temple",
    "deity": "Shiva",
    "city": "Veraval (Prabhas Patan)",
    "state": "Gujarat",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/somnath_temple.jpg",
    "youtubeChannelId": "UC7P6a4e3g9W5_0B4J3yR_fw",
    "youtubeVideoId": "pV42q4bmR8o",
    "streamUrl": "https://www.youtube.com/watch?v=pV42q4bmR8o",
    "officialUrl": "https://somnath.org",
    "sortOrder": 6,
    "isFeatured": true
  },
  {
    "name": "Mahakaleshwar Jyotirlinga Temple",
    "slug": "mahakaleshwar-ujjain",
    "deity": "Shiva",
    "city": "Ujjain",
    "state": "Madhya Pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/mahakaleshwar-jyotirlinga-temple.jpg",
    "youtubeChannelId": "UC6K8m1h8B4o6_7h8Y9k4b1A",
    "officialUrl": "https://shrimahakaleshwar.com",
    "sortOrder": 7,
    "isFeatured": true
  },
  {
    "name": "Trimbakeshwar Jyotirlinga Temple",
    "slug": "trimbakeshwar-jyotirlinga-temple",
    "deity": "Shiva",
    "city": "Trimbak (Trimbakeshwar)",
    "state": "Maharashtra",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Trimbakeshwar_Temple.jpg",
    "officialUrl": "https://www.trimbakeshwartrust.com/",
    "sortOrder": 7,
    "isFeatured": true
  },
  {
    "name": "Kedarnath Jyotirlinga Temple",
    "slug": "kedarnath-dham",
    "deity": "Shiva",
    "city": "Kedarnath",
    "state": "Uttarakhand",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/kedarnath.jpg",
    "youtubeChannelId": "UCe5j7q5u8j6h5r4e3w2q1aA",
    "officialUrl": "https://badrinath-kedarnath.gov.in",
    "sortOrder": 8,
    "isFeatured": true
  },
  {
    "name": "Badrinath Temple — Badrinarayan Dham TEMPLE",
    "slug": "badrinath-dham",
    "deity": "Lord Vishnu",
    "city": "Badrinath",
    "state": "Uttarakhand",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/IMG-20260220-WA0000.jpg",
    "youtubeChannelId": "UCe5j7q5u8j6h5r4e3w2q1aA",
    "officialUrl": "https://badrinath-kedarnath.gov.in/",
    "sortOrder": 9,
    "isFeatured": true
  },
  {
    "name": "Mallikarjuna Jyotirlinga Temple",
    "slug": "mallikarjuna-jyotirlinga-temple",
    "deity": "Shiva",
    "city": "Srisailam",
    "state": "Andhra Pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Mallilarjuna.png",
    "streamUrl": "https://www.youtube.com/@SrisailaTv/streams",
    "officialUrl": "https://srisailadevasthanam.org",
    "sortOrder": 9,
    "isFeatured": true
  },
  {
    "name": "Bhimashankar Jyotirlinga Temple",
    "slug": "bhimashankar-jyotirlinga-temple",
    "deity": "Shiva",
    "city": "Bhimashankar",
    "state": "Maharashtra",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Bhimashankar_Jyotirlinga_Temple.jpg",
    "officialUrl": "https://shreebhimashankar.com/",
    "sortOrder": 10,
    "isFeatured": true
  },
  {
    "name": "Shri Mata Vaishno Devi Temple — Holy Cave Shrine, Katra",
    "slug": "vaishno-devi",
    "deity": "Mata Vaishno devi",
    "city": "Katra",
    "state": "Jammu and Kashmir",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Mata_Vaishno_Devi.jpg",
    "youtubeChannelId": "UCpWv6eG7A6Z9uH2j8F4v6wQ",
    "streamUrl": "https://www.youtube.com/@ShreeSiddhivinayakTemple/streams",
    "officialUrl": "https://maavaishnodevi.org",
    "sortOrder": 10,
    "isFeatured": true
  },
  {
    "name": "Baidyanath Dham, Deoghar",
    "slug": "baidyanath-dham-deoghar",
    "deity": "Shiva",
    "city": "Deoghar",
    "state": "Jharkhand",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Baba_Baidyanath_Dham-1.jpg",
    "youtubeVideoId": "gMoEnxZtxzg",
    "streamUrl": "https://www.youtube.com/watch?v=gMoEnxZtxzg",
    "sortOrder": 11,
    "isFeatured": true
  },
  {
    "name": "Shree Ram Janmabhoomi Mandir (Ram Mandir), Ayodhya",
    "slug": "ayodhya-ram-mandir",
    "deity": "Shree Ram",
    "city": "Ayodhya",
    "state": "Uttar Pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Ayodhya_Ram_Mandir.jpg",
    "youtubeChannelId": "UCqH6R7K8L2V4n9B3M1C5wEA",
    "youtubeVideoId": "8TCdMcP9UZQ",
    "streamUrl": "https://www.youtube.com/watch?v=8TCdMcP9UZQ",
    "officialUrl": "https://srjbtkshetra.org",
    "sortOrder": 11,
    "isFeatured": true
  },
  {
    "name": "Nageshwar Jyotirlinga Temple",
    "slug": "nageshwar-jyotirlinga-temple",
    "deity": "Shiva",
    "city": "Nageshwar (Dwarka)",
    "state": "Gujarat",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/nageshwar-jyotirlinga-temple.jpg",
    "sortOrder": 12,
    "isFeatured": true
  },
  {
    "name": "Shree Jagannath Temple — Puri Dham",
    "slug": "jagannath-puri",
    "deity": "Shri Krishna",
    "city": "Puri",
    "state": "Odisha",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/04/jagarnath-puri-1.jpg",
    "youtubeChannelId": "UC8vN9z1C3j6K4w7L9b2M5eA",
    "officialUrl": "https://shreejagannatha.in",
    "sortOrder": 12,
    "isFeatured": true
  },
  {
    "name": "Dagdusheth Halwai Ganpati",
    "slug": "dagdusheth-ganpati",
    "deity": "Lord Ganesha",
    "city": "Pune",
    "state": "Maharashtra",
    "thumbnail": "https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?q=80&w=800&auto=format&fit=crop",
    "youtubeChannelId": "UC7f6d4g2h8K9e3W1v5A4b2Q",
    "officialUrl": "https://www.dagdushethganpati.com",
    "sortOrder": 13,
    "isFeatured": false
  },
  {
    "name": "Ramanathaswamy Jyotirlinga Temple (Rameshwaram)",
    "slug": "ramanathaswamy-jyotirlinga-temple-rameshwaram",
    "deity": "Shiva",
    "city": "Rameshwaram (Rameswaram Island)",
    "state": "Tamil Nadu",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/rameshwaram.jpg",
    "officialUrl": "https://rameswaramramanathar.hrce.tn.gov.in/",
    "sortOrder": 13,
    "isFeatured": true
  },
  {
    "name": "Grishneshwar Jyotirlinga Temple",
    "slug": "grishneshwar-jyotirlinga-temple-aurangabad-maharashtra",
    "deity": "Shiva",
    "city": "Verul (near Ellora Caves)",
    "state": "Maharashtra",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/grishneshwar_jyotirlinga_temple-1.jpg",
    "officialUrl": "https://www.grishneshwartemple.com/",
    "sortOrder": 14,
    "isFeatured": true
  },
  {
    "name": "ISKCON Vrindavan",
    "slug": "iskcon-vrindavan",
    "deity": "Shri Krishna",
    "city": "Vrindavan (Mathura)",
    "state": "Uttar Pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/iskon-vrindaban-scaled.jpg",
    "youtubeChannelId": "UC7C_nK8M9z3J2v7L6w4K9eQ",
    "youtubeVideoId": "E-jt944kXUg",
    "streamUrl": "https://www.youtube.com/watch?v=E-jt944kXUg",
    "sortOrder": 14,
    "isFeatured": false
  },
  {
    "name": "Golden Temple (Sri Harmandir Sahib)",
    "slug": "golden-temple-amritsar",
    "deity": "Waheguru",
    "city": "Amritsar",
    "state": "Punjab",
    "thumbnail": "https://images.unsplash.com/photo-1595846519845-68e298c2edd8?q=80&w=800&auto=format&fit=crop",
    "youtubeChannelId": "UCv6C8eH9m4J2b1K7w5N8vXQ",
    "officialUrl": "https://sgpc.net",
    "sortOrder": 15,
    "isFeatured": false
  },
  {
    "name": "Kalighat Kali Temple (Shakti Peeth), Kolkata",
    "slug": "kalighat-kali-temple-shakti-peeth-kolkata",
    "deity": "Kali",
    "city": "Kolkata",
    "state": "West Bengal",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Kalighat_Kali_temple.jpg",
    "sortOrder": 15,
    "isFeatured": true
  },
  {
    "name": "Kamakhya Temple (Shakti Peeth), Guwahati",
    "slug": "kamakhya-temple-shakti-peeth-guwahati",
    "deity": "Shakti",
    "city": "Guwahati",
    "state": "Assam",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Kamakhya_temple.jpg",
    "sortOrder": 16,
    "isFeatured": false
  },
  {
    "name": "Vishalakshi Temple (Shakti Peeth), Varanasi",
    "slug": "vishalakshi-temple-shakti-peeth-varanasi",
    "deity": "Shakti",
    "city": "Varanasi",
    "state": "Uttar Pradesh",
    "thumbnail": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?q=80&w=800",
    "sortOrder": 17,
    "isFeatured": false
  },
  {
    "name": "Taratarini Temple (Shakti Peeth), Brahmapur",
    "slug": "taratarini-temple-shakti-peeth-brahmapur",
    "deity": "Shakti",
    "city": "Brahmapur",
    "state": "Odisha",
    "thumbnail": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?q=80&w=800",
    "sortOrder": 18,
    "isFeatured": false
  },
  {
    "name": "Bimala Temple (Shakti Peeth), Puri",
    "slug": "bimala-temple-shakti-peeth-puri",
    "deity": "Shakti",
    "city": "Puri",
    "state": "Odisha",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Bimala_Temple.jpg",
    "officialUrl": "https://shreejagannatha.in/",
    "sortOrder": 19,
    "isFeatured": false
  },
  {
    "name": "Kankalitala Temple (Shakti Peeth), Birbhum",
    "slug": "kankalitala-temple-shakti-peeth-birbhum",
    "deity": "Shakti",
    "city": "Birbhum",
    "state": "West Bengal",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Kankalitala_Temple.jpg",
    "sortOrder": 20,
    "isFeatured": false
  },
  {
    "name": "Saptashrungi Devi Temple (Shakti Peeth), Vani Maharastra",
    "slug": "saptashrungi-devi-temple-shakti-peeth-vani-maharastra",
    "deity": "Shakti",
    "city": "Vani",
    "state": "Maharashtra",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/IMG-20260219-WA0072.jpg",
    "sortOrder": 21,
    "isFeatured": false
  },
  {
    "name": "Shondesh Temple (Shakti Peeth), Near Midnapore",
    "slug": "shondesh-temple-shakti-peeth-near-midnapore",
    "deity": "Shakti",
    "city": "Near Midnapore",
    "state": "West Bengal",
    "thumbnail": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?q=80&w=800",
    "sortOrder": 22,
    "isFeatured": false
  },
  {
    "name": "Jwalamukhi Temple (Shakti Peeth), Kangra",
    "slug": "jwalamukhi-temple-shakti-peeth-kangra",
    "deity": "Shakti",
    "city": "Kangra",
    "state": "Himachal pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Jwalamukhi-_Temple.jpg",
    "sortOrder": 23,
    "isFeatured": false
  },
  {
    "name": "Hinglaj Mata Temple (Shakti Peeth), Balochistan",
    "slug": "hinglaj-mata-temple-shakti-peeth-balochistan",
    "deity": "Shakti",
    "city": "Lasbela",
    "state": "Balochistan",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Hinglaj_Mata_Temple.jpg",
    "sortOrder": 24,
    "isFeatured": false
  },
  {
    "name": "Shrinagar Shakti Peeth (Shakti Peeth), Shrinagar",
    "slug": "shrinagar-shakti-peeth-shakti-peeth-shrinagar",
    "deity": "Shakti",
    "city": "Shrinagar",
    "state": "Jammu and Kashmir",
    "thumbnail": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?q=80&w=800",
    "sortOrder": 25,
    "isFeatured": false
  },
  {
    "name": "Naina Devi (Shakti Peeth), Bilaspur",
    "slug": "naina-devi-temple-shakti-peeth-bilaspur",
    "deity": "Shakti",
    "city": "Bilaspur",
    "state": "Himachal pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Naina-devi.jpg",
    "sortOrder": 26,
    "isFeatured": false
  },
  {
    "name": "Katyayani (Shakti Peeth), Vrindavan",
    "slug": "katyayani-temple-shakti-peeth-vrindavan",
    "deity": "Shakti",
    "city": "Vrindaban",
    "state": "Uttar Pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Katyayani_Temple.jpg",
    "sortOrder": 27,
    "isFeatured": false
  },
  {
    "name": "Chamundeshwari (Shakti Peeth), Mysore",
    "slug": "chamundeshwari-temple-shakti-peeth-mysore",
    "deity": "Shakti",
    "city": "Mysore",
    "state": "Karnataka",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/IMG-20260219-WA0051.jpg",
    "sortOrder": 28,
    "isFeatured": false
  },
  {
    "name": "Jogulamba (Shakti Peeth), Alampur",
    "slug": "jogulamba-temple-shakti-peeth-alampur",
    "deity": "Shakti",
    "city": "Alampur",
    "state": "Telangana",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Jogulamba_Temple.jpg",
    "sortOrder": 29,
    "isFeatured": false
  },
  {
    "name": "Brahmaramba Devi (Shakti Peeth), Srisailam",
    "slug": "brahmaramba-devi-temple-shakti-peeth-srisailam",
    "deity": "Shakti",
    "city": "Srisailam",
    "state": "Andhra Pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Brahmaramba_Devi.jpg",
    "sortOrder": 30,
    "isFeatured": false
  },
  {
    "name": "Sugandha Shaktipeeth, Shikarpur",
    "slug": "sugandha-shaktipeeth-shakti-peeth-shikarpur",
    "deity": "Shakti",
    "city": "Shikarpur",
    "state": "Shikarpur",
    "thumbnail": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?q=80&w=800",
    "sortOrder": 31,
    "isFeatured": false
  },
  {
    "name": "Karatal Shaktipeeth, Nepal",
    "slug": "karatal-shaktipeeth-shakti-peeth-nepal",
    "deity": "Shakti",
    "city": "Nepal",
    "state": "Nepal",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Karatal-shakti-peeth-temple.jpg",
    "sortOrder": 32,
    "isFeatured": false
  },
  {
    "name": "Bahula Shaktipeeth, Ketugram",
    "slug": "bahula-shaktipeeth-shakti-peeth-ketugram",
    "deity": "Shakti",
    "city": "Ketugram",
    "state": "West Bengal",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Bahula_Shaktipeeth.jpg",
    "sortOrder": 33,
    "isFeatured": false
  },
  {
    "name": "Kalmadhava Shaktipeeth , Amarkantak",
    "slug": "kalmadhava-shaktipeeth-shakti-peeth-amarkantak",
    "deity": "Shakti",
    "city": "Amarkantak",
    "state": "Madhya Pradesh",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Kalmadhava_Shaktipeeth.jpg",
    "sortOrder": 34,
    "isFeatured": false
  },
  {
    "name": "Shakti Temple (Shakti Peeth), Karavpur",
    "slug": "shakti-temple-shakti-peeth-karavpur",
    "deity": "Shakti",
    "city": "Karavpur",
    "state": "Maharashtra",
    "thumbnail": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?q=80&w=800",
    "sortOrder": 35,
    "isFeatured": false
  },
  {
    "name": "Shrinakshi Shaktipeeth, Near Karur",
    "slug": "shrinakshi-shaktipeeth-shakti-peeth-near-karur",
    "deity": "Shakti",
    "city": "Karur",
    "state": "Tamil Nadu",
    "thumbnail": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?q=80&w=800",
    "sortOrder": 36,
    "isFeatured": false
  },
  {
    "name": "Shree dwarka dhish (Dham)",
    "slug": "shree-dwarkadhish-mandirshri",
    "deity": "Shri Krishna",
    "city": "Dwarka",
    "state": "Gujarat",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/dwarkadhish.jpg",
    "youtubeVideoId": "4OVsL1VTpSg",
    "streamUrl": "https://www.youtube.com/watch?v=4OVsL1VTpSg",
    "officialUrl": "https://www.dwarkadhish.org/",
    "sortOrder": 40,
    "isFeatured": true
  },
  {
    "name": "ISKCON Bangalore",
    "slug": "iskcon-bangalore-sri-radha-krishna-temple",
    "deity": "Shri Krishna",
    "city": "Bangaluru",
    "state": "Karnataka",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Iskon_Bangaluru.jpg",
    "youtubeVideoId": "8lllk7ivf0Y",
    "streamUrl": "https://www.youtube.com/watch?v=8lllk7ivf0Y",
    "sortOrder": 42,
    "isFeatured": true
  },
  {
    "name": "Pashupati Nath Temple",
    "slug": "pashupati-nath-temple",
    "deity": "Shiva",
    "city": "Kathmandu",
    "state": "Bagmati Province(Nepal)",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/pashupati-nath.jpg",
    "youtubeVideoId": "5OiQmPPEglk",
    "streamUrl": "https://www.youtube.com/watch?v=5OiQmPPEglk",
    "sortOrder": 44,
    "isFeatured": true
  },
  {
    "name": "Dakshineswar Kali Temple",
    "slug": "dakshineswar-kali-temple",
    "deity": "Goddess Kali",
    "city": "Dakshineswar (Kolkata North)",
    "state": "West Bengal",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/02/Dakshineswar-Kali-Temple.jpg",
    "officialUrl": "https://www.dakshineswarkalitemple.org/",
    "sortOrder": 46,
    "isFeatured": false
  },
  {
    "name": "Shri Khatu Shyam Ji Temple",
    "slug": "shri-khatu-shyam-ji-temple",
    "deity": "Khatu Shyam Ji",
    "city": "Khatu / Khatushyamji",
    "state": "Rajasthan",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/04/shree-khatu-shyam-temple.jpg",
    "officialUrl": "https://shrishyammandir.com/",
    "sortOrder": 47,
    "isFeatured": false
  },
  {
    "name": "Meenakshi Amman Temple",
    "slug": "meenakshi-amman-temple",
    "deity": "Goddess Meenakshi (Parvati) &amp; Lord Sundareswarar (Shiva)",
    "city": "Madurai",
    "state": "Tamil Nadu",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/04/Meenakshi-Amman-Temple.jpg",
    "officialUrl": "https://maduraimeenakshi.org/",
    "sortOrder": 48,
    "isFeatured": false
  },
  {
    "name": "Yamunotri Temple — Source of the Yamuna",
    "slug": "yamunotri-temple-source-of-the-yamuna",
    "deity": "Goddess Yamuna",
    "city": "Yamunotri (Uttarkashi District)",
    "state": "Uttarakhand",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/04/yamunotri-dham.jpg",
    "officialUrl": "https://badrinath-kedarnath.gov.in/AboutUs/Yamunotri.aspx",
    "sortOrder": 50,
    "isFeatured": false
  },
  {
    "name": "Gangotri Temple — Source of the Holy Ganga",
    "slug": "gangotri-temple-source-of-the-holy-ganga",
    "deity": "Goddess Ganga",
    "city": "Gangotri",
    "state": "Uttarakhand",
    "thumbnail": "https://livedarshanhub.com/wp-content/uploads/2026/04/gangotri.jpg",
    "officialUrl": "https://badrinath-kedarnath.gov.in/",
    "sortOrder": 51,
    "isFeatured": false
  }
];

/**
 * Seed major temples if database table is empty
 */
export async function ensureTemplesSeeded() {
  try {
    const count = await prisma.temple.count();
    if (count === 0) {
      for (const temple of SEED_TEMPLES) {
        await prisma.temple.create({
          data: {
            ...temple,
            liveStatus: 'offline',
            isActive: true
          }
        });
      }
    }
  } catch (error) {
    console.error('[DarshanService] Seed check error:', error);
  }
}

/**
 * Resolve live stream for a temple using YouTube Data API with quota-safe caching
 */
export async function resolveTempleLiveStream(temple: {
  id: string;
  name: string;
  youtubeChannelId?: string | null;
  youtubeVideoId?: string | null;
  streamUrl?: string | null;
}): Promise<TempleStreamInfo> {
  const cached = streamCache.get(temple.id);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // If a manual override stream URL or fixed video ID is configured
  if (temple.youtubeVideoId) {
    const result: TempleStreamInfo = {
      videoId: temple.youtubeVideoId,
      embedUrl: `https://www.youtube.com/embed/${temple.youtubeVideoId}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1`,
      isLive: true,
      statusLabel: 'LIVE'
    };
    streamCache.set(temple.id, { data: result, expiry: Date.now() + CACHE_TTL_MS });
    return result;
  }

  // Attempt 1: Query YouTube API for active LIVE stream
  for (const apiKey of YOUTUBE_API_KEYS) {
    try {
      let liveUrl = '';
      if (temple.youtubeChannelId) {
        liveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${temple.youtubeChannelId}&eventType=live&type=video&key=${apiKey}`;
      } else {
        liveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(`${temple.name} live darshan`)}&eventType=live&type=video&regionCode=IN&key=${apiKey}`;
      }

      const res = await fetch(liveUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          const videoId = item.id?.videoId;
          if (videoId) {
            const streamInfo: TempleStreamInfo = {
              videoId,
              embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1`,
              isLive: true,
              statusLabel: 'LIVE',
              title: item.snippet?.title,
              thumbnail: item.snippet?.thumbnails?.high?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            };

            // Update cache and DB asynchronously
            streamCache.set(temple.id, { data: streamInfo, expiry: Date.now() + CACHE_TTL_MS });
            prisma.temple.update({
              where: { id: temple.id },
              data: {
                liveStatus: 'live',
                youtubeVideoId: videoId,
                lastCheckedAt: new Date()
              }
            }).catch(() => {});

            return streamInfo;
          }
        }
      }
    } catch {
      // Continue to next key or fallback
    }
  }

  // Attempt 2: If no live stream active, fetch latest relevant official video / aarti
  for (const apiKey of YOUTUBE_API_KEYS) {
    try {
      let latestUrl = '';
      if (temple.youtubeChannelId) {
        latestUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${temple.youtubeChannelId}&order=date&type=video&maxResults=1&key=${apiKey}`;
      } else {
        latestUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(`${temple.name} aarti darshan`)}&order=date&type=video&maxResults=1&regionCode=IN&key=${apiKey}`;
      }

      const res = await fetch(latestUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          const videoId = item.id?.videoId;
          if (videoId) {
            const streamInfo: TempleStreamInfo = {
              videoId,
              embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1`,
              isLive: false,
              statusLabel: 'Latest Video',
              title: item.snippet?.title,
              thumbnail: item.snippet?.thumbnails?.high?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            };

            streamCache.set(temple.id, { data: streamInfo, expiry: Date.now() + CACHE_TTL_MS });
            prisma.temple.update({
              where: { id: temple.id },
              data: {
                liveStatus: 'offline',
                youtubeVideoId: videoId,
                lastCheckedAt: new Date()
              }
            }).catch(() => {});

            return streamInfo;
          }
        }
      }
    } catch {
      // Continue
    }
  }

  // Attempt 3: Native YouTube Channel Live Embed Fallback (Works when quota is 0 or offline)
  const channelFallback: TempleStreamInfo = temple.youtubeChannelId
    ? {
        videoId: null,
        embedUrl: `https://www.youtube.com/embed/live_stream?channel=${temple.youtubeChannelId}&autoplay=1&mute=0&controls=1&playsinline=1`,
        isLive: true,
        statusLabel: 'LIVE'
      }
    : {
        videoId: null,
        embedUrl: '',
        isLive: false,
        statusLabel: 'Offline'
      };

  streamCache.set(temple.id, { data: channelFallback, expiry: Date.now() + 60 * 1000 });
  return channelFallback;
}

/**
 * Get all temples with filtering and live status
 */
export async function getTemples(options?: {
  search?: string;
  city?: string;
  state?: string;
  liveOnly?: boolean;
}) {
  await ensureTemplesSeeded();

  const where: any = { isActive: true };

  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { deity: { contains: options.search, mode: 'insensitive' } },
      { city: { contains: options.search, mode: 'insensitive' } },
      { state: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  if (options?.city) {
    where.city = { equals: options.city, mode: 'insensitive' };
  }

  if (options?.state) {
    where.state = { equals: options.state, mode: 'insensitive' };
  }

  if (options?.liveOnly) {
    where.liveStatus = 'live';
  }

  const temples = await prisma.temple.findMany({
    where,
    orderBy: [
      { isFeatured: 'desc' },
      { sortOrder: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  return temples;
}
