import React, { Suspense } from 'react';
import IntroPage from './components/IntroPage';

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialVariant = resolvedSearchParams?.variant || '1';

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4EEE2]" />}>
      <IntroPage initialVariant={initialVariant} />
    </Suspense>
  );
}

