import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title: string
  description: string
  keywords?: string
  canonical?: string
  ogType?: 'website' | 'article'
  structuredData?: object
}

export default function SEO({
  title,
  description,
  keywords,
  canonical,
  ogType = 'website',
  structuredData,
}: SEOProps) {
  const siteTitle = 'Bitcoin Mining Calculators'
  const fullTitle = `${title} | ${siteTitle}`
  const siteUrl = 'https://webapp-calculators.example.com' // Update with actual URL
  const defaultImage = `${siteUrl}/og-image.png`

  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonical && <link rel="canonical" href={`${siteUrl}${canonical}`} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {canonical && <meta property="og:url" content={`${siteUrl}${canonical}`} />}
      <meta property="og:image" content={defaultImage} />
      <meta property="og:site_name" content={siteTitle} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={defaultImage} />

      {/* Additional meta tags */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content="Bitcoin Mining Calculators" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  )
}
