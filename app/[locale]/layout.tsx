import type { Metadata } from "next";
import Script from "next/script";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StructuredData from "../components/StructuredData";
import AnalyticsAttributionInit from "../components/AnalyticsAttributionInit";
import AuthHashCleaner from "../components/AuthHashCleaner";
import { getSiteUrl } from "@/lib/siteUrl";
import { routing } from "@/src/i18n/routing";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL("https://www.quickexit.ro"),
  title: {
    default: "Quick Exit | Platforma de lichiditate rapida pentru active",
    template: "%s | Quick Exit",
  },
  description:
    "Quick Exit este platforma din Romania pentru vanzare rapida de active. Conectam vanzatori care vor lichiditate cu investitori care au capital disponibil.",
  keywords: [
    "lichiditate rapida",
    "vanzare rapida active",
    "platforma investitori Romania",
    "capital disponibil",
    "anunturi active",
    "evaluare active",
  ],
  alternates: {
    canonical: `${siteUrl}/ro`,
  },
  openGraph: {
    title: "Quick Exit | Vinde acum. Lichiditate rapida.",
    description:
      "Platforma pentru vanzatori care vor sa vanda rapid si cumparatori care au capital disponibil.",
    url: siteUrl,
    siteName: "Quick Exit",
    type: "website",
    locale: "ro_RO",
    images: [{ url: "/logo.png" }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  const GA_FALLBACK_ID = "G-8LLK172SCX";
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || GA_FALLBACK_ID;

  return (
    <html lang={locale}>
      <head>
        <link
          rel="preconnect"
          href="https://geywuzwbzecknokvnins.supabase.co"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://geywuzwbzecknokvnins.supabase.co"
        />
        <link
          rel="preload"
          as="image"
          href="/logo.webp"
          type="image/webp"
          fetchPriority="high"
        />
      </head>
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}
      <body className="bg-white text-black antialiased min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AnalyticsAttributionInit />
          <AuthHashCleaner />
          <StructuredData siteUrl={siteUrl} />
          <Header />

          <main className="flex-grow pt-24 md:pt-44">{children}</main>

          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
