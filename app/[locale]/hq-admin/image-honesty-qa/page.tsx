import ImageHonestyQaClient from "./ImageHonestyQaClient";

/**
 * Staging Image Honesty QA — authorization enforced by hq-admin/layout.tsx.
 * Mutations are Staging-plane locked inside server actions (no Production writes).
 */
export default function ImageHonestyQaPage() {
  return <ImageHonestyQaClient />;
}
