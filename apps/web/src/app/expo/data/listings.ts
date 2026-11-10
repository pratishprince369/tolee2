import { ExpoListing, ExpoCategoryFilterItem } from '../types';

export const EXPO_CATEGORIES: ExpoCategoryFilterItem[] = [
  { id: 'all', label: '🎪 All Stalls' },
  { id: 'fashion', label: '👗 Fashion & Ethnic' },
  { id: 'wellness', label: '🌿 Health & Wellness' },
  { id: 'food', label: '☕ Food & Gourmet' },
  { id: 'jewellery', label: '💍 Jewellery & Accessories' },
];

export const EXPO_CONTACT = {
  phone: '+918976274649',
  displayPhone: '+91 8976274649',
  slotPriceFormatted: '₹49,999/-',
};

export const EXPO_LISTINGS: ExpoListing[] = [
  {
    id: 'kashvi-handlooms',
    brandName: 'Kashvi Ethnic Studio',
    category: 'fashion',
    categoryLabel: '👗 Fashion & Ethnic',
    stallTier: 'vip',
    stallTierLabel: '🏆 VIP Front-Row Stall',
    city: 'Jaipur, Rajasthan',
    tagline: 'Authentic Sanganeri Block-Printed Cotton Ensembles',
    offerLabel: 'FLAT 50% OFF EXPO DEAL',
    offerDescription: 'Pure Mulmul Cotton Anarkali Suit set with hand-block dupatta & pants. Pre-washed, breathable organic fabric.',
    productName: 'Royal Indigo Floral Anarkali Set (3-Piece)',
    originalPrice: 2999,
    expoPrice: 1499,
    discountPct: 50,
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    creatorReview: {
      creatorName: 'Aanya Sharma',
      handle: '@aanya_fashion (120k)',
      rating: '4.9 ★ (Verified Fit & Fabric)'
    },
    features: ['100% Pure Cotton', 'Hand Block Printed', 'Free Shipping & COD Available'],
    whatsappMessage: 'Hello Kashvi Studio, I saw your 50% OFF Royal Indigo Anarkali on Tolee Expo! I want to book my size.',
    isVerified: true
  },
  {
    id: 'nutriherb-organics',
    brandName: 'NutriHerb Himalayan Organics',
    category: 'wellness',
    categoryLabel: '🌿 Health & Wellness',
    stallTier: 'gold',
    stallTierLabel: '🥇 Gold Expo Stall',
    city: 'Dehradun, Uttarakhand',
    tagline: 'Direct-from-Source Himalayan Shilajit & Herbal Extracts',
    offerLabel: 'BUY 1 GET 1 FREE + SHIP FREE',
    offerDescription: 'Grade-A Purified Himalayan Shilajit Resin (20g Jar) with 75%+ Fulvic Acid. Free Lab Certificate with each order.',
    productName: 'Pure Gold Grade Himalayan Shilajit Resin (20g)',
    originalPrice: 1999,
    expoPrice: 999,
    discountPct: 50,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    creatorReview: {
      creatorName: 'Dr. Rohit Mehra',
      handle: '@dr_fit_rohit (Health Creator)',
      rating: '5.0 ★ (Lab Test Verified)'
    },
    features: ['Ayush Certified', 'Lab Tested 75%+ Fulvic', 'Buy 1 Get 1 Free Promo'],
    whatsappMessage: 'Hi NutriHerb, I saw your Buy 1 Get 1 Free Himalayan Shilajit offer on Tolee Expo. Please share order details.',
    isVerified: true
  },
  {
    id: 'urbanchai-co',
    brandName: 'UrbanChai Co. & Bakery',
    category: 'food',
    categoryLabel: '☕ Food & Gourmet',
    stallTier: 'gold',
    stallTierLabel: '🥇 Gold Expo Stall',
    city: 'Mumbai / Pune',
    tagline: 'Artisanal Spiced Tea Blends & Handmade Butter Cookies',
    offerLabel: 'EXPO TASTING COMBO (SAVE ₹350)',
    offerDescription: 'Kadak Ginger-Cardamom Masala Tea (250g) + Pista Cashew Artisan Butter Cookies (Box of 12). Vacuum packed fresh.',
    productName: 'Chai Lover Feast Box (Tea + 12 Cookies)',
    originalPrice: 850,
    expoPrice: 499,
    discountPct: 41,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    creatorReview: {
      creatorName: 'Samir Joshi',
      handle: '@mumbaifoodie_sam',
      rating: '4.8 ★ (Must-Try Aroma)'
    },
    features: ['No Added Preservatives', '100% Real Spices', 'Same-Day Dispatch'],
    whatsappMessage: 'Hello UrbanChai Co, I want to order the Chai Lover Feast Box at ₹499 seen on Tolee Expo.',
    isVerified: true
  },
  {
    id: 'auracrafts-jewels',
    brandName: 'AuraCrafts Eco-Jewels',
    category: 'jewellery',
    categoryLabel: '💍 Jewellery & Silver',
    stallTier: 'silver',
    stallTierLabel: '🥈 Silver Expo Stall',
    city: 'Delhi-NCR',
    tagline: '925 Sterling Silver & Moissanite Diamond Daily Wear',
    offerLabel: 'EXTRA 25% OFF CODE: EXPO2026',
    offerDescription: 'Certified 925 Pure Silver Solitaire Ring with VVS Moissanite Diamond center. Anti-tarnish rhodium coating.',
    productName: 'Celeste 1-Carat Moissanite Silver Solitaire Ring',
    originalPrice: 2450,
    expoPrice: 1850,
    discountPct: 24,
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
    creatorReview: {
      creatorName: 'Neha Verma',
      handle: '@neha_lifestyle',
      rating: '4.9 ★ (Indistinguishable from Diamond)'
    },
    features: ['925 Hallmark Certified', 'Zero Tarnish Guarantee', 'Gift Box & Certificate'],
    whatsappMessage: 'Hi AuraCrafts, I am interested in the Celeste 1-Carat Ring offer from Tolee Expo with code EXPO2026.',
    isVerified: true
  }
];
