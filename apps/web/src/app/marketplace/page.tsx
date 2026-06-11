import { MarketplaceView } from '@/components/MarketplaceView';
import { getListings } from '@/actions/marketplace';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function MarketplacePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/');
  }
  const res = await getListings();
  const dbListings = res.success ? res.listings : [];

  // If no listings in DB, provide some dummy local listings based on the guide's Real Estate focus
  let initialListings = dbListings;

  if (initialListings.length === 0) {
    initialListings = [
      {
        id: 'mock-1',
        title: '1 bhk for sale in kalyan',
        price: 3500000,
        currency: 'INR',
        locationText: 'kalyan',
        category: 'Property',
        condition: 'new',
        images: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80',
        description: 'Premium 1 BHK apartment for sale in Kalyan. Excellent condition, premium fittings.',
        seller: { name: 'lok times' }
      },
      {
        id: 'mock-2',
        title: 'Honda City 2020 Top Model',
        price: 850000,
        currency: 'INR',
        locationText: 'Andheri West, Mumbai',
        category: 'Vehicles',
        condition: 'used',
        images: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=600&q=80',
        description: 'Single owner, well maintained, fully insured.',
        seller: { name: 'Amit Kumar' }
      },
      {
        id: 'mock-3',
        title: 'Premium Office Chair',
        price: 4500,
        currency: 'INR',
        locationText: 'Bandra, Mumbai',
        category: 'Electronics', // Can be furniture but Electronics/Services are current mock categories
        condition: 'new',
        images: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&w=600&q=80',
        description: 'Ergonomic office chair with lumbar support. Brand new in box.',
        seller: { name: 'Priya Desai' }
      }
    ];
  }

  return <MarketplaceView initialListings={initialListings} />;
}
