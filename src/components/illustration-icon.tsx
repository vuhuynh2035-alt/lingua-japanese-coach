import { useId } from "react";

export type IllustrationName =
  | "business" | "travel" | "technology" | "healthcare" | "finance" | "everyday" | "refrigeration"
  | "home" | "practice" | "profiles" | "courses" | "library" | "grammar" | "progress"
  | "timer" | "sessions" | "level" | "streak" | "key" | "sparkles" | "books" | "pdf" | "text" | "audio"
  | "microphone" | "stop" | "speaker" | "compass" | "back" | "settings" | "teacher";

const colors: Record<IllustrationName, [string, string, string]> = {
  business: ["#398de6", "#2252b8", "#bde5ff"],
  travel: ["#ffad4d", "#eb673f", "#fff0b4"],
  technology: ["#8f7bff", "#4e49cb", "#d8d4ff"],
  healthcare: ["#48d4ac", "#168e85", "#c9fff0"],
  finance: ["#ff77a8", "#d44379", "#ffe0ed"],
  everyday: ["#ffc85b", "#e68135", "#fff2be"],
  refrigeration: ["#69d5f5", "#3984e8", "#d6f8ff"],
  home: ["#57d2a5", "#188f71", "#d5fff0"],
  practice: ["#53cdb6", "#248bcb", "#d5fff4"],
  profiles: ["#9a83f6", "#6253c4", "#e9e0ff"],
  courses: ["#53c8a2", "#208c7d", "#dcfff1"],
  library: ["#ffb45c", "#e88145", "#fff0cd"],
  grammar: ["#71a9ff", "#5571de", "#dce7ff"],
  progress: ["#51d1a1", "#2586be", "#d8fff0"],
  timer: ["#6d9cf3", "#6052c7", "#e0eaff"],
  sessions: ["#ffad6b", "#dc6e56", "#ffead2"],
  level: ["#65d6b1", "#258b7e", "#d7fff0"],
  streak: ["#ffb05b", "#f26c48", "#fff1ad"],
  key: ["#ffd36b", "#f09c3c", "#fff3c0"],
  sparkles: ["#ffcf63", "#e99c49", "#fff3bf"],
  books: ["#60d4ae", "#238c83", "#d6fff0"],
  pdf: ["#ff8a83", "#e45366", "#ffe0da"],
  text: ["#7ab9ff", "#5472d7", "#e0ecff"],
  audio: ["#bd8cff", "#7452d1", "#efe2ff"],
  microphone: ["#fc829d", "#cf467a", "#ffe0e8"],
  stop: ["#ff8a83", "#d94c5c", "#ffe0da"],
  speaker: ["#63baff", "#596bda", "#e0ecff"],
  compass: ["#ffd16b", "#e58b43", "#fff2bf"],
  back: ["#68d7ac", "#20866e", "#d9fff0"],
  settings: ["#79c6ff", "#5079dc", "#e0f2ff"],
  teacher: ["#ffb47e", "#ef7288", "#fff0d8"],
};

