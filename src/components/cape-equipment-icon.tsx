/** Small original vector illustrations; no raster download or icon font. */
export function CapeEquipmentIcon({
  kind,
}: {
  kind: "twisted-bow" | "bowfa" | "crossbow" | "scythe" | "shadow";
}) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      className="cape-item-icon"
    >
      <defs>
        <linearGradient
          id={`metal-${kind}`}
          x1="10"
          y1="5"
          x2="65"
          y2="75"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={kind === "bowfa" ? "#b7f1ff" : "#fff1c8"} />
          <stop
            offset=".5"
            stopColor={kind === "bowfa" ? "#32b7e3" : "#bb8056"}
          />
          <stop
            offset="1"
            stopColor={kind === "shadow" ? "#9d66d0" : "#704940"}
          />
        </linearGradient>
      </defs>
      {kind === "twisted-bow" || kind === "bowfa" ? (
        <>
          <path
            d={
              kind === "bowfa"
                ? "M15 8 30 19 22 26 40 40 54 57 60 52 72 68 57 65 49 54 36 42 24 35 17 23Z"
                : "M15 8C46 8 19 27 40 40S70 43 72 68C55 54 45 58 35 44S21 21 15 8Z"
            }
            fill={`url(#metal-${kind})`}
            stroke={kind === "bowfa" ? "#b1eeff" : "#f3c89a"}
            strokeWidth="1.5"
          />
          <path d="M15 8 72 68M10 72 64 15" stroke="#f5dcbc" strokeWidth="1" />
          <path d="m59 15 8-4-3 9" fill="#d8e4e9" />
          <path d="m7 68 9 8M11 63l9 8" stroke="#bc7657" strokeWidth="3" />
        </>
      ) : kind === "crossbow" ? (
        <>
          <path
            d="M12 15C29 9 35 35 42 38S63 23 71 29L56 49 40 45 23 30Z"
            fill={`url(#metal-${kind})`}
            stroke="#e8dbcd"
            strokeWidth="2"
          />
          <path
            d="m17 17 46 29 23 2M39 39 13 70"
            stroke="#e1cead"
            strokeWidth="1"
          />
          <path
            d="m42 36-8 19-13 17-7-5 18-26Z"
            fill="#7c4e36"
            stroke="#d9a878"
            strokeWidth="2"
          />
          <path d="m34 41 16-25" stroke="#e8e8ee" strokeWidth="2" />
        </>
      ) : kind === "scythe" ? (
        <>
          <path d="M25 70 48 16" stroke="#855846" strokeWidth="5" />
          <path
            d="M45 18C61 11 74 25 71 52 65 34 56 30 43 30L34 25Z"
            fill="#b4c2cc"
            stroke="#e6e3da"
            strokeWidth="2"
          />
          <path d="M28 62 34 48M38 37l7-17" stroke="#d0a077" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="m23 72 29-52" stroke="#7c569a" strokeWidth="5" />
          <path
            d="m35 13 15 1 9-10 5 12 10 4-8 10-15 1-13-7Z"
            fill={`url(#metal-${kind})`}
            stroke="#d6b7ee"
            strokeWidth="2"
          />
          <path d="m44 18 9-3 8 6-9 4Z" fill="#8be7ec" />
          <path d="m27 65 8-15m7-12 6-11" stroke="#d9b5e9" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
