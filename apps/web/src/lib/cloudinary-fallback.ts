import { prisma } from './prisma';

export interface CloudinaryAccount {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  label: string;
}

export function getAllCloudinaryAccounts(): CloudinaryAccount[] {
  // If CLOUDINARY_ACCOUNTS is defined in env, parse it.
  if (process.env.CLOUDINARY_ACCOUNTS) {
    try {
      const parsed = JSON.parse(process.env.CLOUDINARY_ACCOUNTS);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((acc, index) => ({
          cloudName: acc.cloudName || acc.cloud_name,
          apiKey: acc.apiKey || acc.api_key,
          apiSecret: acc.apiSecret || acc.api_secret,
          label: acc.label || `Cloudinary ${index + 1} (${acc.cloudName || acc.cloud_name})`,
        }));
      }
    } catch (e) {
      console.error('Failed to parse CLOUDINARY_ACCOUNTS env var:', e);
    }
  }

  // Fallback to hardcoded list of 9 accounts
  const accounts: CloudinaryAccount[] = [];

  // Account 1 from standard env vars
  const cloud1 = process.env.CLOUDINARY_CLOUD_NAME || '';
  const key1 = process.env.CLOUDINARY_API_KEY || '';
  const secret1 = process.env.CLOUDINARY_API_SECRET || '';

  if (cloud1 && key1 && secret1) {
    accounts.push({
      cloudName: cloud1,
      apiKey: key1,
      apiSecret: secret1,
      label: 'Cloudinary 1st Account (Primary Env)',
    });
  } else {
    accounts.push({
      cloudName: 'dmx8m8hqa', // default placeholder
      apiKey: '',
      apiSecret: '',
      label: 'Cloudinary 1st Account (Missing Env)',
    });
  }

  // Add the 8 accounts provided by the user
  accounts.push(
    {
      cloudName: 'debhuekoz',
      apiKey: '231814757255586',
      apiSecret: 'unK_naiytoJZnDiEBmJz-jXShQA',
      label: 'Cloudinary 2nd Account',
    },
    {
      cloudName: 'dfdudj4iy',
      apiKey: '478638261129383',
      apiSecret: 'cndE4HAlOYc3EKpbv8sVwuUZDms',
      label: 'Cloudinary 3rd Account',
    },
    {
      cloudName: 'dsgcbajpc',
      apiKey: '139535728863313',
      apiSecret: 'dgNCpLVHBERw7gW0N-4giaI9Hz4',
      label: 'Cloudinary 4th Account',
    },
    {
      cloudName: 'dpksbx9oo',
      apiKey: '954829219351977',
      apiSecret: 'p-K2PZll72xuHIykupAvKpN26m0',
      label: 'Cloudinary 5th Account',
    },
    {
      cloudName: 'dmbi4erbe',
      apiKey: '914889476383652',
      apiSecret: 'nZtptSryJk1w4-kJNKOit_uoHmY',
      label: 'Cloudinary 6th Account',
    },
    {
      cloudName: 'dpcidympa',
      apiKey: '731718115889197',
      apiSecret: 'juH0iaFHk8nxAt-nzzLU8PxiG6Q',
      label: 'Cloudinary 7th Account',
    },
    {
      cloudName: 'dzwrrknfh',
      apiKey: '662854964811592',
      apiSecret: 'REOy7etdA0jVrFSEymSCgOWNev4',
      label: 'Cloudinary 8th Account',
    },
    {
      cloudName: 'dbwgifa3k',
      apiKey: '675627659165633',
      apiSecret: 'ZsLDPx-w3TTeNgOaOqcMfH-H2Ps',
      label: 'Cloudinary 9th Account',
    }
  );

  return accounts;
}

export async function getActiveCloudinaryAccount(): Promise<{ account: CloudinaryAccount; index: number }> {
  const accounts = getAllCloudinaryAccounts();
  
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'global' },
      select: { activeCloudinaryIndex: true },
    });
    
    let index = settings?.activeCloudinaryIndex ?? 0;
    if (index < 0 || index >= accounts.length) {
      index = 0;
    }
    
    // Check if the account at index is valid (has cloudName/apiKey/apiSecret)
    // If we have a placeholder with empty key/secret, skip it to next valid
    if (!accounts[index].apiKey || !accounts[index].apiSecret) {
      const firstValidIdx = accounts.findIndex(a => a.apiKey && a.apiSecret);
      if (firstValidIdx !== -1) {
        index = firstValidIdx;
      }
    }

    return { account: accounts[index], index };
  } catch (error) {
    console.error('Error fetching active Cloudinary index:', error);
    const firstValidIdx = accounts.findIndex(a => a.apiKey && a.apiSecret);
    const index = firstValidIdx !== -1 ? firstValidIdx : 0;
    return { account: accounts[index], index };
  }
}

export async function rotateToNextCloudinaryAccount(currentIndex: number): Promise<{ success: boolean; newIndex: number }> {
  const accounts = getAllCloudinaryAccounts();
  const nextIndex = (currentIndex + 1) % accounts.length;

  try {
    await prisma.siteSettings.upsert({
      where: { id: 'global' },
      create: { id: 'global', activeCloudinaryIndex: nextIndex },
      update: { activeCloudinaryIndex: nextIndex },
    });
    console.log(`[CLOUDINARY FALLBACK] Rotated Cloudinary account from index ${currentIndex} to ${nextIndex} (${accounts[nextIndex].cloudName})`);
    return { success: true, newIndex: nextIndex };
  } catch (error) {
    console.error('Failed to rotate Cloudinary index in database:', error);
    return { success: false, newIndex: nextIndex };
  }
}
