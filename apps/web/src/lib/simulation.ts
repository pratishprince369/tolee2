import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import fs from 'fs';
import path from 'path';

// Country-specific simulated names
const MOCK_NAMES_BY_COUNTRY: Record<string, string[]> = {
  IN: [
    // South India (AP, Telangana, Karnataka, Kerala, TN)
    'Sai Reddy', 'Venkatesh Naidu', 'Karthik Rao', 'Srinivas Reddy', 'Lakshmi Reddy',
    'Keerthana Naidu', 'Anusha Rao', 'Divya Reddy', 'Naveen Gowda', 'Harish Shetty',
    'Vinay Hegde', 'Pradeep Rao', 'Aishwarya Gowda', 'Kavya Shetty', 'Deepa Hegde',
    'Nisha Rao', 'Arjun Nair', 'Suresh Menon', 'Rahul Pillai', 'Anand Varma',
    'Meera Nair', 'Anjali Menon', 'Lakshmi Pillai', 'Arya Varma', 'Karthik Iyer',
    'Arvind Subramanian', 'Balaji Krishnan', 'Ananya Iyer', 'Nandhini Subramanian', 'Priya Krishnan',
    'Ravi Goud', 'Mahesh Naidu', 'Keerthi Reddy', 'Sneha Goud', 'Divya Naidu',
    // North India (UP, Bihar, Haryana, HP, Punjab, Rajasthan, Uttarakhand)
    'Aarav Sharma', 'Abhishek Pandey', 'Vivek Tripathi', 'Priya Sharma', 'Neha Pandey',
    'Swati Tripathi', 'Rahul Kumar', 'Amit Singh', 'Deepak Yadav', 'Manish Jha',
    'Priya Kumari', 'Neha Singh', 'Pooja Jha', 'Rani Devi', 'Mohit Malik',
    'Deepak Dahiya', 'Rahul Hooda', 'Komal Malik', 'Priya Dahiya', 'Neha Hooda',
    'Rohit Thakur', 'Pankaj Chauhan', 'Anil Negi', 'Pooja Thakur', 'Neha Chauhan',
    'Shalini Negi', 'Gurpreet Singh', 'Harpreet Gill', 'Navdeep Sandhu', 'Simran Kaur',
    'Harleen Gill', 'Gurleen Sandhu', 'Mahendra Rathore', 'Vikram Singh', 'Gajendra Shekhawat',
    'Kavita Rathore', 'Rekha Shekhawat', 'Pooja Choudhary', 'Mohit Rawat', 'Deepak Bisht',
    'Pankaj Negi', 'Pooja Rawat', 'Anjali Bisht', 'Neha Negi',
    // West India & Central (Gujarat, Maharashtra, Goa, MP, Chhattisgarh)
    'Dhruv Patel', 'Nirav Shah', 'Hardik Mehta', 'Jay Thakkar', 'Khushi Patel',
    'Riya Shah', 'Hetal Mehta', 'Jinal Thakkar', 'Prathamesh Patil', 'Omkar Shinde',
    'Sagar Jadhav', 'Rohit Chavan', 'Prajakta Patil', 'Snehal Shinde', 'Rutuja Jadhav',
    'Sonali Chavan', "Ryan D'Souza", 'Kevin Fernandes', 'Melroy Rodrigues', "Alisha D'Souza",
    'Maria Fernandes', 'Natasha Rodrigues', 'Rajesh Mishra', 'Amit Tiwari', 'Sandeep Chouhan',
    'Swati Mishra', 'Neha Tiwari', 'Pooja Chouhan', 'Ankit Verma', 'Rajesh Sahu',
    'Dinesh Patel', 'Aarti Verma', 'Poonam Sahu', 'Neha Patel',
    // East India (WB, Odisha, Jharkhand)
    'Soumik Chatterjee', 'Anirban Banerjee', 'Sayan Mukherjee', 'Moumita Chatterjee', 'Priyanka Banerjee',
    'Debolina Mukherjee', 'Subham Mohanty', 'Debasis Sahu', 'Satyajit Das', 'Lipika Mohanty',
    'Sasmita Sahu', 'Priyanka Das', 'Rakesh Mahato', 'Sunil Oraon', 'Deepak Soren',
    'Anita Mahato', 'Priyanka Oraon', 'Riya Soren',
    // Northeast (Assam, Arunachal, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura)
    'Rohan Gogoi', 'Rupam Das', 'Abhijit Bora', 'Pranjal Deka', 'Priyanka Gogoi',
    'Nabanita Das', 'Riya Bora', 'Monalisa Deka', 'Tashi Tsering', 'Dorjee Wangchu',
    'Karma Bhutia', 'Pema Dolma', 'Choden Bhutia', 'Sonam Tsering', 'Ningthoujam Rajen',
    'Khumanthem Dev', 'Chanu Devi', 'Ningol Rani', 'Banri Khongwir', 'Ribok Lyngdoh',
    'Merisha Khongwir', 'Elina Lyngdoh', 'Lalrinmawia', 'C. Lalhmingmawia', 'Lalhriatpuii',
    'Vanlalruati', 'Imkong Jamir', 'Ketho Zhimomi', 'Aienla Jamir', 'Keneituo Zhimomi',
    'Tenzing Lepcha', 'Sonam Bhutia', 'Pema Lepcha', 'Dolma Bhutia', 'Biplab Debbarma',
    'Arindam Das', 'Rima Debbarma', 'Mousumi Das',
    // UTs & Extras (Delhi, Chandigarh, J&K, Ladakh, Lakshadweep, Puducherry, Dadra, Andaman)
    'Priya Gupta', 'Aamir Bhat', 'Zoya Bhat', 'Tsering Namgyal', 'Dolma Angmo',
    'Sameer Koya', 'Amina Koya', 'Arvind Pillai', 'Meera Pillai', 'Rohan Patel',
    'Rahul Das', 'Priya Das'
  ],
  US: [
    'Liam Smith', 'Emma Johnson', 'Noah Williams', 'Olivia Jones', 'William Brown',
    'Sophia Davis', 'James Miller', 'Isabella Wilson', 'Oliver Moore', 'Charlotte Taylor',
    'Benjamin Anderson', 'Amelia Thomas', 'Lucas Jackson', 'Mia White', 'Henry Harris'
  ],
  AE: [
    'Zayed Al Mansouri', 'Fatima Al Hashimi', 'Ahmed Al Maktoum', 'Maryam Al Falasi',
    'Omar Al Suwaidi', 'Aisha Al Qassimi', 'Ali Al Shehhi', 'Reem Al Nuaimi',
    'Khalid Al Hosani', 'Latifa Al Marzooqi', 'Mohammed Al Jaber', 'Sarah Al Mulla'
  ],
  GB: [
    'Oliver Smith', 'Olivia Jones', 'George Taylor', 'Amelia Brown', 'Harry Williams',
    'Isla Wilson', 'Jack Davies', 'Emily Evans', 'Charlie Thomas', 'Jessica Roberts',
    'Thomas Johnson', 'Lily Macdonald'
  ],
  CA: [
    'Liam Tremblay', 'Olivia Roy', 'Noah Gagnon', 'Emma Macdonald', 'Jackson Campbell',
    'Charlotte Smith', 'Lucas Leblanc', 'Sophia Stewart', 'Benjamin Bouchard', 'Chloe Morin'
  ],
  OTHER: [
    'Alex Mercer', 'Elena Rostova', 'Yuki Tanaka', 'Hans Mueller', 'Luca Rossi',
    'Sofia Gomez', 'Carlos Silva', 'Anna Dubois', 'David Kim', 'Zoe Chen'
  ]
};

// Country-specific simulated cities
const MOCK_CITIES_BY_COUNTRY: Record<string, string[]> = {
  IN: [
    'Mumbai, Maharashtra', 'Bangalore, Karnataka', 'Pune, Maharashtra',
    'Delhi NCR', 'Hyderabad, Telangana', 'Chennai, Tamil Nadu', 'Kolkata, West Bengal',
    'Ahmedabad, Gujarat', 'Jaipur, Rajasthan', 'Lucknow, Uttar Pradesh',
    'Nagpur, Maharashtra', 'Indore, Madhya Pradesh', 'Surat, Gujarat',
    'Amritsar, Punjab', 'Kochi, Kerala', 'Patna, Bihar', 'Bhubaneswar, Odisha',
    'Guwahati, Assam', 'Thiruvananthapuram, Kerala', 'Ludhiana, Punjab',
    'Kanpur, Uttar Pradesh', 'Coimbatore, Tamil Nadu', 'Visakhapatnam, Andhra Pradesh'
  ],
  US: [
    'New York, NY', 'San Francisco, CA', 'Los Angeles, CA', 'Chicago, IL',
    'Seattle, WA', 'Boston, MA', 'Austin, TX', 'Miami, FL'
  ],
  AE: [
    'Dubai, UAE', 'Abu Dhabi, UAE', 'Sharjah, UAE', 'Al Ain, UAE'
  ],
  GB: [
    'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Edinburgh, UK', 'Glasgow, UK'
  ],
  CA: [
    'Toronto, ON', 'Vancouver, BC', 'Montreal, QC', 'Calgary, AB', 'Ottawa, ON'
  ],
  OTHER: [
    'Sydney, Australia', 'Singapore', 'Berlin, Germany', 'Paris, France', 'Tokyo, Japan'
  ]
};

const MOCK_PROFESSIONS = [
  'UX Designer', 'Software Engineer', 'Startup Founder', 'Digital Marketer',
  'Product Manager', 'Real Estate Broker', 'Content Creator', 'Fitness Coach',
  'Investment Banker', 'Travel Blogger', 'Venture Capitalist', 'Data Scientist',
  'Creative Director', 'Public Speaker', 'Brand Strategist'
];

const MOCK_BIOS = [
  'Building the next big thing in Web3. 🚀',
  'Code is poetry. | Fullstack Engineer. 💻',
  'Passionate about scaling startups from 0 to 1.',
  'Helping brands tell stories that drive growth. 📈',
  'Gym is my therapy. | Online fitness advisor.',
  'Exploring the world, one coffee shop at a time. ✈️',
  'Simplifying real estate and property investments.',
  'Human-centered design is the future. 🎨',
  'Always learning, always creating. | Podcast Host.',
  'Investing in early-stage tech founders.',
  'Data speaks louder than opinions. 📊',
  'Living life in full resolution.',
];

const MOCK_AVATARS_MALE = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506803682981-6e718a9dd3ee?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
];

const MOCK_AVATARS_FEMALE = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1496449903678-68ddcb189a24?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&auto=format&fit=crop&q=80'
];

const MOCK_AVATARS = [...MOCK_AVATARS_MALE, ...MOCK_AVATARS_FEMALE];

const FALLBACK_PIXABAY_VIDEOS = [
  'https://videos.pexels.com/video-files/7823396/7823396-hd_1080_1920_30fps.mp4',
  'https://videos.pexels.com/video-files/7983988/7983988-sd_360_640_25fps.mp4',
  'https://videos.pexels.com/video-files/8141297/8141297-sd_540_960_25fps.mp4',
  'https://videos.pexels.com/video-files/7593564/7593564-hd_1920_1080_25fps.mp4',
  'https://videos.pexels.com/video-files/7983982/7983982-hd_1280_720_25fps.mp4',
  'https://videos.pexels.com/video-files/7691548/7691548-hd_1280_720_25fps.mp4',
  'https://videos.pexels.com/video-files/7693469/7693469-hd_1280_720_25fps.mp4',
  'https://videos.pexels.com/video-files/6913276/6913276-sd_960_540_25fps.mp4',
  'https://videos.pexels.com/video-files/11041433/11041433-sd_640_360_30fps.mp4',
  'https://videos.pexels.com/video-files/7047257/7047257-hd_1280_720_25fps.mp4',
  'https://videos.pexels.com/video-files/10395606/10395606-hd_1080_1920_24fps.mp4',
  'https://videos.pexels.com/video-files/11700405/11700405-hd_1920_1080_30fps.mp4'
];

// Curated high-quality Unsplash image assets representing simulated category scenes
const UNSPLASH_IMAGES: Record<string, string[]> = {
  tech: [
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581291518655-9523c932dedf?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&auto=format&fit=crop&q=80'
  ],
  money: [
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80'
  ],
  health: [
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80'
  ],
  general: [
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&auto=format&fit=crop&q=80'
  ]
};

