import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Fetch published World Projects with coordinates
    const projects = await prisma.worldProject.findMany({
      where: {
        status: 'published',
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        type: true,
        name: true,
        slug: true,
        description: true,
        bannerImage: true,
        latitude: true,
        longitude: true,
        locationText: true
      }
    });

    // 2. Fetch active Marketplace Listings with coordinates
    const listings = await prisma.listing.findMany({
      where: {
        status: 'active',
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        images: true,
        latitude: true,
        longitude: true,
        locationText: true
      }
    });

    // 3. Add local mock items to ensure map looks active (Kalyan West / Khadakpada focus)
    const mockMarkers = [
      {
        id: 'mock-meetup-1',
        type: 'meetup',
        name: 'Khadakpada Creators Meetup',
        description: 'Monthly physical meetup of developers, creators, and freelancers in Kalyan.',
        latitude: 19.2610,
        longitude: 73.1280,
        locationText: 'Khadakpada, Kalyan',
        link: '/t/kalyan-creators'
      },
      {
        id: 'mock-call-1',
        type: 'live_chat',
        name: 'Kalyan West Sports Group Call',
        description: 'Live audio call discussing weekend badminton tournament matchups.',
        latitude: 19.2530,
        longitude: 73.1200,
        locationText: 'Kalyan West, Kalyan',
        link: '/t/sports-kalyan'
      },
      {
        id: 'mock-reels-1',
        type: 'trending_reel',
        name: 'Riverside Sunset Walk Reel',
        description: 'Vibrant sunset walk along the riverside road in Kalyan West.',
        latitude: 19.2585,
        longitude: 73.1160,
        locationText: 'Riverside Road, Kalyan',
        link: '/reels'
      }
    ];

    const markers = [
      ...projects.map(p => ({
        id: p.id,
        type: p.type.toLowerCase(), // website, store, restaurant, blog
        name: p.name,
        description: p.description || 'No description available.',
        image: p.bannerImage,
        latitude: p.latitude,
        longitude: p.longitude,
        locationText: p.locationText || 'Local Site',
        link: `/world/${p.slug}`
      })),
      ...listings.map(l => ({
        id: l.id,
        type: 'marketplace',
        name: l.title,
        description: `₹${l.price} - ${l.description.substring(0, 80)}...`,
        image: l.images ? l.images.split(',')[0] : null,
        latitude: l.latitude,
        longitude: l.longitude,
        locationText: l.locationText,
        link: `/marketplace`
      })),
      ...mockMarkers
    ];

    return NextResponse.json({ success: true, markers });
  } catch (error) {
    console.error('[Map API] Error fetching markers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch map markers' }, { status: 500 });
  }
}
