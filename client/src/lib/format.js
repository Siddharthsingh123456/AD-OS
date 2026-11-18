/** "just now", "5m ago", "3h ago", "2d ago". */
export const ago = (date, now = Date.now()) => {
  const mins = Math.floor((now - new Date(date)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};
