function pad(n: number) {
  return (n < 10 ? "0" : "") + n;
}

export function countdownText(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diff)) return "";
  if (diff <= 0) return "KICKED OFF";
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (days > 0) return `LOCKS IN ${days}D ${pad(h)}H`;
  return `LOCKS IN ${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function fmtKickoff(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

export function relTime(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.round(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + "h ago";
  return Math.round(h / 24) + "d ago";
}
