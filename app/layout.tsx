import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";

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
        {/* Header-ul este fixat sus prin clasa 'fixed' din componenta sa */}
        <Header />
        
        {/* Adăugăm pt-20 (padding top) ca să împingem conținutul sub Header-ul fix */}
        <main className="flex-grow pt-20">
          {children}
        </main>
        
        {/* Aici va veni Footer-ul când îl creăm */}
      </body>
    </html>
  );
}