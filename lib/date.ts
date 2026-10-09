export function easternDate(value: string, language = "en") {
  return new Intl.DateTimeFormat(language === "zh-Hans" ? "zh-CN" : "en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}