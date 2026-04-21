import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header"; // Aici chemăm Header-ul pe care l-am creat

export const metadata: Metadata = {
  title: "QuickExit - Instant Liquidity",
  description: "Platformă ultra-premium pentru lichiditate rapidă a activelor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#F8F9FA] text-black antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}