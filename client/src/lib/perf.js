/** True on devices where the animated background should be lighter: data saver, little memory or CPU, or a small screen. */
export function isLowPower(
  nav = typeof navigator !== "undefined" ? navigator : {},
  width = typeof window !== "undefined" ? window.innerWidth : 1280,
) {
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) return true;
  return width < 700;
}
