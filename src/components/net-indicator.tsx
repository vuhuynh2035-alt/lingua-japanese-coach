"use client";

import { useEffect, useState } from "react";

/** Three bouncing dots: "something is happening". */
export function WaitDots() {
  return <span className="wait-dots" aria-hidden="true"><i /><i /><i /></span>;
}

/**
 * Shown only while the learner must wait for something they asked for (an AI answer, a
 * lesson pack, a key check) — background work never shows it. Taps are blocked meanwhile,
 * so an impatient second tap cannot start more downloads; `onCancel` offers a way out.
 */
export function WaitIndicator({ active, label = "Đang tải về, xin hãy đợi", onCancel }: {
  active: boolean;
  label?: string;
  onCancel?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    // Quick loads do not flash anything (taps are still blocked from the start).
    const timer = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(timer);
  }, [active]);
  if (!active) return null;
  return (
    <div className="wait-scrim" aria-busy="true">
      {visible && (
        <>
          <div className="net-bar" aria-hidden="true" />
          <div className="net-chip" role="status" aria-live="polite">
            <WaitDots /> {label}
            {onCancel && <button type="button" className="wait-cancel" onClick={onCancel}>Hủy</button>}
          </div>
        </>
      )}
    </div>
  );
}
