import React from 'react';
import { notFound } from 'next/navigation';
import { getPublicWorldProject } from '@/actions/world';
import RestaurantClient from './RestaurantClient';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function PublicRestaurantPage({ params }: PageProps) {
  const project = await getPublicWorldProject(params.slug, 'RESTAURANT');

  if (!project) {
    notFound();
  }

  return <RestaurantClient project={project} />;
}