// Global in-memory cache for Pixabay video URLs mapped by query
const cachedPixabayVideos: Record<string, string[]> = {};
const isFetchingPixabay: Record<string, boolean> = {};

// Global in-memory cache for Pexels URLs mapped by query
const cachedPexelsVideos: Record<string, string[]> = {};
const cachedPexelsImages: Record<string, string[]> = {};
const isFetchingPexelsVideos: Record<string, boolean> = {};
const isFetchingPexelsImages: Record<string, boolean> = {};

// Maps local simulation category key to search query
export function getPixabayQueryForCategory(category: string): string {
  const norm = category.toLowerCase().trim();
  if (norm.includes('tech') || norm.includes('developer') || norm.includes('coding')) {
    return 'programming computer technology office';
  }
  if (norm.includes('money') || norm.includes('business') || norm.includes('finance') || norm.includes('invest') || norm.includes('property')) {
    return 'business money finance startup';
  }
  if (norm.includes('health') || norm.includes('doctor') || norm.includes('medical') || norm.includes('fit') || norm.includes('gym')) {
    return 'fitness workout gym yoga';
  }
  return 'nature travel city landscape';
}

// Maps local simulation category key to search query for Pexels
export function getPexelsQueryForCategory(category: string): string {
  const norm = category.toLowerCase().trim();
  if (norm.includes('tech') || norm.includes('developer') || norm.includes('coding')) {
    return 'technology programming computer office';
  }
  if (norm.includes('money') || norm.includes('business') || norm.includes('finance') || norm.includes('invest')) {
    return 'business startup money office finance';
  }
  if (norm.includes('health') || norm.includes('doctor') || norm.includes('medical') || norm.includes('fit') || norm.includes('gym')) {
    return 'fitness workout gym doctor wellness';
  }
  return 'travel nature city lifestyle';
}

/**
 * Asynchronously fetches video lists from Pixabay in the background.
 * Updates cachedPixabayVideos for the specific category query.
 */
export function fetchPixabayVideosInBackground(category: string): void {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey || apiKey.trim() === 'your-pixabay-api-key' || apiKey.trim() === '') {
    return;
  }

  const query = getPixabayQueryForCategory(category);
  
  if (cachedPixabayVideos[query] && cachedPixabayVideos[query].length > 0) return;
  if (isFetchingPixabay[query]) return;

  isFetchingPixabay[query] = true;
  console.log(`[Pixabay Simulation] Triggering background video fetch for category "${category}" (query: "${query}")...`);

  fetch(
    `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=30&safesearch=true&video_type=all`
  )
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Pixabay API responded with status ${res.status}`);
      }
      return res.json();
    })
    .then((data: any) => {
      if (data && Array.isArray(data.hits)) {
        const urls: string[] = [];
        for (const hit of data.hits) {
          const videosObj = hit.videos;
          const directUrl =
            videosObj?.medium?.url ||
            videosObj?.small?.url ||
            videosObj?.large?.url ||
            videosObj?.tiny?.url;
            
          if (directUrl && typeof directUrl === 'string') {
            urls.push(directUrl);
          }
        }
        if (urls.length > 0) {
          cachedPixabayVideos[query] = urls;
          console.log(`[Pixabay Simulation] Successfully cached ${urls.length} video URLs for query: "${query}".`);
        } else {
          console.warn(`[Pixabay Simulation] Pixabay search returned 0 video hits for query: "${query}".`);
        }
      }
    })
    .catch((err) => {
      console.error(`[Pixabay Simulation] Failed to fetch videos for query "${query}":`, err);
    })
    .finally(() => {
      isFetchingPixabay[query] = false;
    });
}

// Fetch lists from Pexels API
export async function fetchPexelsVideos(category: string): Promise<string[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('api-key')) {
    return [];
  }

  const query = getPexelsQueryForCategory(category);
  if (cachedPexelsVideos[query] && cachedPexelsVideos[query].length > 0) {
    return cachedPexelsVideos[query];
  }

  try {
    const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=40&size=medium`, {
      headers: {
        'Authorization': apiKey
      }
    });

    if (!res.ok) {
      throw new Error(`Pexels Videos responded with status ${res.status}`);
    }

    const data = await res.json();
    if (data && Array.isArray(data.videos)) {
      const urls: string[] = [];
      for (const video of data.videos) {
        const file = video.video_files?.find((f: any) => f.width && f.height && f.height > f.width) || video.video_files?.[0];
        if (file?.link) {
          urls.push(file.link);
        }
      }
      if (urls.length > 0) {
        cachedPexelsVideos[query] = urls;
        return urls;
      }
    }
  } catch (err) {
    console.error(`[Pexels Videos Fetch Failed] for query "${query}":`, err);
  }
  return [];
}

