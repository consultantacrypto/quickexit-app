import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer"; 

export const metadata: Metadata = {
  title: "QuickExit | Terminal de Lichiditate Instantă",
  description: "Singura platformă din România care conectează activele premium cu investitori verificați. Evaluează cu AI, aplică discountul de urgență și încasează cash-ul în 24 de ore. Fără agenți, fără timp pierdut.",
  keywords: ["lichiditate", "vânzare rapidă auto", "investiții imobiliare", "cash instant", "licitații active", "evaluare AI"],
  openGraph: {
    title: "QuickExit | Vinde Acum. Banii Azi.",
    description: "Conectăm activele tale direct cu investitori care au cash pregătit. Fără negocieri infinite.",
    type: "website",
    locale: "ro_RO",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="ro">
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