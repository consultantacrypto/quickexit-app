/**
 * Same notice surface as the listing crypto box: black border, cream fill, existing type scale.
 */

export default function SocialPromoPromise({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <p
      className={`rounded-2xl border-2 border-black bg-[#FFF9E8] px-4 py-3 text-sm font-medium leading-relaxed text-neutral-800 ${className}`}
    >
      {text}
    </p>
  );
}
