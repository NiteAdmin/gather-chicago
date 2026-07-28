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

export default function CityPage({ params }: Props) {
  return <SurveyForm params={params} />;
}
