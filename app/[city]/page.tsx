import type { Metadata } from 'next';
import SurveyForm from './SurveyForm';

type Props = {
  params: Promise<{ city: string }>;
};

function formatCityName(slug: string): string {
  if (!slug) return 'Chicago';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const rawCity = resolvedParams?.city || 'chicago';
  const cityName = formatCityName(rawCity);
  return {
    title: `Actually · ${cityName} | Event Availability & Preferences`,
  };
}

import { notFound } from 'next/navigation';

export default async function CityPage({ params }: Props) {
  const resolvedParams = await params;
  const rawCity = resolvedParams?.city?.toLowerCase() || '';

  if (rawCity === 'robots.txt' || rawCity === 'favicon.ico' || rawCity === 'sitemap.xml') {
    notFound();
  }

  return <SurveyForm params={params} />;
}
