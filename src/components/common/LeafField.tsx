import React from "react";

type LeafConfig = {
  left: string;
  width: number;
  height: number;
  duration: string;
  delay: string;
  fill: string;
  opacity: number;
};

const LEAVES: LeafConfig[] = [
  { left: "2%", width: 46, height: 69, duration: "15s, 4.2s, 7s", delay: "0s, 0s, 0s", fill: "#FF2E63", opacity: 0.6 },
  { left: "12%", width: 30, height: 45, duration: "12s, 5s, 5.5s", delay: "1s, .5s, .2s", fill: "#FFC93F", opacity: 0.65 },
  { left: "24%", width: 54, height: 81, duration: "19s, 6s, 9s", delay: "3s, 1s, 0s", fill: "#9D4EFF", opacity: 0.55 },
  { left: "36%", width: 34, height: 51, duration: "13s, 4.5s, 6s", delay: "2s, 2s, .4s", fill: "#00E5FF", opacity: 0.6 },
  { left: "48%", width: 50, height: 75, duration: "17s, 5.5s, 8s", delay: "5s, 0s, 1s", fill: "#FF2E63", opacity: 0.55 },
  { left: "58%", width: 28, height: 42, duration: "14s, 6.5s, 5s", delay: "4s, 1.5s, 0s", fill: "#FFC93F", opacity: 0.6 },
  { left: "68%", width: 58, height: 87, duration: "20s, 4s, 9.5s", delay: "6s, 3s, .6s", fill: "#9D4EFF", opacity: 0.55 },
  { left: "78%", width: 32, height: 48, duration: "16s, 5s, 6.5s", delay: "2.5s, .5s, 0s", fill: "#00E5FF", opacity: 0.6 },
  { left: "88%", width: 44, height: 66, duration: "18s, 6s, 7.5s", delay: "7s, 2s, 1s", fill: "#FF2E63", opacity: 0.55 },
  { left: "94%", width: 26, height: 39, duration: "11s, 5.2s, 5s", delay: "9s, 1s, .3s", fill: "#FFC93F", opacity: 0.5 },
];

export const LeafField: React.FC = () => {
  return (
    <>
      {/* ── Spinning Aura Ring ── */}
      <div className="aura-ring" aria-hidden="true">
        <svg viewBox="0 0 200 200">
          <circle className="aura-ring-c1" cx="100" cy="100" r="92" stroke="#9D4EFF" strokeDasharray="2 10" />
          <circle className="aura-ring-c2" cx="100" cy="100" r="74" stroke="#00E5FF" strokeDasharray="1 7" />
        </svg>
      </div>

      {/* ── Falling Leaves ── */}
      <div className="leaf-field" aria-hidden="true">
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <symbol id="leaf-shape" viewBox="0 0 40 60">
            <path d="M20 0 C34 10 40 30 20 60 C0 30 6 10 20 0 Z" />
            <path d="M20 4 L20 56" stroke="rgba(0,0,0,0.25)" strokeWidth="1.4" fill="none" />
            <path d="M20 18 L12 26 M20 30 L28 38 M20 42 L13 49" stroke="rgba(0,0,0,0.18)" strokeWidth="1" fill="none" />
          </symbol>
        </svg>

        {LEAVES.map((leaf, index) => (
          <div
            key={index}
            className="leaf"
            style={{
              left: leaf.left,
              width: `${leaf.width}px`,
              height: `${leaf.height}px`,
              animationDuration: leaf.duration,
              animationDelay: leaf.delay,
            }}
          >
            <svg viewBox="0 0 40 60">
              <use href="#leaf-shape" fill={leaf.fill} opacity={leaf.opacity} />
            </svg>
          </div>
        ))}
      </div>
    </>
  );
};

export default LeafField;
