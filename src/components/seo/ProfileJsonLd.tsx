interface ProfileJsonLdProps {
  name: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  url?: string;
}

export function ProfileJsonLd({ name, username, avatarUrl, bio, url }: ProfileJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: url || `https://github.gg/${username}`,
    image: avatarUrl,
    description: bio,
    sameAs: [`https://github.com/${username}`],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}
