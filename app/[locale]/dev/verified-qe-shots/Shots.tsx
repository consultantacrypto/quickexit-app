"use client";

import AdCard from "@/app/components/AdCard";
import VerifiedQeBadge from "@/app/components/VerifiedQeBadge";
import VerifiedQeAdminClient from "@/app/[locale]/hq-admin/verificare/VerifiedQeAdminClient";

const IMAGE = "/logo.webp";

export default function VerifiedQeShots() {
  return (
    <div className="bg-white px-4 py-8 font-sans text-black md:px-8">
      <div className="mx-auto grid max-w-5xl gap-10">
        <div data-shot="card-verified" className="max-w-md">
          <AdCard
            id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
            title="BMW X5, acte și poze reale"
            image={IMAGE}
            marketPrice="42.000 €"
            exitPrice="36.500 €"
            discount="13"
            type="standard"
            location="București"
            verifiedQe
          />
        </div>
        <div data-shot="card-plain" className="max-w-md">
          <AdCard
            id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2"
            title="Apartament de verificat"
            image={IMAGE}
            marketPrice="180.000 €"
            exitPrice="165.000 €"
            discount="8"
            type="urgent"
            location="Cluj-Napoca"
          />
        </div>
        <article data-shot="listing-badge" className="max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-black/70 bg-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
              Auto & Moto
            </span>
          </div>
          <VerifiedQeBadge />
          <h1 className="text-3xl font-black uppercase italic leading-tight tracking-tight md:text-5xl">
            BMW X5, acte și poze reale
          </h1>
          <p className="text-sm font-medium text-neutral-700">
            Pagină de anunț, date locale. Tooltip-ul se deschide la tap.
          </p>
        </article>
        <div data-shot="admin-checks">
          <VerifiedQeAdminClient
            fixtureListings={[
              {
                id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
                title: "BMW X5, acte și poze reale",
                status: "active",
                verified_qe: false,
                verified_docs: true,
                verified_vin: true,
                verified_photos: true,
                verified_at: null,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