function Illustration({ name, gradientId }: { name: IllustrationName; gradientId: string }) {
  const main = `url(#${gradientId}-main)`;
  const shineFill = `url(#${gradientId}-shine)`;
  switch (name) {
    case "business":
      return <><rect x="12" y="23" width="40" height="28" rx="6" fill={main} /><path d="M23 23v-5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v5" fill="none" stroke={main} strokeWidth="5" /><path d="M12 32h40M27 32v5h10v-5" fill="none" stroke="#e9fff8" strokeWidth="2.5" strokeLinecap="round" /><path d="M17 27h30" stroke="#fff" strokeOpacity=".38" strokeWidth="2" strokeLinecap="round" /></>;
    case "travel":
      return <><path d="M23 17v-5h18v5" fill="none" stroke={main} strokeWidth="4" strokeLinecap="round" /><rect x="17" y="17" width="30" height="36" rx="7" fill={main} /><rect x="21" y="21" width="22" height="27" rx="4" fill="#fff" fillOpacity=".22" /><path d="M24 25v18M38 25v18" stroke="#fff" strokeOpacity=".7" strokeWidth="2.5" strokeLinecap="round" /><circle cx="25" cy="55" r="3" fill="#445baf" /><circle cx="39" cy="55" r="3" fill="#445baf" /><path d="M23 20h13" stroke="#fff" strokeOpacity=".75" strokeWidth="2" strokeLinecap="round" /></>;
    case "technology":
      return <><rect x="13" y="12" width="38" height="30" rx="5" fill={main} /><rect x="17" y="16" width="30" height="22" rx="2" fill="#202d68" /><path d="m25 23-4 4 4 4m12-8 4 4-4 4m-5-9-3 10" fill="none" stroke={shineFill} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 44h46l-5 7H14z" fill={main} /><path d="M17 46h30" stroke="#fff" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" /></>;
    case "healthcare":
      return <><path d="M19 15v13a8 8 0 0 0 16 0V15" fill="none" stroke={main} strokeWidth="5" strokeLinecap="round" /><path d="M15 14v5m8-5v5m8-5v5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><path d="M35 28v6a9 9 0 0 0 18 0v-3" fill="none" stroke={main} strokeWidth="4" strokeLinecap="round" /><circle cx="53" cy="28" r="5" fill={main} /><circle cx="53" cy="28" r="2" fill="#fff" /><circle cx="35" cy="15" r="3" fill="#fff" /><path d="M44 12v9m-4.5-4.5h9" stroke="#ff6c83" strokeWidth="3" strokeLinecap="round" /></>;
    case "finance":
      return <><rect x="12" y="14" width="40" height="38" rx="8" fill={main} /><path d="M19 43V34h6v9m6 0V28h6v15m6 0V22h6v21" fill="#fff" fillOpacity=".78" /><path d="m19 29 9-7 7 3 12-10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M42 15h5v5" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "everyday":
      return <><path d="M18 24h25v22a7 7 0 0 1-7 7h-11a7 7 0 0 1-7-7z" fill={main} /><path d="M43 29h4a6 6 0 0 1 0 12h-4" fill="none" stroke={main} strokeWidth="4" /><path d="M24 18c-3-3 3-4 0-8m10 8c-3-3 3-4 0-8" fill="none" stroke="#c07145" strokeWidth="2.5" strokeLinecap="round" /><path d="M22 28h15" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" /><ellipse cx="31" cy="49" rx="8" ry="2.5" fill="#fff" fillOpacity=".23" /></>;
    case "refrigeration":
      return <><circle cx="32" cy="32" r="21" fill={main} /><g stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M32 15v34M17 23.5l30 17M17 40.5l30-17M32 15l-4 5m4-5 4 5m-4 29-4-5m4 5 4-5M17 23.5l6 1m-6-1 2 6m29 11-6-1m6 1-2-6m-29 6 6-1m-6 1 2-6m29-11-6 1m6-1-2 6" /></g><circle cx="26" cy="23" r="3" fill="#fff" fillOpacity=".45" /></>;
    case "home":
      return <><path d="m12 29 20-17 20 17v21a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill={main} /><path d="M26 54V37h12v17" fill="#fff" fillOpacity=".82" /><path d="m9 29 23-20 23 20" fill="none" stroke={main} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><path d="M19 31h9" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" /></>;
    case "practice":
      return <><path d="M12 16a6 6 0 0 1 6-6h28a6 6 0 0 1 6 6v23a6 6 0 0 1-6 6H30L18 54v-9a6 6 0 0 1-6-6z" fill={main} /><path d="M23 27v4a9 9 0 0 0 18 0v-4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" /><rect x="27" y="15" width="10" height="19" rx="5" fill="#fff" fillOpacity=".9" /><path d="M32 41v6m-6 0h12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /></>;
    case "profiles":
    case "courses":
    case "books":
      return <><path d="M11 17a5 5 0 0 1 5-5h15v39H16a5 5 0 0 0-5 5zm42 0a5 5 0 0 0-5-5H33v39h15a5 5 0 0 1 5 5z" fill={main} /><path d="M17 21h8m-8 7h8m15-7h8m-8 7h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><path d="M32 15v35" stroke="#fff" strokeOpacity=".8" strokeWidth="2" /><path d="m44 9 2 4 4 1-4 2-2 4-2-4-4-2 4-1z" fill={shineFill} /></>;
    case "library":
      return <><rect x="13" y="13" width="38" height="40" rx="6" fill={main} /><path d="M20 20h24v27H20z" fill="#fff" fillOpacity=".85" /><path d="M25 26h14m-14 6h14m-14 6h9" stroke={main} strokeWidth="2.5" strokeLinecap="round" /><path d="M17 17h8" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" /></>;
    case "grammar":
      return <><path d="M12 15a5 5 0 0 1 5-5h15v41H17a5 5 0 0 0-5 5zm40 0a5 5 0 0 0-5-5H33v41h14a5 5 0 0 1 5 5z" fill={main} /><path d="M21 24h7m-7 7h7m-7 7h7m12-14h7m-7 7h7m-7 7h7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /><path d="M32 13v38" stroke="#fff" strokeOpacity=".8" strokeWidth="2" /></>;
    case "progress":
      return <><rect x="12" y="13" width="40" height="40" rx="8" fill={main} /><path d="M20 43V34h6v9m6 0V27h6v16m6 0V20h6v23" fill="#fff" fillOpacity=".8" /><path d="m20 28 9-7 7 3 10-9m-5 0h5v5" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "timer":
      return <><circle cx="32" cy="34" r="21" fill={main} /><path d="M27 10h10m-5 0v4m15 3 3-3" stroke={main} strokeWidth="4" strokeLinecap="round" /><path d="M32 22v13l9 5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="26" cy="25" r="2" fill="#fff" fillOpacity=".65" /></>;
    case "sessions":
      return <><circle cx="24" cy="24" r="9" fill={main} /><circle cx="43" cy="26" r="7" fill={shineFill} /><path d="M8 52a16 16 0 0 1 32 0zm29-10a13 13 0 0 1 19 10H42" fill={main} /><path d="M17 45c4-7 13-9 20-4" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" /></>;
    case "level":
      return <><circle cx="32" cy="27" r="18" fill={main} /><path d="m21 41-3 15 14-7 14 7-3-15" fill={main} /><path d="m32 16 3.5 7 7.5 1-5.5 5.5 1.3 7.5-6.8-3.6-6.8 3.6 1.3-7.5L21 24l7.5-1z" fill="#fff" /><circle cx="26" cy="19" r="3" fill="#fff" fillOpacity=".35" /></>;
    case "streak":
      return <><path d="M34 8c3 12-8 13-4 22 3-2 6-6 6-10 11 8 15 17 10 26a16 16 0 0 1-29-7c0-8 6-14 10-20 1 8 5 10 7 11 5-7 5-14 0-22z" fill={main} /><path d="M31 37c-1 4-6 7-5 12a7 7 0 0 0 14 0c0-4-3-7-6-10-.2 3-1 4-3 5 1-3 1-5 0-7z" fill={shineFill} /></>;
    case "key":
      return <><circle cx="23" cy="28" r="13" fill={main} /><circle cx="23" cy="28" r="5" fill="#fff" fillOpacity=".8" /><path d="m33 35 17 17 6-6-5-5 4-4-6-6-4 4-5-5" fill={main} /><path d="m40 37 7 7m-22-22 4 4" stroke="#fff" strokeOpacity=".7" strokeWidth="2.5" strokeLinecap="round" /></>;
    case "sparkles":
      return <><path d="m31 9 5 14 14 5-14 5-5 14-5-14-14-5 14-5z" fill={main} /><path d="m49 39 2.5 6.5L58 48l-6.5 2.5L49 57l-2.5-6.5L40 48l6.5-2.5z" fill={shineFill} /><circle cx="16" cy="15" r="3" fill={main} /></>;
    case "pdf":
      return <><path d="M18 9h20l10 10v34a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V13a4 4 0 0 1 4-4z" fill={main} /><path d="M38 9v12h12" fill="#fff" fillOpacity=".55" /><path d="M21 36h6a4 4 0 0 0 0-8h-6v15m13 0V28h4a7 7 0 0 1 0 15h-4m12-15h8m-8 7h7" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "text":
      return <><path d="M18 9h20l10 10v34a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V13a4 4 0 0 1 4-4z" fill={main} /><path d="M38 9v12h12" fill="#fff" fillOpacity=".55" /><path d="M22 29h20m-20 7h20m-20 7h14m-14 7h17" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /></>;
    case "audio":
      return <><circle cx="32" cy="32" r="22" fill={main} /><path d="M18 30v5m7-11v17m7-23v29m7-23v17m7-12v5" stroke="#fff" strokeWidth="3" strokeLinecap="round" /><circle cx="23" cy="24" r="2" fill="#fff" fillOpacity=".6" /></>;
    case "microphone":
      return <><rect x="23" y="10" width="18" height="31" rx="9" fill={main} /><path d="M17 30v3a15 15 0 0 0 30 0v-3M32 48v7m-8 0h16" fill="none" stroke={main} strokeWidth="4" strokeLinecap="round" /><path d="M29 16v15" stroke="#fff" strokeOpacity=".75" strokeWidth="2.5" strokeLinecap="round" /></>;
    case "stop":
      return <><rect x="12" y="12" width="40" height="40" rx="12" fill={main} /><rect x="23" y="23" width="18" height="18" rx="4" fill="#fff" /><path d="M17 19h12" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" /></>;
    case "speaker":
      return <><path d="M12 25h10l15-12v38L22 39H12z" fill={main} /><path d="M44 24a12 12 0 0 1 0 16m4-23a21 21 0 0 1 0 30" fill="none" stroke={main} strokeWidth="4" strokeLinecap="round" /><path d="M16 28h6l9-7v23l-9-7h-6z" fill="#fff" fillOpacity=".28" /></>;
    case "compass":
      return <><circle cx="32" cy="32" r="22" fill={main} /><circle cx="32" cy="32" r="16" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2" /><path d="m39 23-5 13-10 5 5-13z" fill="#fff" /><circle cx="32" cy="32" r="3" fill={shineFill} /></>;
    case "back":
      return <><circle cx="32" cy="32" r="24" fill={main} /><path d="M35 20 23 32l12 12M24 32h19" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><path d="M27 17h9" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" /></>;
    case "settings":
      return <><path d="m27 9 10 0 2 7 5 3 7-2 5 9-5 5v6l5 5-5 9-7-2-5 3-2 7H27l-2-7-5-3-7 2-5-9 5-5v-6l-5-5 5-9 7 2 5-3z" fill={main} transform="translate(0 -3) scale(.94)" /><circle cx="32" cy="31" r="9" fill="#fff" fillOpacity=".9" /><circle cx="32" cy="31" r="4" fill={main} /></>;
    case "teacher":
      return <><path d="M13 55c1-13 8-20 19-20s18 7 19 20z" fill={main} /><path d="M19 22a13 13 0 0 1 26 0v8a13 13 0 0 1-26 0z" fill="#ffd8b8" /><path d="M17 24c-1-12 7-19 16-19 9 0 16 7 14 19l-5-6-7-7c-4 6-10 9-18 9z" fill={main} /><path d="M25 27h3m8 0h3" stroke="#533d54" strokeWidth="2.4" strokeLinecap="round" /><path d="M28 34c2 2 6 2 8 0" fill="none" stroke="#df6c78" strokeWidth="2" strokeLinecap="round" /><circle cx="23" cy="32" r="3" fill="#f39c9c" fillOpacity=".65" /><circle cx="41" cy="32" r="3" fill="#f39c9c" fillOpacity=".65" /><path d="M27 39v9l5 5 5-5v-9" fill="#fff" fillOpacity=".87" /><path d="M31 47h2" stroke={main} strokeWidth="2" /></>;
  }
}

export function IllustrationIcon({
  name,
  className,
}: {
  name: IllustrationName;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [start, end, shine] = colors[name];
  return (
    <svg className={`illustration-icon${className ? ` ${className}` : ""}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-main`} x1="14" y1="10" x2="50" y2="55" gradientUnits="userSpaceOnUse">
          <stop stopColor={start} />
          <stop offset="1" stopColor={end} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="18" y1="12" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor={shine} />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="19" ry="3" fill={end} fillOpacity=".12" />
      <g style={{ filter: `drop-shadow(0 2px 2px ${end}55)` }}>
        <Illustration name={name} gradientId={id} />
      </g>
    </svg>
  );
}
