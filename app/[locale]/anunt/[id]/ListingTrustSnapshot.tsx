type ListingTrustSnapshotProps = {
  sellerName: string;
  statusValue: string;
  contactHint: string;
  compact?: boolean;
};

export default function ListingTrustSnapshot({
  sellerName,
  statusValue,
  contactHint,
  compact = false,
}: ListingTrustSnapshotProps) {
  return (
    <div className={`border-t border-black/10 text-left ${compact ? "mt-3 pt-3" : "mt-3.5 pt-3.5"}`}>
      <p className="text-sm font-bold leading-snug text-black">{sellerName}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-neutral-600">{statusValue}</p>
      <p className="mt-1 text-[11px] font-medium leading-relaxed text-neutral-500">
        {contactHint}
      </p>
    </div>
  );
}
