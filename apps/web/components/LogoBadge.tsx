// Recreated from the brand mark supplied by the user: a black circular
// badge, a mint ring, "SORT-IT-OUT" curved around the inside in a layered
// sticker style, and a teal funnel with scattered dots at the center
// (the funnel doubles as a nod to "sort" - filtering results down).
export function LogoBadge({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="sio-badge-ring" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
      </defs>

      <circle cx="50" cy="50" r="49" fill="#000" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#b7f0d6" strokeWidth="3.5" />

      <text
        fill="#fff"
        stroke="#0a0a0a"
        strokeWidth="1.4"
        paintOrder="stroke"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight={800}
        fontSize="12.5"
        letterSpacing="1.5"
      >
        <textPath href="#sio-badge-ring" startOffset="2%">
          SORT · IT · OUT · SORT · IT · OUT ·
        </textPath>
      </text>

      <circle cx="50" cy="50" r="26" fill="#000" stroke="#b7f0d6" strokeWidth="1.4" />

      <circle cx="41" cy="34" r="2.3" fill="#2dd4bf" />
      <circle cx="49" cy="30" r="1.4" fill="#2dd4bf" />
      <circle cx="56" cy="32" r="1.7" fill="#2dd4bf" />
      <circle cx="62" cy="36" r="2.1" fill="#2dd4bf" />

      <path d="M 36,39 L 64,39 L 53,53 L 53,63 L 47,66 L 47,53 Z" fill="#2dd4bf" />
    </svg>
  );
}
