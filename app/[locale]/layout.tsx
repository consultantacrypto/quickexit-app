import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StructuredData from "../components/StructuredData";
import AuthHashCleaner from "../components/AuthHashCleaner";
import { ConsentProvider } from "../components/ConsentProvider";
import ConsentBanner from "../components/ConsentBanner";
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
      <body className="bg-white text-black antialiased min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ConsentProvider>
            <AuthHashCleaner />
            <StructuredData siteUrl={siteUrl} />
            <Header />

            <main className="flex-grow pt-16 md:pt-32">{children}</main>

            <Footer />
            <ConsentBanner />
          </ConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
