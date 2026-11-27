"use client";
import { useEffect, useState } from "react";

// An original isometric town, drawn in code. The van follows the route to the job.
const P = (x: number, y: number, z = 0): [number, number] => [400 + (x - y) * 34.6, 120 + (x + y) * 20 - z * 20];
const pts = (...p: [number, number][]) => p.map((q) => q.map((n) => n.toFixed(1)).join(",")).join(" ");
const ROAD = (v: number) => v === 3 || v === 7;
const BLOCKS: { x: number; y: number; h: number; tone: number; tree: boolean }[] = [];
for (let sum = -8; sum <= 30; sum++) for (let x = -8; x <= 18; x++) {
  const y = sum - x;
  if (y < -8 || y > 18 || ROAD(x) || ROAD(y)) continue;
  const n = Math.abs((x * 73 + y * 151 + x * y * 17) % 23);
  BLOCKS.push({ x, y, h: n < 7 ? 0 : 0.7 + (n % 6) * 0.45, tone: n % 4, tree: n < 4 });
}
// Along the roads: in from the left, turn, then on to the job
const route = `M ${P(-4, 7.5)} L ${P(3.5, 7.5)} L ${P(3.5, 3.5)} L ${P(7.5, 3.5)}`.replaceAll(",", " ");

export default function Scene() {
  const [motion, setMotion] = useState(false);
  useEffect(() => { setMotion(!matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  const [px, py] = P(7.5, 3.5);
  return (
    <svg className="scene" viewBox="100 40 600 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x="-200" y="-200" width="1200" height="1100" className="ground" />
      {[3, 7].map((r) => <g key={r} className="road">
        <polygon points={pts(P(r, -9), P(r + 1, -9), P(r + 1, 19), P(r, 19))} />
        <polygon points={pts(P(-9, r), P(19, r), P(19, r + 1), P(-9, r + 1))} /></g>)}
      <path d={route} className="trail-line" />
      {BLOCKS.map(({ x, y, h, tone, tree }) => {
        const a = x + 0.12, b = y + 0.12, c = x + 0.88, d = y + 0.88;
        if (!h) { const [tx, ty] = P(x + 0.5, y + 0.5); return tree
          ? <g key={`${x},${y}`}><ellipse cx={tx} cy={ty} rx="12" ry="6" className="shade" /><circle cx={tx} cy={ty - 16} r="11" className="tree" /></g>
          : <polygon key={`${x},${y}`} className="plot" points={pts(P(a, b), P(c, b), P(c, d), P(a, d))} />; }
        return <g key={`${x},${y}`} className={`block t${tone}`}>
          <polygon className="left" points={pts(P(a, d), P(c, d), P(c, d, h), P(a, d, h))} />
          <polygon className="right" points={pts(P(c, b), P(c, d), P(c, d, h), P(c, b, h))} />
          <polygon className="top" points={pts(P(a, b, h), P(c, b, h), P(c, d, h), P(a, d, h))} />
          {Array.from({ length: Math.floor(h / 0.55) }, (_, i) => [0.18, 0.52].map((o, j) => (
            <polygon key={`${i}${j}`} className={(x + y + i + j) % 4 === 0 ? "win lit" : "win"} style={{ animationDelay: `${((x * 3 + y * 5 + i * 7 + j) % 11) / 2}s` }}
              points={pts(P(a + o, d, i * 0.55 + 0.2), P(a + o + 0.2, d, i * 0.55 + 0.2), P(a + o + 0.2, d, i * 0.55 + 0.48), P(a + o, d, i * 0.55 + 0.48))} />
          )))}
        </g>;
      })}
      {/* The route is drawn again faintly so it stays readable behind buildings */}
      <path d={route} className="trail-line ghost-line" />
      <g transform={motion ? undefined : `translate(${P(3.5, 5.5)})`}>
        <circle r="17" className="van-ring" /><circle r="11" className="van-dot" />
        <path d="M-5 1h10M0-4l5 5-5 5" className="van-arrow" transform="translate(0 -1)" />
        {motion && <animateMotion dur="9s" repeatCount="indefinite" path={route} keyPoints="0;1;1" keyTimes="0;0.85;1" calcMode="linear" />}
      </g>
      <g transform={`translate(${px} ${py - 4})`}><ellipse rx="16" ry="7" className="shade" />
        <g className="drop-pin"><path d="M0 0C-8-16-22-26-22-42a22 22 0 1 1 44 0C22-26 8-16 0 0Z" className="pin-body" /><circle cy="-42" r="9" className="pin-eye" /></g></g>
    </svg>
  );
}
