"use client";

import { useState, useMemo } from "react";

interface GovernorateData {
  governorate: string;
  count: number;
}

interface YemenMapProps {
  data: GovernorateData[];
}

const GOVERNORATES = [
  { id: "saada", name: "صعدة", x: 60, y: 10, w: 110, h: 70 },
  { id: "jawf", name: "الجوف", x: 180, y: 10, w: 150, h: 70 },
  { id: "hajjah", name: "حجة", x: 60, y: 85, w: 100, h: 65 },
  { id: "amran", name: "عمران", x: 170, y: 85, w: 90, h: 55 },
  { id: "marib", name: "مأرب", x: 270, y: 85, w: 120, h: 70 },
  { id: "hadramaut", name: "حضرموت", x: 400, y: 85, w: 200, h: 80 },
  { id: "al-mahra", name: "المهرة", x: 610, y: 85, w: 140, h: 80 },
  { id: "al-hudaydah", name: "الحديدة", x: 10, y: 155, w: 100, h: 85 },
  { id: "raymah", name: "ريمة", x: 120, y: 155, w: 60, h: 55 },
  { id: "al-mahwit", name: "المحويت", x: 190, y: 145, w: 80, h: 55 },
  { id: "sanaa-city", name: "صنعاء", x: 280, y: 145, w: 70, h: 50 },
  { id: "sanaa", name: "محافظة صنعاء", x: 280, y: 200, w: 100, h: 60 },
  { id: "shabwah", name: "شبوة", x: 390, y: 170, w: 130, h: 80 },
  { id: "socotra", name: "سقطرى", x: 670, y: 260, w: 70, h: 50 },
  { id: "al-bayda", name: "البيضاء", x: 390, y: 255, w: 110, h: 70 },
  { id: "dhamar", name: "ذمار", x: 260, y: 265, w: 90, h: 60 },
  { id: "ibb", name: "إب", x: 160, y: 215, w: 80, h: 55 },
  { id: "taizz", name: "تعز", x: 100, y: 275, w: 100, h: 70 },
  { id: "lahij", name: "لحج", x: 210, y: 330, w: 90, h: 65 },
  { id: "aden", name: "عدن", x: 170, y: 400, w: 80, h: 55 },
  { id: "abyan", name: "أبين", x: 260, y: 400, w: 90, h: 55 },
  { id: "hadramaut-south", name: "حضرموت جنوب", x: 360, y: 330, w: 120, h: 70 },
];

function getColor(count: number, maxCount: number): string {
  if (maxCount === 0) return "#1e3a5f";
  const ratio = count / maxCount;
  const r = Math.round(30 + ratio * 20);
  const g = Math.round(58 + ratio * 100);
  const b = Math.round(95 + ratio * 140);
  return `rgb(${r}, ${g}, ${b})`;
}

function getTextColor(count: number, maxCount: number): string {
  if (maxCount === 0) return "#94a3b8";
  const ratio = count / maxCount;
  return ratio > 0.5 ? "#f0f4f8" : "#cbd5e1";
}

export default function YemenMap({ data }: YemenMapProps) {
  const [hoveredGov, setHoveredGov] = useState<string | null>(null);

  const dataMap = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((d) => {
      map[d.governorate] = d.count;
    });
    return map;
  }, [data]);

  const maxCount = useMemo(
    () => Math.max(...data.map((d) => d.count), 1),
    [data]
  );

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white tracking-wide">
          خريطة المحافظات اليمنية
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>أقل</span>
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((r) => (
              <div
                key={r}
                className="w-6 h-3 rounded-sm"
                style={{ backgroundColor: getColor(r * maxCount, maxCount) }}
              />
            ))}
          </div>
          <span>أكثر</span>
        </div>
      </div>

      <svg
        viewBox="0 0 800 480"
        className="w-full h-auto"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.5" />
          </filter>
        </defs>

        {GOVERNORATES.map((gov) => {
          const count = dataMap[gov.name] ?? 0;
          const isHovered = hoveredGov === gov.id;
          const fillColor = getColor(count, maxCount);
          const textColor = getTextColor(count, maxCount);

          return (
            <g
              key={gov.id}
              onMouseEnter={() => setHoveredGov(gov.id)}
              onMouseLeave={() => setHoveredGov(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <rect
                x={gov.x}
                y={gov.y}
                width={gov.w}
                height={gov.h}
                rx={6}
                ry={6}
                fill={fillColor}
                stroke={isHovered ? "#60a5fa" : "#334155"}
                strokeWidth={isHovered ? 2.5 : 1.2}
                filter={isHovered ? "url(#glow)" : undefined}
                opacity={isHovered ? 1 : 0.9}
                className="transition-all duration-200"
              />

              <text
                x={gov.x + gov.w / 2}
                y={gov.y + gov.h / 2 - (count > 0 ? 6 : 0)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={textColor}
                fontSize={gov.w < 80 ? 10 : 12}
                fontWeight="600"
                className="pointer-events-none select-none"
              >
                {gov.name}
              </text>

              {count > 0 && (
                <text
                  x={gov.x + gov.w / 2}
                  y={gov.y + gov.h / 2 + 14}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fbbf24"
                  fontSize={13}
                  fontWeight="700"
                  filter="url(#shadow)"
                  className="pointer-events-none select-none"
                >
                  {count.toLocaleString()}
                </text>
              )}

              {isHovered && (
                <rect
                  x={gov.x + gov.w / 2 - 40}
                  y={gov.y - 30}
                  width={80}
                  height={24}
                  rx={4}
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth={1}
                />
              )}

              {isHovered && (
                <text
                  x={gov.x + gov.w / 2}
                  y={gov.y - 18}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#e2e8f0"
                  fontSize={11}
                  fontWeight="500"
                  className="pointer-events-none select-none"
                >
                  {gov.name}: {count.toLocaleString()}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {data
          .filter((d) => d.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
          .map((d) => (
            <div
              key={d.governorate}
              className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5 border border-gray-700"
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getColor(d.count, maxCount) }}
              />
              <span className="text-gray-300 text-sm">{d.governorate}</span>
              <span className="text-yellow-400 text-sm font-bold">
                {d.count.toLocaleString()}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