export async function fetchPexelsImages(category: string): Promise<string[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('api-key')) {
    return [];
  }

  const query = getPexelsQueryForCategory(category);
  if (cachedPexelsImages[query] && cachedPexelsImages[query].length > 0) {
    return cachedPexelsImages[query];
  }

  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=40`, {
      headers: {
        'Authorization': apiKey
      }
    });

    if (!res.ok) {
      throw new Error(`Pexels Images responded with status ${res.status}`);
    }

    const data = await res.json();
    if (data && Array.isArray(data.photos)) {
      const urls = data.photos.map((photo: any) => photo.src?.large).filter(Boolean) as string[];
      if (urls.length > 0) {
        cachedPexelsImages[query] = urls;
        return urls;
      }
    }
  } catch (err) {
    console.error(`[Pexels Images Fetch Failed] for query "${query}":`, err);
  }
  return [];
}

export function fetchPexelsVideosInBackground(category: string): void {
  const query = getPexelsQueryForCategory(category);
  if (cachedPexelsVideos[query] && cachedPexelsVideos[query].length > 0) return;
  if (isFetchingPexelsVideos[query]) return;

  isFetchingPexelsVideos[query] = true;
  fetchPexelsVideos(category).finally(() => {
    isFetchingPexelsVideos[query] = false;
  });
}

export function fetchPexelsImagesInBackground(category: string): void {
  const query = getPexelsQueryForCategory(category);
  if (cachedPexelsImages[query] && cachedPexelsImages[query].length > 0) return;
  if (isFetchingPexelsImages[query]) return;

  isFetchingPexelsImages[query] = true;
  fetchPexelsImages(category).finally(() => {
    isFetchingPexelsImages[query] = false;
  });
}

// Country-specific simulated comments pools
const MOCK_COMMENTS_BY_COUNTRY: Record<string, string[]> = {
  IN: [
    'Bhai mast hai ❤️', 'Kya baat hai 🔥', 'Bilkul sahi bola.', 'Amazing yaar.',
    'Nice post.', 'Keep growing.', 'Bahut badhiya.', 'Super content 👏',
    'Ye information useful thi.', 'Thanks for sharing.', 'Loved this.', 'Very useful.',
    'Sahi baat hai, full agreement 👍', 'Outstanding information!', 'Ji bilkul sahi 💯'
  ],
  US: [
    'Awesome post!', 'Love this advice.', 'Very helpful, thanks!', 'Great setup.',
    'Spot on!', 'Definitely trying this.', 'Amazing work!', 'Thanks for sharing.',
    'Keep it up!', 'Very insightful.', 'Perfect breakdown! 👍', 'Highly recommended.'
  ],
  AE: [
    'Brilliant share! 👏', 'Stunning setup.', 'Very useful info.', 'Spot on advice.',
    'Love this! 👍', 'Thanks for sharing.', 'Great content.', 'Keep growing.',
    'Perfect representation of Dubai vibes! 🏙️✨', 'Incredible investment tip!'
  ],
  GB: [
    'Splendid advice! 👏', 'Cheerio, very useful post.', 'Absolutely spot on!',
    'Thanks for sharing, mate.', 'Brilliant content.', 'Top drawer info!', 'Perfect! 👍'
  ],
  CA: [
    'Awesome post, eh! 🍁', 'Very useful tips, thanks!', 'Great content.',
    'Spot on advice!', 'Thanks for sharing.', 'Brilliant setup!'
  ],
  OTHER: [
    'Awesome post!', 'Very helpful, thanks!', 'Great setup.', 'Spot on!',
    'Amazing work!', 'Thanks for sharing.', 'Keep it up!', 'Very insightful.'
  ]
};

// Localized captions & content by country (Fallback templates pool)
const CATEGORY_TEMPLATES_BY_COUNTRY: Record<string, Record<string, {
  captions: string[];
  images: string[];
  videos: string[];
  polls: { question: string; options: string[] }[];
  questions: string[];
  events: string[];
  announcements: string[];
}>> = {
  IN: {
    tech: {
      captions: [
        "Aaj finally office ka project complete ho gaya 😍 ready for deployment! #ux #webdev #hinglish",
        "Is TypeScript really necessary for small projects? Kya lagta hai aapko? Let's discuss! #programming",
        "A clean desk is a must for writing clean code! 💻☕ Naya setup built. #desksetup #developer",
        "Top 5 SaaS growth hacks that helped us scale 40% last month. Apne business me implement karo! 🚀 #saas #marketing",
        "Exploring WebAssembly and its performance implications for next-gen Indian web apps. #webassembly #tech"
      ],
      images: UNSPLASH_IMAGES.tech,
      videos: FALLBACK_PIXABAY_VIDEOS,
      polls: [
        { question: "Next project ke liye kaun sa tech select karein?", options: ["Node.js / TS", "Python / Fast API", "Go Lang", "Rust"] },
        { question: "React project me state kaise manage karte ho?", options: ["Zustand", "Redux Toolkit", "Context API", "Jotai / signals"] }
      ],
      questions: [
        "Indian tech market me developer salaries ke trends kaise chal rahe hain?",
        "Next.js optimization ke liye best hacks kya hain?"
      ],
      events: [
        "Friday Tech Talk: Architecting AI Agents with LLMs! Register now. 🚀",
        "Online Hackathon: Build a collaborative tool in 48 hours. Saturday 10 AM!"
      ],
      announcements: [
        "🚀 Tolee Tech community is now officially live! Let's build together.",
        "📢 Resource library is open. Post your Hinglish guides and templates!"
      ]
    },
    money: {
      captions: [
        "Real estate investments in Mumbai, Pune, and Bangalore are booming. Ye top areas watch karo. #investing #realestate",
        "Business me consistency is key. Customer feedback ko ignore mat karna. #business #growth",
        "Portfolio asset allocation kaise manage karein? sharing my personal model today. 📈 #finance #wealth",
        "Indian startups scale up fast. 🚀 Bootstrapping or Venture funding, kya better hai? #startupindia",
        "Sales call conversion rate improve karne ki 3 magic strategies. #sales #business"
      ],
      images: UNSPLASH_IMAGES.money,
      videos: FALLBACK_PIXABAY_VIDEOS,
      polls: [
        { question: "Aapke according best investment option kaun sa hai?", options: ["Mutual Funds / Stocks", "Real Estate / Land", "Gold / Bonds", "Crypto / Startups"] },
        { question: "Monthly savings target kitna hona chahiye?", options: ["10% - 20%", "20% - 40%", "40%+", "No target, spend first"] }
      ],
      questions: [
        "India me seed funding ke liye pitching kaise shuru karein?",
        "Noida aur Gurgaon me commercial property buy karna profitable hai kya?"
      ],
      events: [
        "Startup Pitch Day: Meet 10 active Indian angel investors this Wednesday!",
        "Commercial Real Estate Wealth Masterclass: Saturday 4 PM."
      ],
      announcements: [
        "📢 Mumbai Business Group just hit 2.4M members! Thank you all for joining.",
        "🚀 Premium wealth templates section is now unlocked for all joined members!"
      ]
    },
    health: {
      captions: [
        "Aaj gym me first day tha 💪 Pura body pain ho raha hai but feeling great. #fitness #motivation",
        "5 simple morning habits to boost your energy levels. Try this starting tomorrow! #health #wellness",
        "Chai kam karo, stay hydrated, and sleep at least 7 hours. Simple advice, rarely followed. #lifestyle #nutrition",
        "Mental health is just as important as physical health. Take a break if you need it. 🧘‍♂️ #mindfulness"
      ],
      images: UNSPLASH_IMAGES.health,
      videos: FALLBACK_PIXABAY_VIDEOS,
      polls: [
        { question: "Aapki physical activity main routine kya hai?", options: ["Weight Training", "Running / Yoga", "Swimming / Sports", "Sedentary lifestyle"] },
        { question: "Diet preference kya hai aapki?", options: ["Pure Vegetarian", "Balanced Non-Veg", "Vegan / Keto", "No diet control"] }
      ],
      questions: [
        "Consistent gym and workout schedule kaise maintain karein?",
        "Burnout and stress handle karne ka local remedy kya hai?"
      ],
      events: [
        "Live Q&A: longevity and health session with Dr. Aarav. Saturday 5 PM.",
        "Yoga for Mindfulness & Stress Management: Sunday morning 7 AM."
      ],
      announcements: [
        "📢 Welcome to the Doctors Community! Read verified rules pinned at top.",
        "🚀 Launching weekly newsletter sharing curated healthcare tips next month!"
      ]
    },
    general: {
      captions: [
        "Kya mast weather hai aaj ☁️ monsoon vibes in the air. #monsoon #peace",
        "Weekend trip successful 🔥 Hilly areas hit different. #travel #peace",
        "Cricket match ki excitement alag hi hoti hai! Who else is watching? 🏏🔥 #cricket #india",
        "Festivals ka season shuru! Family and friends block. ✨🎉 #festivals #celebration",
        "Local news: Traffic in Mumbai is getting worse. Roadworks are ongoing. 🏙️❤️ #mumbai"
      ],
      images: UNSPLASH_IMAGES.general,
      videos: FALLBACK_PIXABAY_VIDEOS,
      polls: [
        { question: "Chai or Coffee during monsoon?", options: ["Chai ☕", "Filter Coffee ☕", "Cold Coffee", "Water only"] },
        { question: "Weekend plan kya hai?", options: ["Travel / Outing", "Netflix & Chill", "Pending work", "Sleep all day"] }
      ],
      questions: [
        "What is the single best advice you've ever received in your life?",
        "How do you organize your digital life to avoid information overload?"
      ],
      events: [
        "Goal Setting Workshop: Let's design our 2026 roadmap this Sunday!",
        "Community Meetup: Coffee & networking. Next Friday at 6 PM."
      ],
      announcements: [
        "📢 Community updates: new layout and badges are now live! Check them out.",
        "🚀 Share your wins in the main feed. Let's celebrate our achievements!"
      ]
    }
  },
  GLOBAL: {
    tech: {
      captions: [
        "Just built a beautiful Glassmorphism dashboard mockup. What do you think? #ux #webdev",
        "Is TypeScript really necessary for small projects? Let's discuss in the comments below. #programming",
        "A clean desk is a must for writing clean code! 💻☕ #desksetup #developer",
        "Here are my top 5 SaaS growth hacks that helped us scale 40% last month. Check them out! 🚀 #saas #marketing",
        "Exploring WebAssembly and its performance implications for next-gen web apps. #webassembly #tech"
      ],
      images: UNSPLASH_IMAGES.tech,
      videos: FALLBACK_PIXABAY_VIDEOS,
      polls: [
        { question: "What is your primary backend language of choice?", options: ["Node.js / TS", "Python", "Go", "Rust"] },
        { question: "How do you manage frontend state in large React apps?", options: ["Zustand", "Redux Toolkit", "Context API", "Signal / Jotai"] }
      ],
      questions: [
        "What is the single most important programming language a beginner should learn in 2026?",
        "How do you handle error boundaries and crash reporting in Next.js applications?"
      ],
      events: [
        "Friday Tech Talk: Architecting AI Agents with LLMs! Register now.",
        "Hackathon 2026: Build a collaborative tool in 48 hours. Kickoff this Saturday at 10 AM!"
      ],
      announcements: [
        "🚀 Tech community is now officially live! Let's build together.",
        "📢 We've added a resource library channel. Post your guides and templates!"
      ]
    },
    money: {
      captions: [
        "Real estate investments are booming. Here is a breakdown of the top areas to watch. #investing #realestate",
        "Always invest in relationships and networking before you need them. #business #growth",
        "How do you allocate your portfolio? Sharing my personal asset allocation model today. 📈 #finance #wealth",
        "Bootstrapping a startup from 0 to profitable is hard, but it is the most rewarding journey. #startups #indiehacker",
        "Mastering sales is the single most valuable skill in business. Here are 3 frameworks. #sales #business"
      ],
      images: UNSPLASH_IMAGES.money,
      videos: FALLBACK_PIXABAY_VIDEOS,
      polls: [
        { question: "Where are you investing most of your capital right now?", options: ["Real Estate", "Mutual Funds / Stocks", "Gold / Sovereign Bonds", "Crypto / Startups"] },
        { question: "What is your main financial goal for this year?", options: ["Increase Passive Income", "Clear All Debts", "Buy Property", "Start a Business"] }
      ],
      questions: [
        "What is the best way to get seed funding for a SaaS startup?",
        "How do you evaluate rental yield versus capital appreciation when buying real estate?"
      ],
      events: [
        "Startup Pitch Day: Meet 10 active angel investors this Wednesday!",
        "Masterclass: Wealth building through commercial real estate. Saturday 4 PM."
      ],
      announcements: [
        "📢 Group just hit a new milestone members count! Thank you all for joining.",
        "🚀 Premium investment templates are now unlocked for all joined members!"
      ]
    },
    health: {
      captions: [
        "5 simple morning habits to boost your energy levels and focus. #health #wellness",
        "Consistency is key. 5 AM workouts hit different. Who else is up? 💪🔥 #fitness #motivation",
        "Eat your greens, stay hydrated, and sleep at least 7 hours. Simple advice, rarely followed. #lifestyle #nutrition",
        "Mental health is just as important as physical health. Take a break if you need it. 🧘‍♂️ #mindfulness",
        "Had an amazing workout session today. Your body can stand almost anything, it is your mind you have to convince."
      ],
      images: UNSPLASH_IMAGES.health,
      videos: FALLBACK_PIXABAY_VIDEOS,
      polls: [
        { question: "What is your favorite form of physical exercise?", options: ["Weight Training", "Running / Cycling", "Yoga / Pilates", "Swimming / Sports"] },
        { question: "How many hours of sleep do you get on average?", options: ["Under 6 hours", "6 - 7 hours", "7 - 8 hours", "8+ hours"] }
      ],
      questions: [
        "What is the best diet plan for sustained energy throughout the day?",
        "How do you manage stress and burnout during busy work weeks?"
      ],
      events: [
        "Live Q&A: longevity and health session. Saturday 5 PM.",
        "Online Bootcamp: High-Intensity Interval Training (HIIT) session this Sunday morning."
      ],
      announcements: [
        "📢 Welcome to the Doctors Community! Please read the verification rules pinned at the top.",
        "🚀 We are launching a weekly newsletter sharing curated healthcare tips next month!"
      ]
    },
    general: {
      captions: [
        "Had an incredible brainstorming session today with the team! Excited for what we are building. #tolee #community",
        "Taking some time off to recharge by the lake. Nature is the best cure for burnout. 🌲🧘‍♂️ #peace #nature",
        "Sharing some daily wisdom: consistency is more important than intensity. #motivation #quotes",
        "An amazing view of the city skyline tonight. The city never sleeps! 🏙️❤️ #skyline",
        "Had a wonderful conversation with a new friend today. Connect with people!"
      ],
      images: UNSPLASH_IMAGES.general,
      videos: FALLBACK_PIXABAY_VIDEOS,
      polls: [
        { question: "How do you plan your day?", options: ["Notion / Digital Apps", "Paper Planner / Journal", "To-Do list on sticky notes", "No planning, go with the flow"] },
        { question: "What is your favorite time of day to be productive?", options: ["Early Morning", "Afternoon", "Late Night", "Whenever inspiration strikes"] }
      ],
      questions: [
        "What is the single best advice you've ever received in your life?",
        "How do you organize your digital life to avoid information overload?"
      ],
      events: [
        "Goal Setting Workshop: Let's design our 2026 roadmap this Sunday!",
        "Community Meetup: Coffee & networking. Next Friday at 6 PM."
      ],
      announcements: [
        "📢 Community updates: new layout and badges are now live! Check them out.",
        "🚀 Share your wins in the main feed. Let's celebrate our achievements!"
      ]
    }
  }
};

const HARDCODED_GROUPS_BY_COUNTRY: Record<string, Record<string, number>> = {
  IN: {
    'mumbai business group': 62400,
    'startup india': 55200,
    'real estate investors': 68900,
    'travel community': 42100,
    'fitness club': 58300,
    'gurgaon real estate agents': 61800,
    'flats for rent in noida': 48500,
    'property in dubai': 54600
  },
  US: {
    'nyc startups': 59200,
    'silicon valley developers': 67500,
    'us real estate investors': 63100,
    'travel usa': 41600
  },
  AE: {
    'dubai business club': 52300,
    'dubai developers': 49800,
    'property in dubai': 54600,
    'uae lifestyle': 56700
  }
};

// AI Cache Interface
interface AICachedUser {
  name: string;
  profession: string;
  bio: string;
  location: string;
  postCategory: string;
  gender: 'male' | 'female';
}

interface AICachedMedia {
  url: string;
  type: 'image' | 'video';
  category: string;
  description: string;
  caption: string;
}

interface AICache {
  timestamp: number;
  countryCode: string;
  users: AICachedUser[];
  captions: Record<string, string[]>;
  reelCaptions: Record<string, string[]>;
  comments: string[];
  mediaAssets?: AICachedMedia[];
}

let cachedDataInMemory: AICache | null = null;

// Helper to generate local fallbacks in identical cache format
function generateLocalFallbackCache(countryCode: string): AICache {
  const namePool = MOCK_NAMES_BY_COUNTRY[countryCode] || MOCK_NAMES_BY_COUNTRY.OTHER;
  const cityPool = MOCK_CITIES_BY_COUNTRY[countryCode] || MOCK_CITIES_BY_COUNTRY.OTHER;
  
  const users: AICachedUser[] = [];
  for (let i = 0; i < 50; i++) {
    const name = namePool[i % namePool.length] + (Math.floor(i / namePool.length) ? ' ' + Math.floor(i / namePool.length) : '');
    const profession = MOCK_PROFESSIONS[i % MOCK_PROFESSIONS.length];
    const bio = MOCK_BIOS[i % MOCK_BIOS.length] + ` | ${profession}`;
    const location = cityPool[i % cityPool.length];
    const postCategories = ['tech', 'money', 'health', 'general'];
    const postCategory = postCategories[i % postCategories.length];
    const gender = i % 2 === 0 ? 'male' : 'female';
    
    users.push({
      name,
      profession,
      bio,
      location,
      postCategory,
      gender
    });
  }

  const templatesByCountry = CATEGORY_TEMPLATES_BY_COUNTRY[countryCode] || CATEGORY_TEMPLATES_BY_COUNTRY.GLOBAL;
  
  const extractCaptions = (cat: string) => {
    const list = templatesByCountry[cat]?.captions || CATEGORY_TEMPLATES_BY_COUNTRY.GLOBAL.general.captions;
    const result = [];
    for (let i = 0; i < 25; i++) {
      result.push(list[i % list.length]);
    }
    return result;
  };

  const commentsPool = MOCK_COMMENTS_BY_COUNTRY[countryCode] || MOCK_COMMENTS_BY_COUNTRY.OTHER;
  const comments = [];
  for (let i = 0; i < 60; i++) {
    comments.push(commentsPool[i % commentsPool.length]);
  }

  const mediaAssets: AICachedMedia[] = [];
  const categories = ['tech', 'money', 'health', 'general'];
  for (const cat of categories) {
    // Fallback images
    const imgList = UNSPLASH_IMAGES[cat] || UNSPLASH_IMAGES.general;
    const imgCaptions = extractCaptions(cat);
    for (let i = 0; i < Math.min(imgList.length, 10); i++) {
      mediaAssets.push({
        url: imgList[i],
        type: 'image',
        category: cat,
        description: `${cat} category photo`,
        caption: imgCaptions[i % imgCaptions.length]
      });
    }

    // Fallback videos
    const vidList = FALLBACK_PIXABAY_VIDEOS;
    const vidCaptions = extractCaptions(cat);
    for (let i = 0; i < Math.min(vidList.length, 10); i++) {
      mediaAssets.push({
        url: vidList[i],
        type: 'video',
        category: cat,
        description: `${cat} category video clip`,
        caption: vidCaptions[i % vidCaptions.length]
      });
    }
  }

  return {
    timestamp: Date.now(),
    countryCode,
    users,
    captions: {
      tech: extractCaptions('tech'),
      money: extractCaptions('money'),
      health: extractCaptions('health'),
      general: extractCaptions('general')
    },
    reelCaptions: {
      tech: extractCaptions('tech'),
      money: extractCaptions('money'),
      health: extractCaptions('health'),
      general: extractCaptions('general')
    },
    comments,
    mediaAssets
  };
}

// Synchronous JSON file cache loader for dynamic rendering (fast, under 1ms)
export function getAICacheSync(countryCode = 'IN'): AICache {
  if (cachedDataInMemory && cachedDataInMemory.countryCode === countryCode) {
    return cachedDataInMemory;
  }
  try {
    const cacheFile = path.join(process.cwd(), 'src/lib/ai-simulation-cache.json');
    if (fs.existsSync(cacheFile)) {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as AICache;
      if (data.countryCode === countryCode && data.users && data.users.length > 0) {
        cachedDataInMemory = data;
        return data;
      }
    }
  } catch (e) {
    console.warn('[AI Simulation Cache] Read failed, using local templates:', e);
  }
  return generateLocalFallbackCache(countryCode);
}

// Generate realistic Hinglish/Indian English social media captions matching a batch of media assets using LLM
export async function generateAssetCaptionsBatch(
  assets: { url: string; description: string }[],
  category: string,
  type: 'image' | 'video',
  countryCode: string
): Promise<string[]> {
  const apiKey = process.env.NVIDIA_API_KEY;
  const isIndia = countryCode === 'IN';

  const fallbackPrefixes = isIndia ? [
    "Work mode on! 💻", "Aaj ka vibe alag hi hai ❤️", "Always busy with this...", "Kya aapane bhi ye try kiya hai? 🤔",
    "Weekend plans ready! 🚀", "Kuch naya seekh raha hu aaj.", "Perfect view for today. 😍", "Life is short, make every moment count.",
    "Monday motivation! 🔥", "Chasing dreams as always. ✨", "Finally, here is the update."
  ] : [
    "Work mode on! 💻", "Today's vibe is special ❤️", "Always busy with this...", "Have you tried this yet? 🤔",
    "Weekend plans ready! 🚀", "Learning something new today.", "Perfect view for today. 😍", "Life is short, make it count.",
    "Monday motivation! 🔥", "Chasing dreams as always. ✨", "Finally, here is the update."
  ];

  const fallbackCaptions = assets.map(asset => {
    const prefix = fallbackPrefixes[Math.floor(Math.random() * fallbackPrefixes.length)];
    return `${prefix} Looking at this amazing ${asset.description.toLowerCase()}. #${category} #tolee`;
  });

  if (!apiKey || apiKey.trim() === 'your-nvidia-api-key' || apiKey.trim() === '') {
    return fallbackCaptions;
  }

  try {
    const apiMessages = [
      {
        role: 'system',
        content: `You are a real social media user from India. Write a natural, highly human-like caption for each of the media descriptions.
Write in natural Hinglish (Hindi + English mix) or conversational Indian English with casual emojis.
Describe or reference the content of the image/video realistically.
Keep each caption under 2 sentences. Include 1-2 emojis and 2-3 relevant hashtags (including #tolee).
Respond with a single JSON object having the exact key "captions" which is an array of strings in the exact same order as the descriptions.`
      },
      {
        role: 'user',
        content: `Generate captions for these ${assets.length} ${type === 'video' ? 'videos' : 'images'} in the category "${category}":
${assets.map((a, idx) => `${idx + 1}. Description: "${a.description}"`).join('\n')}`
      }
    ];

    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: apiMessages,
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.captions)) {
        return parsed.captions;
      }
    }
  } catch (err) {
    console.warn(`[Batch Asset Caption Gen Failed] for category "${category}":`, err);
  }

  return fallbackCaptions;
}

