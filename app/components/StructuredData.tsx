import { companyInfo } from "@/lib/company";

type StructuredDataProps = {
  siteUrl: string;
};

export default function StructuredData({ siteUrl }: StructuredDataProps) {
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
    inLanguage: "ro-RO",
  };

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Quick Exit",
    serviceType: "platforma de lichiditate rapida pentru active",
    areaServed: "Romania",
    description:
      "Quick Exit conecteaza vanzatori care vor lichiditate rapida cu cumparatori care au capital disponibil.",
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
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
          key={idx}
          type="application/ld+json"
        />
      ))}
    </>
  );
}
