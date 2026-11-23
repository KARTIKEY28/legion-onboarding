import { useMemo } from "react";
import { portraitDataUri } from "@/clinicians/portrait";

/**
 * An illustrated, synthetic clinician portrait. Generated locally from the id,
 * never a photo of a real person and never fetched from the web.
 */
export function Portrait({ id, name, size = 56 }: { id: string; name: string; size?: number }) {
  const src = useMemo(() => portraitDataUri(id), [id]);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a local data-URI SVG, not a remote image
    <img
      src={src}
      alt={`Illustrated portrait of ${name}`}
      width={size}
      height={size}
      className="shrink-0 rounded-full border border-line bg-surface"
      style={{ width: size, height: size }}
    />
  );
}