// Fetch detailed image and video assets from Pexels API
export async function fetchPexelsAssets(category: string, type: 'image' | 'video'): Promise<{ url: string, description: string }[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('api-key')) {
    return [];
  }

  const query = getPexelsQueryForCategory(category);
  try {
    if (type === 'video') {
      const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=20&size=medium`, {
        headers: { 'Authorization': apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.videos)) {
          const results = [];
          for (const video of data.videos) {
            const file = video.video_files?.find((f: any) => f.width && f.height && f.height > f.width) || video.video_files?.[0];
            if (file?.link) {
              const urlParts = video.url.split('/video/')[1];
              let desc = urlParts ? urlParts.split('-').slice(0, -1).join(' ') : 'vertical video';
              if (desc.trim() === '') desc = 'video clip';
              results.push({ url: file.link, description: desc });
            }
          }
          return results;
        }
      }
    } else {
      const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20`, {
        headers: { 'Authorization': apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.photos)) {
          return data.photos.map((photo: any) => ({
            url: photo.src?.large || '',
            description: photo.alt || 'stock image'
          })).filter((p: any) => p.url !== '');
        }
      }
    }
  } catch (err) {
    console.error(`[Pexels Assets Fetch Failed] for type "${type}" query "${query}":`, err);
  }
  return [];
}

// Generate realistic Hinglish/Indian English social media caption matching media description using LLM
export async function generateAssetCaption(description: string, category: string, type: 'image' | 'video', countryCode: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  const isIndia = countryCode === 'IN';

  const fallbackPrefixes = isIndia ? [
    "Work mode on! 💻", "Aaj ka vibe alag hi hai ❤️", "Always busy with this...", "Kya aapane bhi ye try kiya hai? 🤔",
    "Weekend plans ready! 🚀", "Kuch naya seekh raha hu aaj.", "Perfect view for today. 😍", "Life is short, make every moment count.",
    "Monday motivation! 🔥", "Chasing dreams as always. ✨", "Finally, here is the update."
  ] : [
    "Work mode on! 💻", "Today's vibe is special ❤️", "Always busy with this...", "Have you tried this yet? 🤔",
    "Weekend plans ready! 🚀", "Learning something new today.", "Perfect view for today. 😍", "Life is short, make it count.",
    "Monday motivation! 🔥", "Chasing dreams as always. ✨", "Finally, here is the update."
  ];

  const prefix = fallbackPrefixes[Math.floor(Math.random() * fallbackPrefixes.length)];
  const fallbackCaption = `${prefix} Looking at this amazing ${description.toLowerCase()}. #${category} #tolee`;

  if (!apiKey || apiKey.trim() === 'your-nvidia-api-key' || apiKey.trim() === '') {
    return fallbackCaption;
  }

  try {
    const apiMessages = [
      {
        role: 'system',
        content: `You are a real social media user from India. Write a natural, highly human-like caption for a social media ${type === 'video' ? 'video/reel' : 'photo'} update.
Description of the media: "${description}"
Category/Interests: "${category}"
Rules:
- Write in natural, expressive Hinglish (Hindi + English mix) or conversational Indian English with casual emojis.
- Talk like a genuine individual posting about their daily life, not like a bot.
- Keep it under 2 sentences. Include 2-3 emojis and 2-3 relevant hashtags (including #tolee).
- Respond with a single JSON object having the exact key: "caption".`
      },
      {
        role: 'user',
        content: `Generate a caption for media showing: "${description}".`
      }
    ];

    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: apiMessages,
        temperature: 0.8,
        max_tokens: 150,
        response_format: { type: 'json_object' }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(text);
      if (parsed.caption) {
        return parsed.caption;
      }
    }
  } catch (err) {
    console.warn(`[Asset Caption Gen Failed] for "${description}":`, err);
  }

  return fallbackCaption;
}

// NVIDIA NIM Batch Creators
async function generateAIUsersBatch(count: number, countryCode: string): Promise<AICachedUser[]> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.trim() === 'your-nvidia-api-key' || apiKey.trim() === '') {
    throw new Error('NVIDIA_API_KEY not configured.');
  }

  const prompt = `Generate a JSON array of exactly ${count} unique simulated user profiles for a social network.
The profiles must match the country code: "${countryCode}" (e.g. for IN, use popular Indian names and Indian cities).
Each user must have a unique profile with the following fields:
- name: Real full name (first and last name).
- profession: One of these: 'Business Owner', 'Real Estate Agent', 'Doctor', 'Student', 'Software Engineer', 'Digital Marketer', 'Housewife', 'Teacher', 'Influencer', 'Fitness Trainer', 'Food Blogger', 'Photographer', 'News Creator', 'Investor'.
- bio: A unique, engaging, short bio matching their profession.
- location: A realistic city and state/province in that country.
- postCategory: Choose one matching their profession: 'tech' (for software, marketing, influencer), 'money' (for business, real estate, investor, news), 'health' (for doctor, trainer, food blogger), or 'general' (for student, housewife, teacher, photographer).
- gender: 'male' or 'female' (appropriate for the name).

Return ONLY a JSON object with a single key "users" containing the array of user objects. Do not include any markdown formatting, backticks, or extra text. Just raw JSON.`;

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [
        { role: 'system', content: 'You are a database seeding helper. You output raw structured JSON objects matching the schema requested. No markdown formatting.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    throw new Error(`LLM Users API responded with status ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed.users)) {
    return parsed.users;
  }
  throw new Error('Invalid users response format');
}

async function generateAICaptionsBatch(category: string, count: number, countryCode: string, type: 'post' | 'reel'): Promise<string[]> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.trim() === 'your-nvidia-api-key' || apiKey.trim() === '') {
    throw new Error('NVIDIA_API_KEY not configured.');
  }

  const isIndia = countryCode === 'IN';
  const languageRules = isIndia 
    ? 'Write in Hinglish (Hindi + English mix) or conversational Indian English, reflecting real topics, local trends, sports, technology, festivals, or local news. E.g. "Aaj finally client ka project complete ho gaya 😍", "Weekend trip mast raha ❤️".' 
    : 'Write in natural, conversational, locally appropriate English matching the region.';

  const prompt = `Generate a JSON array of exactly ${count} unique social media captions for a "${type}" of category "${category}" in "${countryCode}".
Rules:
- ${languageRules}
- Match the category: "${category}" (tech: software/marketing/apps, money: finance/business/investing, health: gym/nutrition/doctor, general: travel/lifestyle/weather).
- Do not repeat captions. Make every single caption unique and authentic.
- Include 1-3 emojis and 2-4 relevant hashtags.
- Keep them under 250 characters, friendly and natural. No formal AI templates.

Return ONLY a JSON object with a single key "captions" containing the array of strings.`;

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [
        { role: 'system', content: 'You are a helpful copywriter. You output raw structured JSON objects matching the schema requested.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    throw new Error(`LLM Captions API responded with status ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed.captions)) {
    return parsed.captions;
  }
  throw new Error('Invalid captions response format');
}

async function generateAICommentsBatch(count: number, countryCode: string): Promise<string[]> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.trim() === 'your-nvidia-api-key' || apiKey.trim() === '') {
    throw new Error('NVIDIA_API_KEY not configured.');
  }

  const isIndia = countryCode === 'IN';
  const commentRules = isIndia 
    ? 'Use colloquial Hinglish/Hindi/English typical comments for Indian social media. E.g. "Bilkul sahi bola.", "Nice information.", "Mast content ❤️", "Bhai ye useful tha.", "Amazing 🔥", "Keep growing.", "Bahut badhiya.", "Ye mujhe bhi try karna hai."' 
    : 'Use friendly, natural comments typical for social media.';

  const prompt = `Generate a JSON array of exactly ${count} unique, short, human-like social media comments.
Rules:
- ${commentRules}
- Make them short (1-6 words).
- Vary the style, punctuation, and emojis (e.g. use ❤️, 🔥, 👍, 👏 or none).
- Return ONLY a JSON object with a single key "comments" containing the array of strings.`;

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [
        { role: 'system', content: 'You are a helpful copywriter. You output raw structured JSON. No markdown formatting.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    throw new Error(`LLM Comments API responded with status ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed.comments)) {
    return parsed.comments;
  }
  throw new Error('Invalid comments response format');
}

