import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer"; // Importăm componenta nouă

export const metadata: Metadata = {
  title: "QuickExit - Lichiditate Instantă",
  description: "Platformă ultra-premium pentru lichiditate rapidă a activelor prin evaluare AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className="bg-white text-black antialiased min-h-screen flex flex-col">
        <Header />
        
        {/* pt-24 pe mobil, pt-44 pe desktop pentru a lăsa header-ul masiv să respire */}
        <main className="flex-grow pt-24 md:pt-44"> 
          {children}
        </main>

        <Footer /> {/* Acum va afișa componenta detaliată cu Quick Exit LLC și steguletul României */}
      </body>
    </html>
  );
}