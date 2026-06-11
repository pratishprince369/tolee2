'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { verifySuperAdminToken } from '@/lib/superAdminAuth';
import { cookies, headers } from 'next/headers';

export async function submitContactQuery(data: {
  name: string;
  number: string;
  emailId: string;
  optionType: string;
  message: string;
}) {
  try {
    if (!data.name || !data.number || !data.emailId || !data.optionType) {
      return { success: false, error: 'All fields are required.' };
    }

    const query = await prisma.contactQuery.create({
      data: {
        name: data.name.trim(),
        number: data.number.trim(),
        emailId: data.emailId.trim(),
        optionType: data.optionType,
        message: data.message ? data.message.trim() : '',
      },
    });

    return { success: true, data: query };
  } catch (error) {
    console.error('Error submitting contact query:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function getContactQueries() {
  try {
    // Check if Super Admin session exists
    const session = await getServerSession(authOptions);
    let isAuthorized = session?.user && (session.user as any).isSuperAdmin;

    if (!isAuthorized) {
      // Check for super-admin-token cookie
      const cookieStore = cookies();
      const adminCookie = cookieStore.get('sa_token')?.value;
      if (adminCookie) {
        const decoded = verifySuperAdminToken(adminCookie);
        if (decoded) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized', data: [] };
    }

    const queries = await prisma.contactQuery.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    return { success: true, data: queries };
  } catch (error) {
    console.error('Error fetching contact queries:', error);
    return { success: false, error: 'Internal server error', data: [] };
  }
}

export async function deleteContactQuery(id: string) {
  try {
    // Check if Super Admin session exists
    const session = await getServerSession(authOptions);
    let isAuthorized = session?.user && (session.user as any).isSuperAdmin;

    if (!isAuthorized) {
      // Check for super-admin-token cookie
      const cookieStore = cookies();
      const adminCookie = cookieStore.get('sa_token')?.value;
      if (adminCookie) {
        const decoded = verifySuperAdminToken(adminCookie);
        if (decoded) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.contactQuery.delete({
      where: { id },
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting contact query:', error);
    return { success: false, error: 'Internal server error' };
  }
}