// Background content pre-warming and file caching
export async function loadOrCreateAICache(countryCode: string, forceRefresh = false): Promise<AICache> {
  const cacheFile = path.join(process.cwd(), 'src/lib/ai-simulation-cache.json');
  
  if (!forceRefresh) {
    try {
      if (fs.existsSync(cacheFile)) {
        const fileContent = fs.readFileSync(cacheFile, 'utf8');
        const data = JSON.parse(fileContent) as AICache;
        if (data.countryCode === countryCode && data.users && data.users.length > 0) {
          console.log('[AI Simulation] Cache file loaded successfully:', cacheFile);
          cachedDataInMemory = data;
          return data;
        }
      }
    } catch (e) {
      console.warn('[AI Simulation] Error reading cache file, will regenerate:', e);
    }
  }

  console.log('[AI Simulation] Generating new AI simulation content cache for country:', countryCode);

  try {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey || apiKey.trim() === 'your-nvidia-api-key' || apiKey.trim() === '') {
      throw new Error('NVIDIA_API_KEY not configured. Using local fallback templates.');
    }

    console.log('[AI Simulation] Fetching batch users, captions, comments, and media assets...');

    const getAssetsWithFallback = async (cat: string, type: 'image' | 'video'): Promise<{ url: string; description: string }[]> => {
      let assets: { url: string; description: string }[] = [];
      try {
        assets = await fetchPexelsAssets(cat, type);
      } catch (err) {
        console.warn(`[AI Cache Pre-warm] Pexels fetch failed for ${cat} ${type}:`, err);
      }
      if (assets.length === 0) {
        if (type === 'image') {
          const imgList = UNSPLASH_IMAGES[cat] || UNSPLASH_IMAGES.general;
          assets = imgList.map((url, i) => ({
            url,
            description: `${cat} category photo representation ${i + 1}`
          }));
        } else {
          assets = FALLBACK_PIXABAY_VIDEOS.map((url, i) => ({
            url,
            description: `${cat} category video clip representation ${i + 1}`
          }));
        }
      }
      return assets.slice(0, 10);
    };

    const [
      users,
      techPost, moneyPost, healthPost, generalPost,
      techReel, moneyReel, healthReel, generalReel,
      comments,
      techImages, techVideos,
      moneyImages, moneyVideos,
      healthImages, healthVideos,
      generalImages, generalVideos
    ] = await Promise.all([
      generateAIUsersBatch(50, countryCode),
      generateAICaptionsBatch('tech', 25, countryCode, 'post'),
      generateAICaptionsBatch('money', 25, countryCode, 'post'),
      generateAICaptionsBatch('health', 25, countryCode, 'post'),
      generateAICaptionsBatch('general', 25, countryCode, 'post'),
      generateAICaptionsBatch('tech', 25, countryCode, 'reel'),
      generateAICaptionsBatch('money', 25, countryCode, 'reel'),
      generateAICaptionsBatch('health', 25, countryCode, 'reel'),
      generateAICaptionsBatch('general', 25, countryCode, 'reel'),
      generateAICommentsBatch(60, countryCode),
      getAssetsWithFallback('tech', 'image'), getAssetsWithFallback('tech', 'video'),
      getAssetsWithFallback('money', 'image'), getAssetsWithFallback('money', 'video'),
      getAssetsWithFallback('health', 'image'), getAssetsWithFallback('health', 'video'),
      getAssetsWithFallback('general', 'image'), getAssetsWithFallback('general', 'video')
    ]);

    // Generate matched captions for the media assets using LLM in parallel batches
    const [
      techImgCaps, techVidCaps,
      moneyImgCaps, moneyVidCaps,
      healthImgCaps, healthVidCaps,
      generalImgCaps, generalVidCaps
    ] = await Promise.all([
      generateAssetCaptionsBatch(techImages, 'tech', 'image', countryCode),
      generateAssetCaptionsBatch(techVideos, 'tech', 'video', countryCode),
      generateAssetCaptionsBatch(moneyImages, 'money', 'image', countryCode),
      generateAssetCaptionsBatch(moneyVideos, 'money', 'video', countryCode),
      generateAssetCaptionsBatch(healthImages, 'health', 'image', countryCode),
      generateAssetCaptionsBatch(healthVideos, 'health', 'video', countryCode),
      generateAssetCaptionsBatch(generalImages, 'general', 'image', countryCode),
      generateAssetCaptionsBatch(generalVideos, 'general', 'video', countryCode)
    ]);

    const mediaAssets: AICachedMedia[] = [];
    const addAssets = (assets: { url: string; description: string }[], caps: string[], cat: string, type: 'image' | 'video') => {
      for (let i = 0; i < assets.length; i++) {
        mediaAssets.push({
          url: assets[i].url,
          type,
          category: cat,
          description: assets[i].description,
          caption: caps[i] || `Enjoying this ${type === 'video' ? 'video' : 'photo'} of ${assets[i].description.toLowerCase()}. #${cat} #tolee`
        });
      }
    };

    addAssets(techImages, techImgCaps, 'tech', 'image');
    addAssets(techVideos, techVidCaps, 'tech', 'video');
    addAssets(moneyImages, moneyImgCaps, 'money', 'image');
    addAssets(moneyVideos, moneyVidCaps, 'money', 'video');
    addAssets(healthImages, healthImgCaps, 'health', 'image');
    addAssets(healthVideos, healthVidCaps, 'health', 'video');
    addAssets(generalImages, generalImgCaps, 'general', 'image');
    addAssets(generalVideos, generalVidCaps, 'general', 'video');

    const cacheData: AICache = {
      timestamp: Date.now(),
      countryCode,
      users,
      captions: {
        tech: techPost,
        money: moneyPost,
        health: healthPost,
        general: generalPost
      },
      reelCaptions: {
        tech: techReel,
        money: moneyReel,
        health: healthReel,
        general: generalReel
      },
      comments,
      mediaAssets
    };

    try {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
      console.log('[AI Simulation] Cache file written successfully:', cacheFile);
      cachedDataInMemory = cacheData;
    } catch (writeErr) {
      console.error('[AI Simulation] Failed to write cache file:', writeErr);
    }

    return cacheData;
  } catch (error: any) {
    console.warn('[AI Simulation] LLM generation failed or key unconfigured. Falling back to local templates.', error.message || error);
    const fallback = generateLocalFallbackCache(countryCode);
    try {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(fallback, null, 2), 'utf8');
      console.log('[AI Simulation] Fallback cache file written successfully:', cacheFile);
    } catch (writeErr) {
      console.error('[AI Simulation] Failed to write fallback cache file:', writeErr);
    }
    cachedDataInMemory = fallback;
    return fallback;
  }
}

// Returns simulation settings with default fallbacks
export async function getSimulationSettings() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'global' },
    });
    if (!settings) {
      return {
        simulationMode: false,
        simulatedUsersCount: 100,
        simulatedPostsCount: 50,
        simulatedReelsCount: 50,
        minLikes: 100,
        maxLikes: 10000,
        minComments: 5,
        maxComments: 200,
        minViews: 1000,
        maxViews: 100000,
        minGroupMembers: 5000,
        maxGroupMembers: 5000000,
      };
    }
    return settings;
  } catch (error) {
    console.error('Error fetching simulation settings:', error);
    return {
      simulationMode: false,
      simulatedUsersCount: 100,
      simulatedPostsCount: 50,
      simulatedReelsCount: 50,
      minLikes: 100,
      maxLikes: 10000,
      minComments: 5,
      maxComments: 200,
      minViews: 1000,
      maxViews: 100000,
      minGroupMembers: 5000,
      maxGroupMembers: 5000000,
    };
  }
}

// Quick check if simulation mode is active
export async function getIsSimulationModeOn(): Promise<boolean> {
  const settings = await getSimulationSettings();
  return settings.simulationMode;
}

// Helper to generate realistic, natural usernames from a display name
export function generateRealisticUsername(name: string, seed: number): string {
  const parts = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/);
  const firstName = parts[0] || 'user';
  const lastName = parts[1] || '';

  const formatType = seed % 5;
  if (formatType === 0 && lastName) {
    return `${firstName}_${lastName}`;
  } else if (formatType === 1 && lastName) {
    const num = seed % 100;
    return `${firstName}.${lastName}${num ? num : ''}`;
  } else if (formatType === 2 && lastName) {
    const num = seed % 99;
    return `${firstName}${lastName}${num ? num : ''}`;
  } else if (formatType === 3) {
    return `${firstName}_${seed % 1000}`;
  } else {
    return lastName ? `${firstName}_${lastName}_` : `${firstName}_${seed % 99}`;
  }
}

// Detect country code based on user context or headers
export async function detectCountryCode(currentUserId?: string | null): Promise<string> {
  let userLocation: string | null = null;
  if (currentUserId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { location: true }
      });
      userLocation = user?.location || null;
    } catch (e) {
      console.error('Error fetching user location for simulation:', e);
    }
  }

  if (userLocation) {
    const loc = userLocation.toLowerCase();
    const hasIndianCity = [
      'mumbai', 'pune', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'kolkata',
      'ahmedabad', 'jaipur', 'lucknow', 'nagpur', 'indore', 'surat', 'kalyan', 'thane',
      'varanasi', 'mulund', 'ghatkopar', 'bhiwandi', 'panvel', 'dadar', 'chembur', 'vikroli',
      'vikhroli', 'kharadi', 'kurla', 'sion', 'govandi', 'noida', 'gurgaon', 'gurugram',
      'chakan', 'matunga', 'manikonda', 'bengal', 'maharashtra', 'karnataka', 'telangana',
      'gujarat', 'rajasthan', 'uttar pradesh', 'madhya pradesh', 'india'
    ].some(city => loc.includes(city));
    if (hasIndianCity) return 'IN';

    if (loc.includes('united states') || loc.includes('usa') || loc.includes('america')) return 'US';
    if (loc.includes('uae') || loc.includes('emirates') || loc.includes('dubai') || loc.includes('abu dhabi')) return 'AE';
    if (loc.includes('united kingdom') || loc.includes('uk') || loc.includes('london')) return 'GB';
    if (loc.includes('canada')) return 'CA';
  }

  let countryHeader: string | null = null;
  try {
    const reqHeaders = headers();
    countryHeader = reqHeaders.get('x-vercel-ip-country') || 
                    reqHeaders.get('cf-ipcountry') || 
                    reqHeaders.get('x-country-code') || 
                    null;
                    
    if (!countryHeader) {
      const acceptLanguage = reqHeaders.get('accept-language');
      if (acceptLanguage) {
        const lang = acceptLanguage.toLowerCase();
        if (lang.includes('en-in') || lang.includes('hi-in') || lang.includes('hi')) {
          countryHeader = 'IN';
        } else if (lang.includes('en-gb') || lang.includes('gb-') || lang.includes('uk-')) {
          countryHeader = 'GB';
        } else if (lang.includes('en-ca') || lang.includes('fr-ca')) {
          countryHeader = 'CA';
        } else if (lang.includes('ar-ae') || lang.includes('en-ae')) {
          countryHeader = 'AE';
        }
      }
    }
  } catch (e) {
    // Suppress warning if not inside request scope
  }

  const detected = countryHeader ? countryHeader.toUpperCase().trim() : 'IN';
  return ['IN', 'US', 'AE', 'GB', 'CA'].includes(detected) ? detected : 'IN';
}

const HARDCODED_GROUPS_ALL = {
  ...HARDCODED_GROUPS_BY_COUNTRY.IN,
  ...HARDCODED_GROUPS_BY_COUNTRY.US,
  ...HARDCODED_GROUPS_BY_COUNTRY.AE
};

// Helper to detect if a group is a pre-seeded/fake simulated group
export function isFakeGroup(name: string): boolean {
  const lowerName = name.toLowerCase().trim();
  
  // "Runwal" is always real, never fake!
  if (lowerName.includes('runwal')) {
    return false;
  }

  // Pre-seeded/fake group keywords based on the groups in the DB and config
  const fakeKeywords = [
    'mumbai business group',
    'startup india',
    'real estate investors',
    'travel community',
    'fitness club',
    'gurgaon real estate',
    'flats for rent',
    'property in dubai',
    'nyc startups',
    'silicon valley developers',
    'us real estate',
    'travel usa',
    'dubai business',
    'dubai developers',
    'uae lifestyle',
    'gold jewellery',
    'एक करोड हिंदूचा',
    'largest group',
    'business group',
    'investors group',
    'property group',
    'auditors guild',
    'i love my india',
    'ai automation society',
    'sabaka mangal ho',
    'kalyan city',
    'real estate group',
    'puneकर',
    'gorakhpur',
    'all india business',
    'dubai investors',
    'delhi property',
    'noida busines',
    'mumbai largest',
    'surat largest'
  ];

  return fakeKeywords.some(keyword => lowerName.includes(keyword));
}

