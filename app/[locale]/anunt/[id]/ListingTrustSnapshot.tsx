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
  if (compact) {
    return (
      <div className="mt-3 border-t border-black/10 pt-3 text-left">
        <p className="text-sm font-bold text-black">
          {sellerName}
          <span className="mx-1.5 text-neutral-300" aria-hidden>
            ·
          </span>
          <span className="font-semibold text-neutral-600">{statusValue}</span>
        </p>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-neutral-600">
          {contactHint}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-black/10 pt-3 text-left">
      <p className="text-sm font-bold text-black">{sellerName}</p>
      <p className="mt-0.5 text-xs font-semibold text-neutral-600">{statusValue}</p>
      <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-neutral-600">
        {contactHint}
      </p>
    </div>
  );
}
