interface RepoJsonLdProps {
  name: string;
  owner: string;
  description?: string;
  url?: string;
  programmingLanguage?: string;
  stars?: number;
}

export function RepoJsonLd({ name, owner, description, url, programmingLanguage, stars }: RepoJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name,
    description,
    url: url || `https://github.gg/${owner}/${name}`,
    codeRepository: `https://github.com/${owner}/${name}`,
    ...(programmingLanguage && { programmingLanguage }),
    ...(stars !== undefined && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Math.min(stars / 1000, 5).toFixed(1),
        bestRating: '5',
        ratingCount: stars,
      }
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
