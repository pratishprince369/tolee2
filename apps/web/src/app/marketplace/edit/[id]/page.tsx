import { CreateListingForm } from '@/components/CreateListingForm';
import { getListingById } from '@/actions/marketplace';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Edit Listing | Tolee Marketplace',
  description: 'Update your listing on Tolee Marketplace',
};

interface EditListingPageProps {
  params: {
    id: string;
  };
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const res = await getListingById(params.id);
  
  if (!res.success || !res.listing) {
    redirect('/marketplace');
  }

  const userId = (session.user as any).id;
  if (res.listing.sellerId !== userId) {
    redirect('/marketplace');
  }

  return <CreateListingForm initialData={res.listing} isEdit={true} />;
}