// Generate deterministic member count for a group
export function getGroupMemberCount(
  groupId: string,
  name: string,
  realCount: number,
  isSimulationOn: boolean,
  min: number,
  max: number
): number {
  if (!isSimulationOn) return realCount;

  // If this is a real user-created group, return the real member count!
  if (!isFakeGroup(name)) {
    return realCount;
  }

  const lowerName = name.toLowerCase().trim();
  
  if ((HARDCODED_GROUPS_ALL as any)[lowerName] !== undefined) {
    return (HARDCODED_GROUPS_ALL as any)[lowerName];
  }
  
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  // Reduce fallback simulated group count range to 50k - 90k
  const localMin = 50000;
  const localMax = 90000;
  const range = localMax - localMin;
  return localMin + (hash % (range || 1));
}

// Deterministically format compact count strings
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// Upgraded Weighted distribution of engagement stats
export function getSimulatedEngagement(
  postId: string,
  minLikes?: number,
  maxLikes?: number,
  minComments?: number,
  maxComments?: number,
  minViews?: number,
  maxViews?: number
) {
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = postId.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const roll = hash % 100;
  
  let likes = 0;
  let comments = 0;
  let views = 0;
  let shares = 0;
  let saves = 0;

  if (roll < 2) {
    // Viral Post
    likes = 40000 + (hash % 60000);
    comments = 2000 + ((hash >> 2) % 4000);
    views = 1500000 + ((hash >> 4) % 3000000);
    shares = 2000 + ((hash >> 6) % 600);
    saves = 1000 + ((hash >> 8) % 300);
  } else if (roll < 10) {
    // Trending Post
    likes = 5000 + (hash % 5000);
    comments = 300 + ((hash >> 2) % 300);
    views = 100000 + ((hash >> 4) % 150000);
    shares = 300 + ((hash >> 6) % 60);
    saves = 20 + ((hash >> 8) % 50);
  } else if (roll < 35) {
    // Popular Post
    likes = 500 + (hash % 700);
    comments = 40 + ((hash >> 2) % 50);
    views = 10000 + ((hash >> 4) % 20000);
    shares = 30 + ((hash >> 6) % 7);
    saves = 20 + ((hash >> 8) % 6);
  } else {
    // Normal Post
    likes = 15 + (hash % 35);
    comments = 2 + ((hash >> 2) % 7);
    views = 500 + ((hash >> 4) % 1000);
    shares = 1 + ((hash >> 6) % 2);
    saves = 1 + ((hash >> 8) % 2);
  }

  if (views <= likes) {
    views = likes * 3 + (hash % 100);
  }

  return {
    likes,
    comments,
    views,
    shares,
    saves,
  };
}

// Generate realistic simulated comments on the fly, adapted to country locale
export function generateDynamicComments(postId: string, count: number, countryCode = 'IN') {
  const list = [];
  
  const aiCache = getAICacheSync(countryCode);
  const commentsPool = aiCache.comments && aiCache.comments.length > 0 
    ? aiCache.comments 
    : MOCK_COMMENTS_BY_COUNTRY[countryCode] || MOCK_COMMENTS_BY_COUNTRY.OTHER;

  for (let i = 0; i < count; i++) {
    let seed = 0;
    const str = postId + i.toString();
    for (let j = 0; j < str.length; j++) {
      seed = str.charCodeAt(j) + ((seed << 5) - seed);
    }
    seed = Math.abs(seed);

    const authorCountryRoll = seed % 100;
    let authorCountry = countryCode;
    if (authorCountryRoll >= 85) {
      const countries = ['IN', 'US', 'AE', 'GB', 'CA'].filter(c => c !== countryCode);
      authorCountry = countries[seed % countries.length];
    }

    const namePool = MOCK_NAMES_BY_COUNTRY[authorCountry] || MOCK_NAMES_BY_COUNTRY.OTHER;
    const authorIndex = seed % namePool.length;
    const name = namePool[authorIndex];
    const username = generateRealisticUsername(name, seed);
    
    // Choose appropriate avatar pool
    const gender = seed % 2 === 0 ? 'female' : 'male';
    const avatarPool = gender === 'female' ? MOCK_AVATARS_FEMALE : MOCK_AVATARS_MALE;
    const avatar = avatarPool[seed % avatarPool.length];
    
    const createdAt = new Date(Date.now() - (i + 1) * 35 * 60 * 1000);

    list.push({
      id: `sim-comment-${postId}-${i}`,
      postId,
      content: commentsPool[seed % commentsPool.length],
      createdAt,
      isSimulation: true,
      author: {
        id: `sim-user-${seed % 1000}`,
        name,
        username,
        avatar,
      }
    });
  }
  return list;
}

function getCategoryKey(category: string): string {
  const norm = category.toLowerCase().trim();
  if (norm.includes('tech') || norm.includes('developer') || norm.includes('coding') || norm.includes('titans')) return 'tech';
  if (norm.includes('money') || norm.includes('business') || norm.includes('finance') || norm.includes('real estate') || norm.includes('startup') || norm.includes('invest') || norm.includes('india') || norm.includes('property') || norm.includes('dubai')) return 'money';
  if (norm.includes('health') || norm.includes('doctor') || norm.includes('medical') || norm.includes('fit') || norm.includes('wellness') || norm.includes('gym')) return 'health';
  return 'general';
}

