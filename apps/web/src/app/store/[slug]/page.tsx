import React from 'react';
import { notFound } from 'next/navigation';
import { getPublicWorldProject } from '@/actions/world';
import StoreClient from './StoreClient';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function PublicStorePage({ params }: PageProps) {
  const project = await getPublicWorldProject(params.slug, 'STORE');

  if (!project) {
    notFound();
  }

  return <StoreClient project={project} />;
}
