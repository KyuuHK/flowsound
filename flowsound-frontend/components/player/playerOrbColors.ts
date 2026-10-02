// Genre colorway registry for the Fluid Audio Orb (orb.md §3), re-keyed to the
// CURRENT station ids and harmonized with CATEGORY_ACCENTS in LofiPlayer: each
// primary roughly matches the category accent hue, and the secondary is its dark
// pole so the liquid-glass vertical gradient reads.
export interface OrbColorway {
  readonly primary: string;
  readonly secondary: string;
}

export const ORB_COLORWAYS: Readonly<Record<string, OrbColorway>> = {
  activities: { primary: "#F59E0B", secondary: "#78350F" },
  "seasonal-weather": { primary: "#38BDF8", secondary: "#0C4A6E" },
  "ambient-lofi": { primary: "#60A5FA", secondary: "#1E3A5F" },
  "soul-rnb": { primary: "#BE123C", secondary: "#4C0519" },
  "late-night": { primary: "#818CF8", secondary: "#1E1B4B" },
  "funk-soul": { primary: "#D946EF", secondary: "#4A044E" },
  jazzhop: { primary: "#FB923C", secondary: "#431407" },
  chillhop: { primary: "#FBBF24", secondary: "#451A03" },
  "asian-lofi": { primary: "#2DD4BF", secondary: "#042F2C" },
  hybrid: { primary: "#A78BFA", secondary: "#312E81" },
};

export const DEFAULT_ORB_COLORWAY: OrbColorway = ORB_COLORWAYS.activities;

export function orbColorwayFor(category: string | null | undefined): OrbColorway {
  return (category && ORB_COLORWAYS[category]) || DEFAULT_ORB_COLORWAY;
}