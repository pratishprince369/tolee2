import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();

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
        locationText: true,
        country: true,
        state: true,
        district: true,
        city: true,
        area: true,
        contactNumber: true,
        whatsapp: true,
        website: true,
        openingHours: true,
        photos: true,
        videos: true,
        offers: true,
        socialLinks: true
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

    // 3. Fetch location-based Tolee groups
    const toleeGroups = await prisma.tolee.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        avatar: true,
        latitude: true,
        longitude: true,
        location: true,
        address: true,
        country: true,
        state: true,
        district: true,
        city: true,
        area: true,
        tags: true
      }
    });

    // 4. Fetch active or recently ended events (within 24 hours)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const dbEvents = await prisma.event.findMany({
      where: {
        status: { in: ['active', 'ended'] },
        OR: [
          { status: 'active' },
          { status: 'ended', endDate: { gte: twentyFourHoursAgo } }
        ]
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        attendees: true
      }
    });

    // 5. Add local mock items to ensure map looks active (Kalyan West / Khadakpada focus)
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
      ...projects.map((p: any) => ({
        id: p.id,
        type: p.type.toLowerCase(), // website, store, restaurant, blog
        name: p.name,
        description: p.description || 'No description available.',
        image: p.bannerImage,
        latitude: p.latitude,
        longitude: p.longitude,
        locationText: p.locationText || 'Local Site',
        link: p.type === 'RESTAURANT' ? `/restaurant/${p.slug}` : p.type === 'STORE' ? `/store/${p.slug}` : `/world/${p.slug}`,
        country: p.country,
        state: p.state,
        district: p.district,
        city: p.city,
        area: p.area,
        contactNumber: p.contactNumber,
        whatsapp: p.whatsapp,
        website: p.website,
        openingHours: p.openingHours,
        photos: p.photos,
        videos: p.videos,
        offers: p.offers,
        socialLinks: p.socialLinks
      })),
      ...listings.map((l: any) => ({
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
      ...toleeGroups.map((tg: any) => ({
        id: tg.id,
        type: 'group',
        name: tg.name,
        description: tg.description || 'Welcome to this community!',
        image: tg.avatar || null,
        latitude: tg.latitude as number,
        longitude: tg.longitude as number,
        locationText: tg.address || tg.location || 'Local Group',
        link: `/t/${tg.slug}`,
        country: tg.country,
        state: tg.state,
        district: tg.district,
        city: tg.city,
        area: tg.area,
        tags: tg.tags
      })),
      ...dbEvents.map((e: any) => ({
        id: e.id,
        type: 'event',
        name: e.name,
        description: e.description || 'No description available.',
        image: e.bannerImage || null,
        latitude: e.latitude,
        longitude: e.longitude,
        locationText: e.address || 'Local Event',
        link: `/map?eventId=${e.id}`,
        category: e.category,
        startDate: e.startDate.toISOString(),
        startTime: e.startTime,
        endDate: e.endDate.toISOString(),
        endTime: e.endTime,
        visibility: e.visibility,
        maxAttendees: e.maxAttendees,
        contactDetails: e.contactDetails,
        status: e.status,
        creatorId: e.creatorId,
        creatorName: e.creator.username || e.creator.name,
        creatorAvatar: e.creator.avatar,
        attendeeCount: e.attendees.filter((a: any) => a.status === 'approved').length,
        attendees: e.attendees.map((a: any) => ({ userId: a.userId, status: a.status })),
        country: e.country,
        state: e.state,
        district: e.district,
        city: e.city,
        area: e.area,
        ticketPrice: e.ticketPrice,
        maxCapacity: e.maxCapacity,
        dressCode: e.dressCode,
        rules: e.rules,
        whatsappNumber: e.whatsappNumber,
        website: e.website,
        galleryImages: e.galleryImages,
        tags: e.tags,
        autoWelcomeMessage: e.autoWelcomeMessage
      })),
      ...mockMarkers
    ];

    return NextResponse.json({ success: true, markers });
  } catch (error) {
    console.error('[Map API] Error fetching markers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch map markers' }, { status: 500 });
  }
}
