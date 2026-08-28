import { companyInfo } from "@/lib/company";

type StructuredDataProps = {
  siteUrl: string;
  locale?: string;
};

export default function StructuredData({ siteUrl, locale = "ro" }: StructuredDataProps) {
  const inLanguage = locale === "en" ? "en-GB" : "ro-RO";
  const serviceType =
    locale === "en"
      ? "marketplace for vehicles, property and valuable assets"
      : "marketplace pentru automobile, proprietăți și active valoroase";
  const description =
    locale === "en"
      ? "QuickExit is a marketplace for premium vehicles, property and collectible objects, with transparent pricing and direct contact between parties."
      : "QuickExit este un marketplace pentru automobile premium, proprietăți și obiecte de colecție, cu prețuri transparente și contact direct între părți.";

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Quick Exit",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    ...(companyInfo.publicEmail
      ? {
          contactPoint: [
            {
              "@type": "ContactPoint",
              email: companyInfo.publicEmail,
              contactType: "customer support",
              availableLanguage: ["ro", "en"],
            },
          ],
        }
      : {}),
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Quick Exit",
    url: siteUrl,
    inLanguage,
  };

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Quick Exit",
    serviceType,
    areaServed: "Romania",
    description,
    inLanguage,
    provider: {
      "@type": "Organization",
      name: "Quick Exit",
      url: siteUrl,
    },
  };

  const payloads = [organization, website, service];

  return (
    <>
      {payloads.map((payload, idx) => (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
          key={idx}
          type="application/ld+json"
        />
      ))}
    </>
  );
}
