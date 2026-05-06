import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import CapitalDisponibilClient from "./CapitalDisponibilClient";

export const metadata: Metadata = buildPageMetadata({
  title: "Capital disponibil și cereri active | Quick Exit",
  description:
    "Descoperă cumpărători activi și cereri de cumpărare pentru oportunități reale.",
  path: "/capital-disponibil",
});

export default function CapitalDirectoryPage() {
  return <CapitalDisponibilClient />;
}