import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer"; 
import StructuredData from "./components/StructuredData";
import AnalyticsAttributionInit from "./components/AnalyticsAttributionInit";
import AuthHashCleaner from "./components/AuthHashCleaner";
import { getSiteUrl } from "@/lib/siteUrl";

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
    canonical: "/",
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
  twitter: {
    card: "summary",
    title: "Quick Exit | Platforma de lichiditate rapida",
    description:
      "Conectam activele premium cu investitori pregatiti pentru achizitii rapide.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const GA_FALLBACK_ID = "G-8LLK172SCX";
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || GA_FALLBACK_ID;

  return (
    <html lang="ro">
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
        <AnalyticsAttributionInit />
        <AuthHashCleaner />
        <StructuredData siteUrl={siteUrl} />
        <Header />
        
        {/* pt-24 pe mobil, pt-44 pe desktop pentru a lăsa header-ul masiv să respire */}
        <main className="flex-grow pt-24 md:pt-44"> 
          {children}
        </main>

        <Footer /> 
      </body>
    </html>
  );
}