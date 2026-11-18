/** Placeholder block shown while data loads, so layouts do not jump. */
export const Skeleton = ({ h = 16, w = "100%", r = 6, style }) => (
  <span
    className="skeleton"
    aria-hidden="true"
    style={{ display: "block", height: h, width: w, borderRadius: r, ...style }}
  />
);

export const SkeletonRows = ({ rows = 4, h = 44 }) => (
  <div className="stack" role="status" aria-label="Loading" style={{ gap: 10 }}>
    {Array.from({ length: rows }, (_, i) => (
      <Skeleton key={i} h={h} />
    ))}
  </div>
);
