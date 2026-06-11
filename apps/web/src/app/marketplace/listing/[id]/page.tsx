import { ListingDetailView } from '@/components/ListingDetailView';
import { getListingById } from '@/actions/marketplace';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface ListingDetailPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const res = await getListingById(params.id);
  if (res.success && res.listing) {
    return {
      title: `${res.listing.title} | Tolee Marketplace`,
      description: res.listing.description,
    };
  }
  return {
    title: 'Listing | Tolee Marketplace',
  };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? (session.user as any).id : undefined;

  const res = await getListingById(params.id);
  
  if (!res.success || !res.listing) {
    redirect('/marketplace');
  }

  return (
    <ListingDetailView 
      listing={res.listing} 
      currentUserId={currentUserId}
    />
  );
}
