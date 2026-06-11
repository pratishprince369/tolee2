import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserOwnedTolees } from '@/actions/tolee';
import { MyToleesClient } from './MyToleesClient';

export const metadata = {
  title: 'My Tolees | Manage Your Communities',
  description: 'Manage the Tolee groups and communities you have created.',
};

export default async function MyToleesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const result = await getUserOwnedTolees();
  const tolees = result.success && result.tolees ? result.tolees : [];

  return (
    <MyToleesClient initialTolees={tolees} />
  );
}