// Generate dynamic group posts mixed with real posts, shuffling on 15s time block, adapted to user's location
export function generateDynamicGroupPosts(
  toleeId: string,
  toleeName: string,
  category: string,
  realPosts: any[] = [],
  countryCode = 'IN'
): any[] {
  const lowerName = toleeName.toLowerCase().trim();
  const slug = toleeName.replace(/\s+/g, '-').toLowerCase();
  
  let targetCount = 200;
  if (lowerName.includes('mumbai business') || lowerName.includes('mumbai_business') || slug.includes('mumbai-business')) {
    targetCount = 350;
  } else if (lowerName.includes('startup india') || lowerName.includes('startup_india') || slug.includes('startup-india')) {
    targetCount = 120;
  } else if (lowerName.includes('doctors community') || lowerName.includes('doctors_community') || slug.includes('doctors-community')) {
    targetCount = 500;
  } else if (lowerName.includes('real estate') || lowerName.includes('real_estate') || slug.includes('real-estate') || slug.includes('property')) {
    targetCount = 900;
  } else {
    let hash = 0;
    for (let i = 0; i < toleeId.length; i++) {
      hash = toleeId.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    targetCount = 50 + (hash % 901); // 50 to 950
  }

  const timeBlock = Math.floor(Date.now() / 15000);
  const activeCount = Math.min(targetCount, 60);
  const startIndex = timeBlock % targetCount;
  const simPosts: any[] = [];

  for (let i = 0; i < activeCount; i++) {
    const postIndex = (startIndex + i) % targetCount;
    const postId = `sim-post-${toleeId}-${postIndex}`;

    let postSeed = 0;
    for (let j = 0; j < postId.length; j++) {
      postSeed = postId.charCodeAt(j) + ((postSeed << 5) - postSeed);
    }
    postSeed = Math.abs(postSeed);

    const authorCountryRoll = postSeed % 100;
    let authorCountry = countryCode;
    if (authorCountryRoll >= 85) {
      const countries = ['IN', 'US', 'AE', 'GB', 'CA'].filter(c => c !== countryCode);
      authorCountry = countries[postSeed % countries.length];
    }

    const cityPool = MOCK_CITIES_BY_COUNTRY[authorCountry] || MOCK_CITIES_BY_COUNTRY.OTHER;

    // Load AI cache for author country
    const aiCache = getAICacheSync(authorCountry);
    const usersPool = aiCache.users && aiCache.users.length > 0 
      ? aiCache.users 
      : generateLocalFallbackCache(authorCountry).users;

    const cachedUser = usersPool[postSeed % usersPool.length];
    const authorName = cachedUser.name;
    const username = generateRealisticUsername(authorName, postSeed);
    
    // Choose appropriate avatar pool
    const avatarPool = cachedUser.gender === 'female' ? MOCK_AVATARS_FEMALE : MOCK_AVATARS_MALE;
    const avatar = avatarPool[postSeed % avatarPool.length];
    const profession = cachedUser.profession;
    const location = cityPool[postSeed % cityPool.length];
    const catKey = cachedUser.postCategory;

    const captionsList = aiCache.captions[catKey] || aiCache.captions.general;
    const reelsList = aiCache.reelCaptions[catKey] || aiCache.reelCaptions.general;

    const typeRoll = postSeed % 100;
    let postType = 'regular';
    let content = '';
    let mediaUrls: string | null = null;
    let mediaTypes: string | null = null;

    const fallbackTemplates = CATEGORY_TEMPLATES_BY_COUNTRY[authorCountry] || CATEGORY_TEMPLATES_BY_COUNTRY.GLOBAL;
    const templates = fallbackTemplates[catKey] || fallbackTemplates.general;

    if (typeRoll < 10) {
      postType = 'poll';
      const pollTpl = templates.polls[postSeed % templates.polls.length];
      content = `📊 POLL: ${pollTpl.question}\n\nOptions:\n` + pollTpl.options.map((o) => `  [ ] ${o}`).join('\n');
    } else if (typeRoll < 18) {
      postType = 'event';
      content = `📅 EVENT: ${templates.events[postSeed % templates.events.length]}`;
    } else if (typeRoll < 26) {
      postType = 'announcement';
      content = `📢 ANNOUNCEMENT: ${templates.announcements[postSeed % templates.announcements.length]}`;
    } else if (typeRoll < 38) {
      postType = 'question';
      content = `❓ QUESTION: ${templates.questions[postSeed % templates.questions.length]}`;
    } else {
      postType = 'regular';
      
      const mediaRoll = (postSeed >> 2) % 100;
      let selectedMediaType: 'image' | 'video' | 'text' = 'text';
      if (mediaRoll < 45) {
        selectedMediaType = 'image';
      } else if (mediaRoll < 80) {
        selectedMediaType = 'video';
      } else {
        selectedMediaType = 'text';
      }

      if (selectedMediaType === 'text') {
        content = captionsList[postSeed % captionsList.length];
      } else {
        const catMedia = aiCache.mediaAssets?.filter(
          m => m.category === catKey && m.type === selectedMediaType
        ) || [];

        if (catMedia.length > 0) {
          const matchedAsset = catMedia[postSeed % catMedia.length];
          mediaUrls = matchedAsset.url;
          mediaTypes = matchedAsset.type;
          content = matchedAsset.caption;
        } else {
          // Fallback if no mediaAssets in cache
          content = captionsList[postSeed % captionsList.length];
          if (selectedMediaType === 'image') {
            const pexQuery = getPexelsQueryForCategory(catKey);
            fetchPexelsImagesInBackground(catKey);
            const cachedList = cachedPexelsImages[pexQuery];
            if (cachedList && cachedList.length > 0) {
              mediaUrls = cachedList[postSeed % cachedList.length];
            } else {
              const imgList = UNSPLASH_IMAGES[catKey] || UNSPLASH_IMAGES.general;
              mediaUrls = imgList[postSeed % imgList.length];
            }
            mediaTypes = 'image';
          } else {
            const pexQuery = getPexelsQueryForCategory(catKey);
            fetchPexelsVideosInBackground(catKey);
            const cachedList = cachedPexelsVideos[pexQuery];
            if (cachedList && cachedList.length > 0) {
              mediaUrls = cachedList[postSeed % cachedList.length];
            } else {
              const query = getPixabayQueryForCategory(catKey);
              fetchPixabayVideosInBackground(catKey);
              const cachedPix = cachedPixabayVideos[query];
              if (cachedPix && cachedPix.length > 0) {
                mediaUrls = cachedPix[postSeed % cachedPix.length];
              } else {
                mediaUrls = FALLBACK_PIXABAY_VIDEOS[postSeed % FALLBACK_PIXABAY_VIDEOS.length];
              }
            }
            mediaTypes = 'video';
          }
        }
      }
    }

    const createdAt = new Date(Date.now() - (i * 25 * 60 * 1000) - (timeBlock % 10) * 15 * 1000);
    const eng = getSimulatedEngagement(postId);

    simPosts.push({
      post: {
        id: postId,
        caption: content,
        mediaUrls,
        mediaTypes,
        postType,
        visibility: 'public',
        shareCount: eng.shares,
        location,
        subLocation: profession,
        createdAt,
        updatedAt: createdAt,
        isSimulation: true,
        author: {
          id: `sim-user-${postSeed % 1000}-${authorCountry}`,
          name: authorName,
          username,
          avatar,
          isPrivate: false
        },
        tolees: [
          {
            tolee: {
              id: toleeId,
              name: toleeName,
              slug
            }
          }
        ],
        likes: [],
        savedBy: [],
        reposts: [],
        _count: {
          likes: eng.likes,
          comments: eng.comments,
          reposts: eng.shares,
          views: eng.views,
          saves: eng.saves
        },
        savesCount: eng.saves,
        comments: generateDynamicComments(postId, Math.min(eng.comments, 4), authorCountry)
      }
    });
  }

  const mixed: any[] = [];
  let simIdx = 0;
  let realIdx = 0;

  while (simIdx < simPosts.length || realIdx < realPosts.length) {
    for (let k = 0; k < 2 && simIdx < simPosts.length; k++) {
      mixed.push(simPosts[simIdx]);
      simIdx++;
    }
    if (realIdx < realPosts.length) {
      mixed.push(realPosts[realIdx]);
      realIdx++;
    }
  }

  return mixed;
}

// Seed or update the pool of simulated users, posts, and comments
export async function syncSimulationData() {
  const settings = await getSimulationSettings();
  
  // Clean up existing simulated records safely to prevent foreign key errors
  await prisma.comment.deleteMany({
    where: {
      OR: [
        { isSimulation: true },
        { post: { isSimulation: true } },
        { author: { isSimulation: true } }
      ]
    }
  });

  await prisma.like.deleteMany({
    where: {
      OR: [
        { post: { isSimulation: true } },
        { user: { isSimulation: true } }
      ]
    }
  });

  await prisma.follow.deleteMany({
    where: {
      OR: [
        { follower: { isSimulation: true } },
        { following: { isSimulation: true } }
      ]
    }
  });

  await prisma.toleeMember.deleteMany({
    where: {
      user: { isSimulation: true }
    }
  });

  await prisma.postTolee.deleteMany({
    where: {
      post: { isSimulation: true }
    }
  });

  await prisma.post.deleteMany({ where: { isSimulation: true } });
  await prisma.user.deleteMany({ where: { isSimulation: true } });

  if (!settings.simulationMode) {
    return { success: true, message: 'Simulation mode is OFF. Cleaned up simulated data.' };
  }

  // Pre-warm the cache using either LLM or fallback
  const countryCode = await detectCountryCode(null);
  const aiCache = await loadOrCreateAICache(countryCode, true);

  const actualUsersCount = Math.min(settings.simulatedUsersCount, 150);
  const actualPostsCount = Math.min(settings.simulatedPostsCount, 100);
  const actualReelsCount = Math.min(settings.simulatedReelsCount, 100);

  const activeTolees = await prisma.tolee.findMany({ select: { id: true } });
  if (activeTolees.length === 0) {
    return { success: false, error: 'No active groups (Tolees) found in the database to link simulated posts to.' };
  }

  // Pre-fetch Pexels assets in parallel for seeding
  try {
    await Promise.all([
      fetchPexelsImages('tech'),
      fetchPexelsImages('money'),
      fetchPexelsImages('health'),
      fetchPexelsImages('general'),
      fetchPexelsVideos('tech'),
      fetchPexelsVideos('money'),
      fetchPexelsVideos('health'),
      fetchPexelsVideos('general'),
    ]);
    console.log('[Pexels] Seeding media assets successfully fetched and pre-warmed.');
  } catch (err) {
    console.warn('[Pexels] Pre-fetching failed, using fallbacks during seeding:', err);
  }

  // Helper for matching cached Pexels URLs
  const getSeededVideoUrl = (category: string, idx: number) => {
    const query = getPexelsQueryForCategory(category);
    const cachedList = cachedPexelsVideos[query];
    if (cachedList && cachedList.length > 0) {
      return cachedList[idx % cachedList.length];
    }
    return FALLBACK_PIXABAY_VIDEOS[idx % FALLBACK_PIXABAY_VIDEOS.length];
  };

  const getSeededImageUrl = (category: string, idx: number) => {
    const query = getPexelsQueryForCategory(category);
    const cachedList = cachedPexelsImages[query];
    if (cachedList && cachedList.length > 0) {
      return cachedList[idx % cachedList.length];
    }
    const imgList = UNSPLASH_IMAGES[category] || UNSPLASH_IMAGES.general;
    return imgList[idx % imgList.length];
  };

  // 1. Create simulated users
  const usersToCreate = [];
  for (let i = 0; i < actualUsersCount; i++) {
    const cachedUser = aiCache.users[i % aiCache.users.length];
    const suffix = Math.floor(i / aiCache.users.length) > 0 ? ` ${Math.floor(i / aiCache.users.length)}` : '';
    const name = cachedUser.name + suffix;
    const username = generateRealisticUsername(name, i);
    const email = `${username}@simulatedtolee.com`;
    
    // Choose appropriate avatar pool matching gender
    const avatarPool = cachedUser.gender === 'female' ? MOCK_AVATARS_FEMALE : MOCK_AVATARS_MALE;
    const avatar = avatarPool[i % avatarPool.length];
    
    const joinDaysAgo = Math.floor(Math.random() * 180) + 10;
    const userCreatedAt = new Date(Date.now() - joinDaysAgo * 24 * 60 * 60 * 1000);

    usersToCreate.push({
      username,
      name,
      email,
      avatar,
      image: avatar,
      bio: cachedUser.bio,
      profession: cachedUser.profession,
      location: cachedUser.location,
      isVerified: i % 4 === 0,
      isSimulation: true,
      createdAt: userCreatedAt,
    });
  }

  await prisma.user.createMany({ data: usersToCreate });
  const createdUsers = await prisma.user.findMany({
    where: { isSimulation: true },
    select: { id: true, profession: true, location: true, name: true, username: true }
  });

  if (createdUsers.length === 0) {
    return { success: false, error: 'Failed to retrieve seeded simulated users.' };
  }

  // 2. Setup followers & memberships
  const realUsers = await prisma.user.findMany({
    where: { isSimulation: false },
    take: 10,
    select: { id: true }
  });

  const followsToCreate = [];
  const toleeMemberships = [];

  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];

    // Join Tolee groups
    const joinCount = Math.min(activeTolees.length, 2 + (i % 2));
    const shuffledTolees = [...activeTolees].sort(() => 0.5 - (i % 10) / 10);
    for (let j = 0; j < joinCount; j++) {
      toleeMemberships.push({
        userId: user.id,
        toleeId: shuffledTolees[j].id,
        role: 'member',
        status: 'approved'
      });
    }

    // Follow fellow simulated users
    const followCount = Math.min(createdUsers.length - 1, 3 + (i % 3));
    for (let j = 1; j <= followCount; j++) {
      const targetUser = createdUsers[(i + j) % createdUsers.length];
      followsToCreate.push({
        followerId: user.id,
        followingId: targetUser.id,
        status: 'approved'
      });
    }

    // Follow real creators
    if (realUsers.length > 0) {
      const realCount = Math.min(realUsers.length, 1 + (i % 2));
      for (let j = 0; j < realCount; j++) {
        followsToCreate.push({
          followerId: user.id,
          followingId: realUsers[j].id,
          status: 'approved'
        });
      }
    }
  }

  // De-duplicate follow relationships
  const uniqueFollowsMap = new Map();
  for (const f of followsToCreate) {
    const key = `${f.followerId}-${f.followingId}`;
    uniqueFollowsMap.set(key, f);
  }

  await prisma.follow.createMany({ data: Array.from(uniqueFollowsMap.values()) });
  await prisma.toleeMember.createMany({ data: toleeMemberships });

  // 3. Create unique posts and reels
  const postsToCreate = [];
  const posters = createdUsers.filter((_u: any, idx: number) => idx % 2 === 0);
  if (posters.length === 0) posters.push(createdUsers[0]);

  const getCategoryFromProfession = (prof: string | null): string => {
    if (!prof) return 'general';
    const norm = prof.toLowerCase();
    if (norm.includes('engineer') || norm.includes('designer') || norm.includes('marketer') || norm.includes('influencer')) return 'tech';
    if (norm.includes('owner') || norm.includes('agent') || norm.includes('investor') || norm.includes('creator')) return 'money';
    if (norm.includes('doctor') || norm.includes('trainer') || norm.includes('blogger')) return 'health';
    return 'general';
  };

  const usedCaptions = new Set<string>();

  // Regular Posts
  for (let i = 0; i < actualPostsCount; i++) {
    const author = posters[i % posters.length];
    const category = getCategoryFromProfession(author.profession);
    const captionsList = aiCache.captions[category] || aiCache.captions.general;

    let mediaUrls: string | null = null;
    let mediaTypes: string | null = null;
    let caption = '';

    const mediaRoll = i % 10;
    let selectedType: 'image' | 'video' | 'text' = 'text';
    if (mediaRoll < 5) {
      selectedType = 'image';
    } else if (mediaRoll < 7) {
      selectedType = 'video';
    }

    if (selectedType === 'text') {
      caption = captionsList[i % captionsList.length];
    } else {
      const catMedia = aiCache.mediaAssets?.filter(m => m.category === category && m.type === selectedType) || [];
      if (catMedia.length > 0) {
        const asset = catMedia[i % catMedia.length];
        mediaUrls = asset.url;
        mediaTypes = asset.type;
        caption = asset.caption;
      } else {
        // Fallback
        caption = captionsList[i % captionsList.length];
        if (selectedType === 'image') {
          mediaUrls = getSeededImageUrl(category, i);
          mediaTypes = 'image';
        } else {
          mediaUrls = getSeededVideoUrl(category, i);
          mediaTypes = 'video';
        }
      }
    }

    if (usedCaptions.has(caption)) {
      caption = caption + ` (Update #${Math.floor(i / captionsList.length) + 1})`;
    }
    usedCaptions.add(caption);

    postsToCreate.push({
      authorId: author.id,
      caption,
      mediaUrls,
      mediaTypes,
      postType: 'regular',
      visibility: 'public',
      isSimulation: true,
      createdAt: new Date(Date.now() - i * 4 * 3600 * 1000),
      updatedAt: new Date(Date.now() - i * 4 * 3600 * 1000),
    });
  }

  // Reels
  for (let i = 0; i < actualReelsCount; i++) {
    const author = posters[(i + 3) % posters.length];
    const category = getCategoryFromProfession(author.profession);
    const catVideos = aiCache.mediaAssets?.filter(m => m.category === category && m.type === 'video') || [];
    const reelsList = aiCache.reelCaptions[category] || aiCache.reelCaptions.general || [];

    let caption = '';
    let mediaUrls = '';

    if (catVideos.length > 0) {
      const asset = catVideos[i % catVideos.length];
      mediaUrls = asset.url;
      caption = asset.caption;
    } else {
      caption = reelsList[i % reelsList.length];
      mediaUrls = getSeededVideoUrl(category, i);
    }

    if (usedCaptions.has(caption)) {
      caption = caption + ` (Reel #${Math.floor(i / reelsList.length) + 1})`;
    }
    usedCaptions.add(caption);

    postsToCreate.push({
      authorId: author.id,
      caption,
      mediaUrls,
      mediaTypes: 'video',
      postType: 'reel',
      visibility: 'public',
      isSimulation: true,
      createdAt: new Date(Date.now() - i * 2 * 3600 * 1000),
      updatedAt: new Date(Date.now() - i * 2 * 3600 * 1000),
    });
  }

  await prisma.post.createMany({ data: postsToCreate });
  const createdPosts = await prisma.post.findMany({
    where: { isSimulation: true },
    select: { id: true, authorId: true, createdAt: true }
  });

  // Link posts to Tolee groups
  const postToleeRelations = [];
  for (let i = 0; i < createdPosts.length; i++) {
    const post = createdPosts[i];
    const toleeIndex = i % activeTolees.length;
    postToleeRelations.push({
      postId: post.id,
      toleeId: activeTolees[toleeIndex].id,
      isPinned: false
    });

    if (activeTolees.length > 1 && i % 3 === 0) {
      const secondToleeIndex = (i + 1) % activeTolees.length;
      postToleeRelations.push({
        postId: post.id,
        toleeId: activeTolees[secondToleeIndex].id,
        isPinned: false
      });
    }
  }
  await prisma.postTolee.createMany({ data: postToleeRelations });

  // 4. Create Likes & Comments
  const likesToCreate = [];
  const commentsToCreate = [];

  for (let i = 0; i < createdPosts.length; i++) {
    const post = createdPosts[i];
    const roll = (i * 11) % 100;
    
    let targetLikes = 0;
    let targetComments = 0;

    if (roll < 6) {
      targetLikes = 45 + (i % 25);
      targetComments = 12 + (i % 8);
    } else if (roll < 22) {
      targetLikes = 15 + (i % 15);
      targetComments = 4 + (i % 4);
    } else {
      targetLikes = 1 + (i % 8);
      targetComments = i % 2 === 0 ? 1 : 0;
    }

    targetLikes = Math.min(targetLikes, createdUsers.length - 1);
    targetComments = Math.min(targetComments, createdUsers.length - 1);

    const interactorsPool = createdUsers.filter((u: any) => u.id !== post.authorId);

    // Seed Likes
    const shuffledLikers = [...interactorsPool].sort(() => 0.5 - Math.random()).slice(0, targetLikes);
    for (const liker of shuffledLikers) {
      likesToCreate.push({
        userId: liker.id,
        postId: post.id,
        createdAt: new Date(post.createdAt.getTime() + Math.random() * 2 * 3600 * 1000)
      });
    }

    // Seed Comments
    const shuffledCommenters = [...interactorsPool].sort(() => 0.5 - Math.random()).slice(0, targetComments);
    const postCommentsPool = [...aiCache.comments].sort(() => 0.5 - Math.random());
    
    for (let j = 0; j < shuffledCommenters.length; j++) {
      const commenter = shuffledCommenters[j];
      const commentContent = postCommentsPool[j % postCommentsPool.length] || "Outstanding! 👏";
      commentsToCreate.push({
        postId: post.id,
        authorId: commenter.id,
        content: commentContent,
        isSimulation: true,
        createdAt: new Date(post.createdAt.getTime() + (j + 1) * 12 * 60 * 1000)
      });
    }
  }

  if (likesToCreate.length > 0) {
    await prisma.like.createMany({ data: likesToCreate });
  }
  if (commentsToCreate.length > 0) {
    await prisma.comment.createMany({ data: commentsToCreate });
  }

  return { 
    success: true, 
    message: `Simulation engine turned ON. Loaded AI Cache & seeded ${createdUsers.length} users, ${createdPosts.length} posts/reels, ${likesToCreate.length} likes, and ${commentsToCreate.length} comments.` 
  };
}

