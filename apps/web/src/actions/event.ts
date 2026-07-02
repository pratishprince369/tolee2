'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitize';

export async function createEventAction(data: {
  name: string;
  description?: string;
  bannerImage?: string;
  category: string;
  startDate: string; // ISO string
  startTime: string; // "HH:MM"
  endDate: string; // ISO string
  endTime: string; // "HH:MM"
  latitude: number;
  longitude: number;
  address: string;
  visibility?: string;
  maxAttendees?: number;
  contactDetails?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  area?: string;
  ticketPrice?: number;
  maxCapacity?: number;
  dressCode?: string;
  rules?: string;
  whatsappNumber?: string;
  website?: string;
  galleryImages?: string;
  tags?: string;
  autoWelcomeMessage?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const safeName = sanitizeText(data.name || '', 100);
    if (!safeName) {
      return { success: false, error: 'Event name cannot be empty.' };
    }

    const safeDescription = sanitizeText(data.description || '', 1500);
    const safeCategory = sanitizeText(data.category || 'General', 50);
    const safeAddress = sanitizeText(data.address || '', 200);

    const startDateTimeStr = `${data.startDate.split('T')[0]}T${data.startTime}:00`;
    const endDateTimeStr = `${data.endDate.split('T')[0]}T${data.endTime}:00`;

    const start = new Date(startDateTimeStr);
    const end = new Date(endDateTimeStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: 'Invalid start or end dates.' };
    }

    if (end <= start) {
      return { success: false, error: 'End Date/Time must be after Start Date/Time.' };
    }

    const event = await prisma.event.create({
      data: {
        name: safeName,
        description: safeDescription,
        bannerImage: data.bannerImage || null,
        category: safeCategory,
        startDate: start,
        startTime: data.startTime,
        endDate: end,
        endTime: data.endTime,
        latitude: data.latitude,
        longitude: data.longitude,
        address: safeAddress,
        country: data.country || null,
        state: data.state || null,
        district: data.district || null,
        city: data.city || null,
        area: data.area || null,
        ticketPrice: data.ticketPrice || 0,
        maxCapacity: data.maxCapacity || data.maxAttendees || null,
        dressCode: data.dressCode || null,
        rules: data.rules || null,
        whatsappNumber: data.whatsappNumber || null,
        website: data.website || null,
        galleryImages: data.galleryImages || null,
        tags: data.tags || null,
        autoWelcomeMessage: data.autoWelcomeMessage || null,
        visibility: data.visibility || 'public',
        maxAttendees: data.maxAttendees || data.maxCapacity || null,
        contactDetails: data.contactDetails || null,
        creatorId: userId,
        attendees: {
          create: {
            userId,
            status: 'approved'
          }
        }
      }
    });

    revalidatePath('/map');
    revalidatePath('/creator-dashboard');

    return { success: true, event };
  } catch (error) {
    console.error("Error creating event:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function joinEventAction(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { attendees: true }
    });

    if (!event) {
      return { success: false, error: 'Event not found.' };
    }

    if (event.maxAttendees && event.attendees.filter(a => a.status === 'approved').length >= event.maxAttendees) {
      return { success: false, error: 'Event has reached its maximum attendee capacity.' };
    }

    const isPrivate = event.visibility === 'private' || event.visibility === 'invite_only';
    const status = isPrivate ? 'pending' : 'approved';

    const attendee = await prisma.eventAttendee.upsert({
      where: {
        userId_eventId: { userId, eventId }
      },
      update: {
        status
      },
      create: {
        userId,
        eventId,
        status
      }
    });

    revalidatePath('/map');
    return { success: true, status, attendee };
  } catch (error) {
    console.error("Error joining event:", error);
    return { success: false, error: 'Failed to join event.' };
  }
}

export async function leaveEventAction(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    await prisma.eventAttendee.deleteMany({
      where: { userId, eventId }
    });

    revalidatePath('/map');
    return { success: true };
  } catch (error) {
    console.error("Error leaving event:", error);
    return { success: false, error: 'Failed to leave event.' };
  }
}

export async function deleteEventAction(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return { success: false, error: 'Event not found.' };
    }

    if (event.creatorId !== userId) {
      return { success: false, error: 'Only the creator can delete this event.' };
    }

    await prisma.event.delete({
      where: { id: eventId }
    });

    revalidatePath('/map');
    revalidatePath('/creator-dashboard');
    return { success: true };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { success: false, error: 'Failed to delete event.' };
  }
}

export async function duplicateEventAction(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return { success: false, error: 'Event not found.' };
    }

    const newStartDate = new Date(event.startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const newEndDate = new Date(event.endDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const duplicatedEvent = await prisma.event.create({
      data: {
        name: `${event.name} (Copy)`,
        description: event.description,
        bannerImage: event.bannerImage,
        category: event.category,
        startDate: newStartDate,
        startTime: event.startTime,
        endDate: newEndDate,
        endTime: event.endTime,
        latitude: event.latitude,
        longitude: event.longitude,
        address: event.address,
        visibility: event.visibility,
        maxAttendees: event.maxAttendees,
        contactDetails: event.contactDetails,
        creatorId: userId,
        status: 'active',
        attendees: {
          create: {
            userId,
            status: 'approved'
          }
        }
      }
    });

    revalidatePath('/map');
    revalidatePath('/creator-dashboard');
    return { success: true, event: duplicatedEvent };
  } catch (error) {
    console.error("Error duplicating event:", error);
    return { success: false, error: 'Failed to duplicate event.' };
  }
}

export async function getEventsForDashboardAction() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const events = await prisma.event.findMany({
      where: { creatorId: userId },
      include: {
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    const now = new Date();

    const upcoming = events.filter(e => e.status === 'active' && new Date(e.startDate) > now);
    const live = events.filter(e => e.status === 'active' && new Date(e.startDate) <= now && new Date(e.endDate) >= now);
    const ended = events.filter(e => e.status === 'ended' || (e.status === 'active' && new Date(e.endDate) < now));
    const draft = events.filter(e => e.status === 'draft');

    return {
      success: true,
      events: { upcoming, live, ended, draft }
    };
  } catch (error) {
    console.error("Error fetching dashboard events:", error);
    return { success: false, error: 'Failed to fetch events.' };
  }
}

export async function keepEventInHistoryAction(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return { success: false, error: 'Event not found.' };
    }

    if (event.creatorId !== userId) {
      return { success: false, error: 'Only the creator can edit this event.' };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'history' }
    });

    revalidatePath('/creator-dashboard');
    return { success: true };
  } catch (error) {
    console.error("Error setting event history status:", error);
    return { success: false, error: 'Failed to update event status.' };
  }
}
