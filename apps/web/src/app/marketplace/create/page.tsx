import { CreateListingForm } from '@/components/CreateListingForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Listing | Tolee Marketplace',
  description: 'Create a new listing to sell, rent, or promote on Tolee Marketplace',
};

export default function CreateListingPage() {
  return <CreateListingForm />;
}