// Background simulation activity runner for ongoing engagement throughout the day
export async function runBackgroundSimulationActivity() {
  try {
    const isSimOn = await getIsSimulationModeOn();
    if (!isSimOn) return;

    // Pick a random simulated user to post
    const simulatedUsers = await prisma.user.findMany({
      where: { isSimulation: true }
    });
    if (simulatedUsers.length === 0) return;

    const author = simulatedUsers[Math.floor(Math.random() * simulatedUsers.length)];

    // Get time-of-day category and theme
    const hr = new Date().getHours();
    let timeContext = 'daily life';
    let themes: string[] = [];

    if (hr >= 6 && hr < 11) {
      timeContext = 'morning';
      themes = ['morning greetings', 'breakfast', 'office commute', 'college updates'];
    } else if (hr >= 11 && hr < 16) {
      timeContext = 'afternoon';
      themes = ['lunch', 'afternoon food', 'technology', 'startups', 'business'];
    } else if (hr >= 16 && hr < 21) {
      timeContext = 'evening';
      themes = ['gym fitness', 'shopping', 'evening travel', 'daily life', 'sports cricket'];
    } else {
      timeContext = 'night';
      themes = ['dinner', 'night lifestyle', 'gaming', 'memes', 'weekend outings'];
    }

    const selectedTheme = themes[Math.floor(Math.random() * themes.length)];

    // Decide if it's a regular image post or a reel (video)
    const isReel = Math.random() > 0.5;

    // Fetch from Pexels API
    const apiKey = process.env.PEXELS_API_KEY;
    let mediaUrl: string | null = null;
    let mediaDescription = '';

    if (apiKey && apiKey.trim() !== '') {
      try {
        if (isReel) {
          // Fetch video from Pexels
          const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(selectedTheme)}&per_page=15`, {
            headers: { 'Authorization': apiKey }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.videos) && data.videos.length > 0) {
              const video = data.videos[Math.floor(Math.random() * data.videos.length)];
              const file = video.video_files?.find((f: any) => f.width && f.height && f.height > f.width) || video.video_files?.[0];
              mediaUrl = file?.link || null;
              
              const urlParts = video.url.split('/video/')[1];
              mediaDescription = urlParts ? urlParts.split('-').slice(0, -1).join(' ') : 'video clip';
            }
          }
        } else {
          // Fetch image from Pexels
          const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(selectedTheme)}&per_page=15`, {
            headers: { 'Authorization': apiKey }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.photos) && data.photos.length > 0) {
              const photo = data.photos[Math.floor(Math.random() * data.photos.length)];
              mediaUrl = photo.src?.large || null;
              mediaDescription = photo.alt || 'stock photo';
            }
          }
        }
      } catch (err) {
        console.error('[Dynamic Simulation Activity] Pexels API call failed:', err);
      }
    }

    // Fallbacks if Pexels API key is not configured or failed
    if (!mediaUrl) {
      if (isReel) {
        mediaUrl = FALLBACK_PIXABAY_VIDEOS[Math.floor(Math.random() * FALLBACK_PIXABAY_VIDEOS.length)];
        mediaDescription = 'daily life video';
      } else {
        const getCategoryFromProfession = (prof: string | null): string => {
          if (!prof) return 'general';
          const norm = prof.toLowerCase();
          if (norm.includes('engineer') || norm.includes('designer') || norm.includes('marketer') || norm.includes('influencer')) return 'tech';
          if (norm.includes('owner') || norm.includes('agent') || norm.includes('investor') || norm.includes('creator')) return 'money';
          if (norm.includes('doctor') || norm.includes('trainer') || norm.includes('blogger')) return 'health';
          return 'general';
        };
        const catKey = getCategoryFromProfession(author.profession);
        const imgList = UNSPLASH_IMAGES[catKey] || UNSPLASH_IMAGES.general;
        mediaUrl = imgList[Math.floor(Math.random() * imgList.length)];
        mediaDescription = `${catKey} activity`;
      }
    }

    // Generate dynamic caption
    let caption = `Enjoying a beautiful ${timeContext}! 🌟 #${selectedTheme.replace(/\s+/g, '')} #tolee #reels`;
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (nvidiaKey) {
      try {
        const apiMessages = [
          {
            role: 'system',
            content: `You are a real Indian social media user from "${author.location || 'Mumbai'}". Write a natural, extremely human-like caption for a social media ${isReel ? 'video/reel' : 'photo'} update.
Media content description: "${mediaDescription}"
Theme context: "${selectedTheme}"
Time of day context: "${timeContext}"
Rules:
- Write in natural, expressive Hinglish (Hindi + English mix) or conversational Indian English with casual emojis.
- Talk like a genuine individual, referencing the actual media content description naturally.
- Keep it under 2 sentences. Include 2-3 emojis and 2-3 relevant hashtags (including #tolee).
- Respond with a single JSON object having the exact key: "caption".`
          },
          {
            role: 'user',
            content: `Generate a Hinglish caption for media description "${mediaDescription}" under theme "${selectedTheme}".`
          }
        ];

        const llmRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nvidiaKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta/llama-3.1-70b-instruct',
            messages: apiMessages,
            temperature: 0.8,
            max_tokens: 200,
            response_format: { type: 'json_object' }
          })
        });

        if (llmRes.ok) {
          const data = await llmRes.json();
          const text = data?.choices?.[0]?.message?.content || '';
          const parsed = JSON.parse(text);
          if (parsed.caption) {
            caption = parsed.caption;
          }
        }
      } catch (err) {
        console.warn('[Dynamic Simulation Activity] AI Caption failed, using fallback:', err);
      }
    } else {
      // Fallback from cache
      const aiCache = getAICacheSync('IN');
      const getCategoryFromProfession = (prof: string | null): string => {
        if (!prof) return 'general';
        const norm = prof.toLowerCase();
        if (norm.includes('engineer') || norm.includes('designer') || norm.includes('marketer') || norm.includes('influencer')) return 'tech';
        if (norm.includes('owner') || norm.includes('agent') || norm.includes('investor') || norm.includes('creator')) return 'money';
        if (norm.includes('doctor') || norm.includes('trainer') || norm.includes('blogger')) return 'health';
        return 'general';
      };
      const catKey = getCategoryFromProfession(author.profession);
      const list = isReel 
        ? (aiCache.reelCaptions[catKey] || aiCache.reelCaptions.general)
        : (aiCache.captions[catKey] || aiCache.captions.general);
      if (list && list.length > 0) {
        caption = list[Math.floor(Math.random() * list.length)];
      }
    }

    // Find a Tolee group to link
    const publicTolees = await prisma.tolee.findMany({
      where: { isPrivate: false },
      select: { id: true },
      take: 5
    });
    const targetToleeId = publicTolees.length > 0
      ? publicTolees[Math.floor(Math.random() * publicTolees.length)].id
      : null;

    // Create the post
    const newPost = await prisma.post.create({
      data: {
        caption,
        mediaUrls: mediaUrl,
        mediaTypes: isReel ? 'video' : 'image',
        postType: isReel ? 'reel' : 'regular',
        status: 'published',
        authorId: author.id,
        isSimulation: true,
        tolees: targetToleeId ? {
          create: [
            { toleeId: targetToleeId }
          ]
        } : undefined
      }
    });

    console.log(`[Dynamic Simulation Activity] Created dynamic post ${newPost.id} by simulated user ${author.name}`);

    // Simulate engagement (likes/comments)
    const otherUsers = simulatedUsers.filter((u: any) => u.id !== author.id);
    if (otherUsers.length > 0) {
      // Determine engagement scale
      const likesCount = Math.floor(5 + Math.random() * 20);
      const commentsCount = Math.floor(1 + Math.random() * 3);

      const shufflers = [...otherUsers].sort(() => 0.5 - Math.random());
      
      // Likes
      const likesData = shufflers.slice(0, likesCount).map(u => ({
        userId: u.id,
        postId: newPost.id
      }));
      await prisma.like.createMany({ data: likesData, skipDuplicates: true });

      // Comments
      const commenters = shufflers.slice(likesCount, likesCount + commentsCount);
      const aiCache = getAICacheSync('IN');
      const commentsPool = aiCache.comments || ['Great post!', 'Wow!', 'Nice!'];
      
      for (let i = 0; i < commenters.length; i++) {
        const commenter = commenters[i];
        let commentContent = commentsPool[Math.floor(Math.random() * commentsPool.length)];

        if (nvidiaKey) {
          try {
            const commentRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${nvidiaKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'meta/llama-3.1-70b-instruct',
                messages: [
                  {
                    role: 'system',
                    content: `You are an Indian social media user. Write a single, short comment reacting to this post caption: "${caption}". Keep it casual, friendly, and natural. Hinglish/English mix is preferred. Use 1 emoji. Do not write a long paragraph. Respond with a JSON object having key "comment".`
                  }
                ],
                temperature: 0.8,
                max_tokens: 100,
                response_format: { type: 'json_object' }
              })
            });
            if (commentRes.ok) {
              const data = await commentRes.json();
              const text = data?.choices?.[0]?.message?.content || '';
              const parsed = JSON.parse(text);
              if (parsed.comment) {
                commentContent = parsed.comment;
              }
            }
          } catch (e) {}
        }

        await prisma.comment.create({
          data: {
            content: commentContent,
            postId: newPost.id,
            authorId: commenter.id,
            isSimulation: true
          }
        });
      }
    }
  } catch (err) {
    console.error('[Dynamic Simulation Activity] Failed:', err);
  }
}
