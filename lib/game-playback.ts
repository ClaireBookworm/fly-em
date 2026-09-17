/** Frame timestamps can precede effect setup within the first animation frame. */
export function advanceGameTime(
  time: number,
  previous: number,
  now: number,
  duration: number,
  speed: number,
) {
  const current = Number.isFinite(time)
    ? Math.max(0, Math.min(duration, time))
    : 0;
  const elapsed = Number.isFinite(now - previous)
    ? Math.max(0, Math.min(now - previous, 80))
    : 0;
  return Math.max(
    0,
    Math.min(duration, current + elapsed * Math.max(0, speed)),
  );
}

export function gameSampleIndex(
  time: number,
  length: number,
  duration: number,
) {
  if (length <= 1 || duration <= 0 || !Number.isFinite(time)) return 0;
  return Math.max(
    0,
    Math.min(length - 1, Math.floor((time / duration) * (length - 1))),
  );
}
