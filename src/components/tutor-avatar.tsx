"use client";

import { useEffect, useId, useRef } from "react";
import { realMouthLevel } from "@/lib/lipsync";

export type AvatarKind = "woman" | "man" | "mascot";
export type AvatarEmotion = "neutral" | "happy" | "cheer" | "thinking" | "surprised";
export type AvatarStatus = "idle" | "thinking" | "speaking" | "listening";

type Props = {
  kind: AvatarKind;
  status?: AvatarStatus;
  emotion?: AvatarEmotion;
  size?: number;
  /** Eyes and head follow the pointer. Turn off for small icons. */
  interactive?: boolean;
  className?: string;
};

const SKIN = ["#ffe6d4", "#f6c2a2", "#d9967a"];

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`${id}-skin`} cx="38%" cy="30%" r="80%">
        <stop offset="0" stopColor={SKIN[0]} />
        <stop offset="0.55" stopColor={SKIN[1]} />
        <stop offset="1" stopColor={SKIN[2]} />
      </radialGradient>
      <radialGradient id={`${id}-eye`} cx="40%" cy="35%" r="75%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#e3e8ee" />
      </radialGradient>
      <radialGradient id={`${id}-iris`} cx="40%" cy="35%" r="70%">
        <stop offset="0" stopColor="#8a5a34" />
        <stop offset="1" stopColor="#2e1a0d" />
      </radialGradient>
      <linearGradient id={`${id}-hairW`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6b4129" />
        <stop offset="1" stopColor="#2a160b" />
      </linearGradient>
      <linearGradient id={`${id}-hairM`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4b4f5a" />
        <stop offset="1" stopColor="#15171c" />
      </linearGradient>
      <linearGradient id={`${id}-suitW`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2cb5a5" />
        <stop offset="1" stopColor="#0b5d57" />
      </linearGradient>
      <linearGradient id={`${id}-suitM`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4f7bd6" />
        <stop offset="1" stopColor="#18327a" />
      </linearGradient>
      <radialGradient id={`${id}-owliris`} cx="45%" cy="40%" r="65%">
        <stop offset="0" stopColor="#ffd25a" />
        <stop offset="0.7" stopColor="#f59e0b" />
        <stop offset="1" stopColor="#a8560f" />
      </radialGradient>
      <radialGradient id={`${id}-owl`} cx="40%" cy="28%" r="85%">
        <stop offset="0" stopColor="#ffcf7a" />
        <stop offset="0.55" stopColor="#ea9530" />
        <stop offset="1" stopColor="#a8561a" />
      </radialGradient>
      <radialGradient id={`${id}-disc`} cx="50%" cy="40%" r="70%">
        <stop offset="0" stopColor="#fff6e2" />
        <stop offset="1" stopColor="#f6d9a4" />
      </radialGradient>
      <radialGradient id={`${id}-belly`} cx="50%" cy="35%" r="70%">
        <stop offset="0" stopColor="#fffdf3" />
        <stop offset="1" stopColor="#f7e2b0" />
      </radialGradient>
      <linearGradient id={`${id}-beak`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffb547" />
        <stop offset="1" stopColor="#e2741a" />
      </linearGradient>
    </defs>
  );
}

/**
 * An eye with a moving iris (--look-x/--look-y) and a lid that closes from the top
 * (--lid for blinks, `rest` for a squint). `lid` is the lid colour.
 */
function Eye({ id, name, cx, cy, rx, ry, iris, irisFill, lid, rest = 0, lash }: {
  id: string; name: string; cx: number; cy: number; rx: number; ry: number;
  iris: number; irisFill: string; lid: string; rest?: number; lash?: string;
}) {
  const clip = `${id}-${name}`;
  return (
    <g>
      <clipPath id={clip}><ellipse cx={cx} cy={cy} rx={rx} ry={ry} /></clipPath>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-eye)`} />
      <g clipPath={`url(#${clip})`}>
        <g className="av-iris">
          <circle cx={cx} cy={cy} r={iris} fill={irisFill} />
          <circle cx={cx} cy={cy} r={iris * 0.5} fill="#0a0604" />
          <circle cx={cx - iris * 0.38} cy={cy - iris * 0.4} r={iris * 0.28} fill="#fff" />
          <circle cx={cx + iris * 0.3} cy={cy + iris * 0.34} r={iris * 0.12} fill="#ffffffb0" />
        </g>
        <rect className="av-lid" x={cx - rx - 1} y={cy - ry - 1} width={rx * 2 + 2} height={ry * 2 + 2} fill={lid}
          style={{ "--lid-rest": rest } as React.CSSProperties} />
      </g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#00000022" strokeWidth="1.2" />
      {lash && <path d={`M${cx - rx} ${cy - ry * 0.3} Q${cx} ${cy - ry * 1.25} ${cx + rx} ${cy - ry * 0.3}`} fill="none" stroke={lash} strokeWidth="2.6" strokeLinecap="round" />}
    </g>
  );
}

function browParams(emotion: AvatarEmotion) {
  switch (emotion) {
    case "thinking": return { ly: -7, ry: -1, lr: -8, rr: 4 };
    case "surprised": return { ly: -9, ry: -9, lr: -4, rr: 4 };
    case "cheer": return { ly: -4, ry: -4, lr: -3, rr: 3 };
    case "happy": return { ly: -2, ry: -2, lr: -2, rr: 2 };
    default: return { ly: 0, ry: 0, lr: 0, rr: 0 };
  }
}

function restingMouth(emotion: AvatarEmotion): string {
  switch (emotion) {
    case "cheer": return "M84 131 Q100 154 116 131 Q100 139 84 131 Z";
    case "happy": return "M86 133 Q100 147 114 133";
    case "surprised": return "M95 134 Q100 130 105 134 Q108 142 100 145 Q92 142 95 134 Z";
    case "thinking": return "M91 138 Q100 136 109 140";
    default: return "M91 136 Q100 141 109 136";
  }
}

/** Human mouth: a resting shape, or while talking a mouth whose opening follows --mouth. */
function HumanMouth({ talking, emotion, lip }: { talking: boolean; emotion: AvatarEmotion; lip: string }) {
  if (talking) {
    return (
      <g className="av-mouth-live">
        <ellipse cx="100" cy="137" rx="11" ry="8" fill="#6b1726" stroke={lip} strokeWidth="2.4" />
        <path d="M91 132.5 Q100 130 109 132.5 L108 135 Q100 133.5 92 135Z" fill="#fff" />
        <ellipse cx="100" cy="142" rx="6.5" ry="3" fill="#e0707f" />
      </g>
    );
  }
  const filled = emotion === "cheer" || emotion === "surprised";
  return <path d={restingMouth(emotion)} fill={filled ? "#7a1f2b" : "none"} stroke={lip} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
}

function Human({ id, kind, emotion, talking }: { id: string; kind: "woman" | "man"; emotion: AvatarEmotion; talking: boolean }) {
  const woman = kind === "woman";
  const brows = browParams(emotion);
  const lip = woman ? "#c2415c" : "#a8504a";
  const browColor = woman ? "#3a2113" : "#1e2026";
  const rest = emotion === "thinking" ? 0.25 : emotion === "cheer" ? 0.15 : 0;
  return (
    <g>
      {woman && (
        <path d="M48 96 C40 40 78 22 100 22 C124 22 160 42 152 100 C158 150 150 178 138 190 L62 190 C50 178 44 150 48 96Z" fill={`url(#${id}-hairW)`} />
      )}
      <path d="M22 240 C22 196 58 176 100 176 C142 176 178 196 178 240Z" fill={`url(#${woman ? `${id}-suitW` : `${id}-suitM`})`} />
      <path d="M100 176 L76 240 L124 240Z" fill={woman ? "#f5fbfa" : "#f7f8fb"} />
      {woman
        ? <path d="M84 178 L100 214 L116 178 Q100 190 84 178Z" fill="#e8f3f1" />
        : <path d="M94 184 L106 184 L110 236 L100 244 L90 236Z" fill="#c8374a" />}
      <path d="M82 150 L82 182 Q100 196 118 182 L118 150Z" fill={`url(#${id}-skin)`} />
      <path d="M82 164 Q100 178 118 164 L118 182 Q100 196 82 182Z" fill="#00000026" />
      <g className="av-head">
        <ellipse cx="52" cy="104" rx="7" ry="11" fill={`url(#${id}-skin)`} />
        <ellipse cx="148" cy="104" rx="7" ry="11" fill={`url(#${id}-skin)`} />
        {woman && (<><circle cx="52" cy="116" r="3" fill="#f6cf6b" /><circle cx="148" cy="116" r="3" fill="#f6cf6b" /></>)}
        <ellipse cx="100" cy="100" rx="49" ry="57" fill={`url(#${id}-skin)`} />
        {woman ? (
          <path d="M50 92 C46 46 82 30 104 34 C130 36 152 56 150 94 C140 70 124 60 104 58 C84 60 62 68 50 92Z" fill={`url(#${id}-hairW)`} />
        ) : (
          <path d="M51 90 C44 40 80 26 102 28 C130 28 156 48 149 92 C146 72 134 58 118 54 C100 62 70 58 56 78Z" fill={`url(#${id}-hairM)`} />
        )}
        <path d="M70 44 C86 36 108 36 126 46" fill="none" stroke="#ffffff30" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="68" cy="121" rx="10" ry="6" fill="#ff8aa0" opacity={emotion === "cheer" || emotion === "happy" ? 0.45 : 0.2} />
        <ellipse cx="132" cy="121" rx="10" ry="6" fill="#ff8aa0" opacity={emotion === "cheer" || emotion === "happy" ? 0.45 : 0.2} />
        <path d="M63 82 Q76 76 90 82" fill="none" stroke={browColor} strokeWidth={woman ? 3 : 4.2} strokeLinecap="round"
          style={{ transform: `translateY(${brows.ly}px) rotate(${brows.lr}deg)`, transformOrigin: "76px 82px" }} className="av-brow" />
        <path d="M110 82 Q124 76 137 82" fill="none" stroke={browColor} strokeWidth={woman ? 3 : 4.2} strokeLinecap="round"
          style={{ transform: `translateY(${brows.ry}px) rotate(${brows.rr}deg)`, transformOrigin: "124px 82px" }} className="av-brow" />
        <Eye id={id} name="l" cx={76} cy={98} rx={11} ry={9.5} iris={6} irisFill={`url(#${id}-iris)`} lid={SKIN[1]} rest={rest} lash={woman ? "#22110a" : undefined} />
        <Eye id={id} name="r" cx={124} cy={98} rx={11} ry={9.5} iris={6} irisFill={`url(#${id}-iris)`} lid={SKIN[1]} rest={rest} lash={woman ? "#22110a" : undefined} />
        {!woman && (
          <g fill="none" stroke="#2b2f3a" strokeWidth="2.2">
            <rect x="58" y="86" width="36" height="25" rx="9" fill="#ffffff14" />
            <rect x="106" y="86" width="36" height="25" rx="9" fill="#ffffff14" />
            <path d="M94 97 H106" />
          </g>
        )}
        <path d="M100 104 Q96 118 101 121 Q106 120 104 118" fill="none" stroke="#b9775a" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
        <ellipse cx="98" cy="108" rx="2.6" ry="5" fill="#fff" opacity="0.28" />
        <HumanMouth talking={talking} emotion={emotion} lip={lip} />
      </g>
    </g>
  );
}

/** Alex the owl: the lower half of the beak drops with the voice while it talks. */
function Owl({ id, emotion }: { id: string; emotion: AvatarEmotion }) {
  const brows = browParams(emotion);
  // Only a thinking owl narrows its eyes; happy owls keep them wide open.
  const rest = emotion === "thinking" ? 0.3 : 0;
  const feather = "#e08a2c";
  return (
    <g>
      {/* wings */}
      <path d="M30 148 C6 172 12 218 48 230 C58 202 54 170 42 146Z" fill={`url(#${id}-owl)`} className="av-wing av-wing-l" />
      <path d="M170 148 C194 172 188 218 152 230 C142 202 146 170 158 146Z" fill={`url(#${id}-owl)`} className="av-wing av-wing-r" />
      {/* body */}
      <g className="av-body">
        <ellipse cx="100" cy="176" rx="60" ry="62" fill={`url(#${id}-owl)`} />
        <ellipse cx="100" cy="188" rx="40" ry="46" fill={`url(#${id}-belly)`} />
        {[0, 1, 2].map((row) => [0, 1, 2].map((col) => (
          <path key={`${row}${col}`} d={`M${80 + col * 20 - (row % 2) * 10} ${168 + row * 16} q6 8 12 0`} fill="none" stroke="#e4b97a" strokeWidth="2.2" strokeLinecap="round" />
        )))}
      </g>
      <g className="av-head">
        {/* ear tufts */}
        <path d="M46 66 L30 18 L78 46Z" fill={`url(#${id}-owl)`} className="av-tuft av-tuft-l" />
        <path d="M154 66 L170 18 L122 46Z" fill={`url(#${id}-owl)`} className="av-tuft av-tuft-r" />
        {/* head */}
        <ellipse cx="100" cy="96" rx="66" ry="60" fill={`url(#${id}-owl)`} />
        <path d="M70 40 C88 30 112 30 130 42" fill="none" stroke="#ffffff55" strokeWidth="4" strokeLinecap="round" />
        {/* facial disc: the heart-shaped face of an owl */}
        <path d="M100 66 C86 46 42 48 40 92 C38 128 76 140 100 128 C124 140 162 128 160 92 C158 48 114 46 100 66Z" fill={`url(#${id}-disc)`} />
        <path d="M100 66 L100 104" stroke="#e9c48a" strokeWidth="2" />
        {/* brows (feather ridges) */}
        <path d="M46 72 Q68 58 94 72" fill="none" stroke="#9a4f16" strokeWidth="5" strokeLinecap="round"
          style={{ transform: `translateY(${brows.ly}px) rotate(${brows.lr}deg)`, transformOrigin: "70px 68px" }} className="av-brow" />
        <path d="M106 72 Q132 58 154 72" fill="none" stroke="#9a4f16" strokeWidth="5" strokeLinecap="round"
          style={{ transform: `translateY(${brows.ry}px) rotate(${brows.rr}deg)`, transformOrigin: "130px 68px" }} className="av-brow" />
        <Eye id={id} name="l" cx={71} cy={94} rx={21} ry={21} iris={13} irisFill={`url(#${id}-owliris)`} lid={feather} rest={rest} />
        <Eye id={id} name="r" cx={129} cy={94} rx={21} ry={21} iris={13} irisFill={`url(#${id}-owliris)`} lid={feather} rest={rest} />
        {/* beak: the lower half drops with the voice, showing a dark mouth between the halves */}
        <ellipse className="av-mouth-cavity" cx="100" cy="125" rx="10.5" ry="9" fill="#4a1508" />
        <ellipse className="av-mouth-cavity" cx="100" cy="131" rx="6" ry="3" fill="#e0707f" />
        <path className="av-beak-low" d="M90 121 Q100 118 110 121 Q107 131 100 134 Q93 131 90 121Z" fill="#d9661a" stroke="#a9480c" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M85 106 Q100 97 115 106 Q114 118 100 127 Q86 118 85 106Z" fill={`url(#${id}-beak)`} stroke="#a9480c" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M91 107 Q100 102 109 107" fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="95" cy="106" r="1.3" fill="#7a3409" /><circle cx="105" cy="106" r="1.3" fill="#7a3409" />
        {(emotion === "happy" || emotion === "cheer") && (
          <><ellipse cx="50" cy="118" rx="9" ry="5.5" fill="#ff7a8a" opacity=".45" /><ellipse cx="150" cy="118" rx="9" ry="5.5" fill="#ff7a8a" opacity=".45" /></>
        )}
        {/* cap */}
        <g className="av-cap">
          <path d="M46 46 L100 22 L154 46 L100 70Z" fill="#26324a" />
          <path d="M72 56 V72 Q100 86 128 72 V56 L100 70Z" fill="#1a2336" />
          <path d="M154 46 V74" stroke="#f6c23e" strokeWidth="3" strokeLinecap="round" />
          <circle cx="154" cy="78" r="5" fill="#f6c23e" className="av-tassel" />
          <circle cx="100" cy="45" r="4" fill="#f6c23e" />
        </g>
      </g>
      <path d="M80 236 l-6 9 M90 238 l-3 9 M110 238 l3 9 M120 236 l6 9" stroke="#e08a1a" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

/** Calm, natural-looking random numbers between a and b. */
const between = (a: number, b: number) => a + Math.random() * (b - a);

export function TutorAvatar({ kind, status = "idle", emotion, size = 120, interactive = true, className = "" }: Props) {
  const rawId = useId();
  const id = `av${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const talking = status === "speaking";
  const resolved: AvatarEmotion = emotion
    ?? (status === "thinking" ? "thinking" : status === "speaking" ? "happy" : status === "listening" ? "surprised" : "happy");

  // One animation loop drives the mouth, blinks, eye movement and pointer-follow through
  // CSS variables, so React does not re-render 60 times a second.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let frame = 0;
    let mouth = 0;
    let lid = 0;
    let nextBlink = performance.now() + between(1500, 4000);
    let blinkUntil = 0;
    let look = { x: 0, y: 0 };
    let lookTarget = { x: 0, y: 0 };
    let nextGlance = performance.now() + between(1200, 3000);
    let pointer: { x: number; y: number; at: number } | null = null;
    // Synthetic speech rhythm for when no real audio signal is available.
    let syllableEnd = 0;
    let syllableOpen = 0;

    const onMove = (event: PointerEvent) => { pointer = { x: event.clientX, y: event.clientY, at: performance.now() }; };
    if (interactive && !reduced) window.addEventListener("pointermove", onMove, { passive: true });

    const tick = (now: number) => {
      const speaking = statusRef.current === "speaking";

      // Mouth: real loudness, else a babble of syllables while speaking.
      let target = 0;
      if (speaking) {
        const real = realMouthLevel();
        if (real !== null) {
          target = real;
        } else {
          if (now > syllableEnd) {
            const pause = Math.random() < 0.12;
            syllableOpen = pause ? 0 : between(0.35, 1);
            syllableEnd = now + (pause ? between(120, 260) : between(90, 170));
          }
          target = syllableOpen;
        }
      }
      mouth += (target - mouth) * (target > mouth ? 0.55 : 0.3);

      // Blinks: random, sometimes double.
      if (now > nextBlink) {
        blinkUntil = now + 130;
        nextBlink = now + (Math.random() < 0.18 ? 260 : between(2200, 5500));
      }
      lid = now < blinkUntil ? 1 : Math.max(0, lid - 0.25);

      // Eyes: follow the pointer for a while, otherwise glance around.
      const box = stage.getBoundingClientRect();
      if (pointer && now - pointer.at < 2500) {
        const dx = (pointer.x - (box.left + box.width / 2)) / Math.max(window.innerWidth / 2, 1);
        const dy = (pointer.y - (box.top + box.height * 0.4)) / Math.max(window.innerHeight / 2, 1);
        lookTarget = { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };
      } else if (now > nextGlance) {
        lookTarget = Math.random() < 0.45 ? { x: 0, y: 0 } : { x: between(-0.9, 0.9), y: between(-0.6, 0.6) };
        nextGlance = now + between(900, 2800);
      }
      if (statusRef.current === "thinking") lookTarget = { x: 0.7, y: -0.8 };
      look = { x: look.x + (lookTarget.x - look.x) * 0.18, y: look.y + (lookTarget.y - look.y) * 0.18 };

      stage.style.setProperty("--mouth", mouth.toFixed(3));
      stage.style.setProperty("--lid", lid.toFixed(2));
      stage.style.setProperty("--look-x", (look.x * 4).toFixed(2));
      stage.style.setProperty("--look-y", (look.y * 3).toFixed(2));
      stage.style.setProperty("--av-ry", `${(look.x * 10).toFixed(2)}deg`);
      stage.style.setProperty("--av-rx", `${(-look.y * 6).toFixed(2)}deg`);
      frame = requestAnimationFrame(tick);
    };
    if (!reduced) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [interactive]);

  const label = kind === "woman" ? "Cô giáo AI" : kind === "man" ? "Thầy giáo AI" : "Linh vật Alex";
  return (
    <div
      ref={stageRef}
      className={`av-stage av-${kind} av-status-${status} av-emo-${resolved} ${className}`.trim()}
      style={{ width: size, height: size * 1.2 }}
      role="img"
      aria-label={label}
    >
      <div className="av-glow" />
      {status === "listening" && <><i className="av-ring av-ring-1" /><i className="av-ring av-ring-2" /></>}
      <div className="av-float">
        <svg viewBox="0 0 200 250" width={size} height={size * 1.2} className="av-svg">
          <Defs id={id} />
          {kind === "mascot"
            ? <Owl id={id} emotion={resolved} />
            : <Human id={id} kind={kind} emotion={resolved} talking={talking} />}
        </svg>
      </div>
      <div className="av-shadow" />
      {status === "thinking" && <div className="av-think"><i /><i /><i /></div>}
    </div>
  );
}
