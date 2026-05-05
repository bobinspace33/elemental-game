// Periodic table dataset.
//
// Layout note: we use a 10-row x 18-column grid.
// Rows 1..7 = the standard main block.
// Row 8 is intentionally left empty as a visual gap.
// Rows 9..10 = the f-block (lanthanides + actinides).
//
// La (57) and Ac (89) live in the f-block rows for a clean 32-column-equivalent
// layout, with placeholder marker cells at (6, 3) and (7, 3) in the main block.
//
// This grid is the source of truth for both rendering and Chebyshev-distance
// scoring. Distance(A, B) = max(|rowA - rowB|, |colA - colB|).

export type ElementCategory =
  | "alkali-metal"
  | "alkaline-earth"
  | "transition-metal"
  | "post-transition"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble-gas"
  | "lanthanide"
  | "actinide"
  | "unknown";

export interface ElementDef {
  z: number;
  symbol: string;
  name: string;
  row: number; // 1-indexed
  col: number; // 1-indexed
  category: ElementCategory;
}

/** Card-fill families: one keyed hue (+ gradient) per category for a deliberate color key. */
export type CardDisplayCategory =
  | "reactive-nonmetal"
  | "alkali-metal"
  | "alkaline-earth"
  | "transition-metal"
  | "post-transition"
  | "metalloid"
  | "noble-gas"
  | "lanthanide"
  | "actinide"
  | "unknown";

const CATEGORY_HUE_BASE: Record<CardDisplayCategory, number> = {
  "alkali-metal": 356,
  "alkaline-earth": 26,
  "transition-metal": 52,
  "post-transition": 138,
  metalloid: 192,
  "reactive-nonmetal": 232,
  "noble-gas": 278,
  lanthanide: 332,
  actinide: 41,
  unknown: 220,
};

const CATEGORY_SAT: Record<CardDisplayCategory, number> = {
  "alkali-metal": 84,
  "alkaline-earth": 86,
  "transition-metal": 78,
  "post-transition": 70,
  metalloid: 58,
  "reactive-nonmetal": 72,
  "noble-gas": 71,
  lanthanide: 40,
  actinide: 72,
  unknown: 16,
};

export function elementCardDisplayCategory(
  category: ElementCategory,
): CardDisplayCategory {
  switch (category) {
    case "nonmetal":
    case "halogen":
      return "reactive-nonmetal";
    case "alkali-metal":
      return "alkali-metal";
    case "alkaline-earth":
      return "alkaline-earth";
    case "transition-metal":
      return "transition-metal";
    case "post-transition":
      return "post-transition";
    case "metalloid":
      return "metalloid";
    case "noble-gas":
      return "noble-gas";
    case "lanthanide":
      return "lanthanide";
    case "actinide":
      return "actinide";
    case "unknown":
      return "unknown";
    default: {
      const x: never = category;
      return x;
    }
  }
}

/** Hue angle (card palette, °) for rainbow-sorting category groups (e.g. scorecard exact hits). */
export function elementCategoryRainbowHue(cat: ElementCategory): number {
  const disp = elementCardDisplayCategory(cat);
  if (disp === "unknown") return 999;
  return CATEGORY_HUE_BASE[disp];
}

function cardHueMid(disp: Exclude<CardDisplayCategory, "unknown">): number {
  return (CATEGORY_HUE_BASE[disp] + 3600) % 360;
}

function categoryGradientBand(
  disp: Exclude<CardDisplayCategory, "unknown">,
): { topL: number; botL: number; botHueShift?: number } {
  switch (disp) {
    case "alkali-metal":
      return { topL: 38, botL: 25, botHueShift: 10 };
    case "alkaline-earth":
      return { topL: 58, botL: 46, botHueShift: 12 };
    case "transition-metal":
      return { topL: 55, botL: 42, botHueShift: 22 };
    case "post-transition":
      return { topL: 46, botL: 34, botHueShift: 14 };
    case "metalloid":
      return { topL: 64, botL: 53, botHueShift: 10 };
    case "reactive-nonmetal":
      return { topL: 32, botL: 21, botHueShift: 12 };
    case "noble-gas":
      return { topL: 50, botL: 39, botHueShift: 10 };
    case "lanthanide":
      return { topL: 50, botL: 41, botHueShift: 6 };
    case "actinide":
      return { topL: 44, botL: 30, botHueShift: -10 };
  }
}

/** HSL gradient stops for placed / colored element cards (solid category key). */
export function elementCardGradientStops(el: ElementDef): {
  top: string;
  bottom: string;
} {
  const disp = elementCardDisplayCategory(el.category);
  if (disp === "unknown") {
    return {
      top: "hsl(220 14% 40%)",
      bottom: "hsl(226 18% 26%)",
    };
  }
  const sat = CATEGORY_SAT[disp];
  const hMid = cardHueMid(disp);
  const { topL, botL, botHueShift } = categoryGradientBand(disp);
  const shift = botHueShift ?? 14;
  const hTop = hMid;
  const hBot = (hMid + shift + 360) % 360;

  return {
    top: `hsl(${Math.round(hTop)} ${sat}% ${topL}%)`,
    bottom: `hsl(${Math.round(hBot)} ${Math.max(50, sat - 8)}% ${botL}%)`,
  };
}

export function elementCardFillBackgroundStyle(
  el: ElementDef,
): { backgroundImage: string } {
  const { top, bottom } = elementCardGradientStops(el);
  return {
    backgroundImage: `linear-gradient(to bottom, ${top}, ${bottom})`,
  };
}

/** Empty slot border tint: matches the palette of the element that belongs in this cell. */
export function emptySlotTargetBorderColor(el: ElementDef): string {
  const disp = elementCardDisplayCategory(el.category);
  if (disp === "unknown") {
    return "rgba(148, 163, 184, 0.72)";
  }
  const hMid = cardHueMid(disp);
  return `hsla(${Math.round(hMid)}, 74%, 58%, 0.85)`;
}

// Card STROKE indicates the chemistry category. `outline` sits inside the slot.
// Slightly boosted whites on subtle categories so frames read at larger cells.
export const CATEGORY_INDICATOR: Record<ElementCategory, string> = {
  "noble-gas":
    "outline outline-2 [outline-offset:-2px] outline-violet-400/90 shadow-[0_0_14px_rgba(167,139,250,0.28)]",
  halogen:
    "outline outline-2 [outline-offset:-2px] outline-blue-500/92",
  metalloid:
    "outline outline-2 outline-dashed [outline-offset:-2px] outline-sky-200/92",
  lanthanide:
    "outline outline-2 outline-dashed [outline-offset:-2px] outline-pink-200/88",
  actinide:
    "outline outline-2 outline-dashed [outline-offset:-2px] outline-amber-600/88",
  unknown:
    "outline outline-1 outline-dashed [outline-offset:-1px] outline-slate-200/70",
  "alkali-metal":
    "outline outline-1 [outline-offset:-1px] outline-red-900/82",
  "alkaline-earth":
    "outline outline-1 [outline-offset:-1px] outline-orange-300/92",
  "transition-metal":
    "outline outline-1 [outline-offset:-1px] outline-yellow-300/82",
  "post-transition":
    "outline outline-1 [outline-offset:-1px] outline-green-400/82",
  nonmetal:
    "outline outline-1 [outline-offset:-1px] outline-blue-500/82",
};

export const CATEGORY_LABEL: Record<ElementCategory, string> = {
  "alkali-metal": "Alkali metal",
  "alkaline-earth": "Alkaline earth",
  "transition-metal": "Transition metal",
  "post-transition": "Post-transition",
  metalloid: "Metalloid",
  nonmetal: "Nonmetal",
  halogen: "Halogen",
  "noble-gas": "Noble gas",
  lanthanide: "Lanthanide",
  actinide: "Actinide",
  unknown: "Unknown",
};

// Helper for compact authoring of the dataset.
const e = (
  z: number,
  symbol: string,
  name: string,
  row: number,
  col: number,
  category: ElementCategory,
): ElementDef => ({ z, symbol, name, row, col, category });

export const ELEMENTS: ElementDef[] = [
  // Period 1
  e(1, "H", "Hydrogen", 1, 1, "nonmetal"),
  e(2, "He", "Helium", 1, 18, "noble-gas"),

  // Period 2
  e(3, "Li", "Lithium", 2, 1, "alkali-metal"),
  e(4, "Be", "Beryllium", 2, 2, "alkaline-earth"),
  e(5, "B", "Boron", 2, 13, "metalloid"),
  e(6, "C", "Carbon", 2, 14, "nonmetal"),
  e(7, "N", "Nitrogen", 2, 15, "nonmetal"),
  e(8, "O", "Oxygen", 2, 16, "nonmetal"),
  e(9, "F", "Fluorine", 2, 17, "halogen"),
  e(10, "Ne", "Neon", 2, 18, "noble-gas"),

  // Period 3
  e(11, "Na", "Sodium", 3, 1, "alkali-metal"),
  e(12, "Mg", "Magnesium", 3, 2, "alkaline-earth"),
  e(13, "Al", "Aluminum", 3, 13, "post-transition"),
  e(14, "Si", "Silicon", 3, 14, "metalloid"),
  e(15, "P", "Phosphorus", 3, 15, "nonmetal"),
  e(16, "S", "Sulfur", 3, 16, "nonmetal"),
  e(17, "Cl", "Chlorine", 3, 17, "halogen"),
  e(18, "Ar", "Argon", 3, 18, "noble-gas"),

  // Period 4
  e(19, "K", "Potassium", 4, 1, "alkali-metal"),
  e(20, "Ca", "Calcium", 4, 2, "alkaline-earth"),
  e(21, "Sc", "Scandium", 4, 3, "transition-metal"),
  e(22, "Ti", "Titanium", 4, 4, "transition-metal"),
  e(23, "V", "Vanadium", 4, 5, "transition-metal"),
  e(24, "Cr", "Chromium", 4, 6, "transition-metal"),
  e(25, "Mn", "Manganese", 4, 7, "transition-metal"),
  e(26, "Fe", "Iron", 4, 8, "transition-metal"),
  e(27, "Co", "Cobalt", 4, 9, "transition-metal"),
  e(28, "Ni", "Nickel", 4, 10, "transition-metal"),
  e(29, "Cu", "Copper", 4, 11, "transition-metal"),
  e(30, "Zn", "Zinc", 4, 12, "post-transition"),
  e(31, "Ga", "Gallium", 4, 13, "post-transition"),
  e(32, "Ge", "Germanium", 4, 14, "metalloid"),
  e(33, "As", "Arsenic", 4, 15, "metalloid"),
  e(34, "Se", "Selenium", 4, 16, "nonmetal"),
  e(35, "Br", "Bromine", 4, 17, "halogen"),
  e(36, "Kr", "Krypton", 4, 18, "noble-gas"),

  // Period 5
  e(37, "Rb", "Rubidium", 5, 1, "alkali-metal"),
  e(38, "Sr", "Strontium", 5, 2, "alkaline-earth"),
  e(39, "Y", "Yttrium", 5, 3, "transition-metal"),
  e(40, "Zr", "Zirconium", 5, 4, "transition-metal"),
  e(41, "Nb", "Niobium", 5, 5, "transition-metal"),
  e(42, "Mo", "Molybdenum", 5, 6, "transition-metal"),
  e(43, "Tc", "Technetium", 5, 7, "transition-metal"),
  e(44, "Ru", "Ruthenium", 5, 8, "transition-metal"),
  e(45, "Rh", "Rhodium", 5, 9, "transition-metal"),
  e(46, "Pd", "Palladium", 5, 10, "transition-metal"),
  e(47, "Ag", "Silver", 5, 11, "transition-metal"),
  e(48, "Cd", "Cadmium", 5, 12, "post-transition"),
  e(49, "In", "Indium", 5, 13, "post-transition"),
  e(50, "Sn", "Tin", 5, 14, "post-transition"),
  e(51, "Sb", "Antimony", 5, 15, "metalloid"),
  e(52, "Te", "Tellurium", 5, 16, "metalloid"),
  e(53, "I", "Iodine", 5, 17, "halogen"),
  e(54, "Xe", "Xenon", 5, 18, "noble-gas"),

  // Period 6 (La in f-block; placeholder at (6,3))
  e(55, "Cs", "Cesium", 6, 1, "alkali-metal"),
  e(56, "Ba", "Barium", 6, 2, "alkaline-earth"),
  // Lanthanides go in row 9, cols 3..17
  e(72, "Hf", "Hafnium", 6, 4, "transition-metal"),
  e(73, "Ta", "Tantalum", 6, 5, "transition-metal"),
  e(74, "W", "Tungsten", 6, 6, "transition-metal"),
  e(75, "Re", "Rhenium", 6, 7, "transition-metal"),
  e(76, "Os", "Osmium", 6, 8, "transition-metal"),
  e(77, "Ir", "Iridium", 6, 9, "transition-metal"),
  e(78, "Pt", "Platinum", 6, 10, "transition-metal"),
  e(79, "Au", "Gold", 6, 11, "transition-metal"),
  e(80, "Hg", "Mercury", 6, 12, "post-transition"),
  e(81, "Tl", "Thallium", 6, 13, "post-transition"),
  e(82, "Pb", "Lead", 6, 14, "post-transition"),
  e(83, "Bi", "Bismuth", 6, 15, "post-transition"),
  e(84, "Po", "Polonium", 6, 16, "post-transition"),
  e(85, "At", "Astatine", 6, 17, "halogen"),
  e(86, "Rn", "Radon", 6, 18, "noble-gas"),

  // Period 7 (Ac in f-block; placeholder at (7,3))
  e(87, "Fr", "Francium", 7, 1, "alkali-metal"),
  e(88, "Ra", "Radium", 7, 2, "alkaline-earth"),
  e(104, "Rf", "Rutherfordium", 7, 4, "transition-metal"),
  e(105, "Db", "Dubnium", 7, 5, "transition-metal"),
  e(106, "Sg", "Seaborgium", 7, 6, "transition-metal"),
  e(107, "Bh", "Bohrium", 7, 7, "transition-metal"),
  e(108, "Hs", "Hassium", 7, 8, "transition-metal"),
  e(109, "Mt", "Meitnerium", 7, 9, "unknown"),
  e(110, "Ds", "Darmstadtium", 7, 10, "unknown"),
  e(111, "Rg", "Roentgenium", 7, 11, "unknown"),
  e(112, "Cn", "Copernicium", 7, 12, "post-transition"),
  e(113, "Nh", "Nihonium", 7, 13, "unknown"),
  e(114, "Fl", "Flerovium", 7, 14, "unknown"),
  e(115, "Mc", "Moscovium", 7, 15, "unknown"),
  e(116, "Lv", "Livermorium", 7, 16, "unknown"),
  e(117, "Ts", "Tennessine", 7, 17, "unknown"),
  e(118, "Og", "Oganesson", 7, 18, "noble-gas"),

  // Lanthanides — row 9, cols 3..17 (15 elements: La..Lu)
  e(57, "La", "Lanthanum", 9, 3, "lanthanide"),
  e(58, "Ce", "Cerium", 9, 4, "lanthanide"),
  e(59, "Pr", "Praseodymium", 9, 5, "lanthanide"),
  e(60, "Nd", "Neodymium", 9, 6, "lanthanide"),
  e(61, "Pm", "Promethium", 9, 7, "lanthanide"),
  e(62, "Sm", "Samarium", 9, 8, "lanthanide"),
  e(63, "Eu", "Europium", 9, 9, "lanthanide"),
  e(64, "Gd", "Gadolinium", 9, 10, "lanthanide"),
  e(65, "Tb", "Terbium", 9, 11, "lanthanide"),
  e(66, "Dy", "Dysprosium", 9, 12, "lanthanide"),
  e(67, "Ho", "Holmium", 9, 13, "lanthanide"),
  e(68, "Er", "Erbium", 9, 14, "lanthanide"),
  e(69, "Tm", "Thulium", 9, 15, "lanthanide"),
  e(70, "Yb", "Ytterbium", 9, 16, "lanthanide"),
  e(71, "Lu", "Lutetium", 9, 17, "lanthanide"),

  // Actinides — row 10, cols 3..17 (15 elements: Ac..Lr)
  e(89, "Ac", "Actinium", 10, 3, "actinide"),
  e(90, "Th", "Thorium", 10, 4, "actinide"),
  e(91, "Pa", "Protactinium", 10, 5, "actinide"),
  e(92, "U", "Uranium", 10, 6, "actinide"),
  e(93, "Np", "Neptunium", 10, 7, "actinide"),
  e(94, "Pu", "Plutonium", 10, 8, "actinide"),
  e(95, "Am", "Americium", 10, 9, "actinide"),
  e(96, "Cm", "Curium", 10, 10, "actinide"),
  e(97, "Bk", "Berkelium", 10, 11, "actinide"),
  e(98, "Cf", "Californium", 10, 12, "actinide"),
  e(99, "Es", "Einsteinium", 10, 13, "actinide"),
  e(100, "Fm", "Fermium", 10, 14, "actinide"),
  e(101, "Md", "Mendelevium", 10, 15, "actinide"),
  e(102, "No", "Nobelium", 10, 16, "actinide"),
  e(103, "Lr", "Lawrencium", 10, 17, "actinide"),
];

export const ELEMENTS_BY_Z: Record<number, ElementDef> = Object.fromEntries(
  ELEMENTS.map((el) => [el.z, el]),
);

// All cells (row, col) that should render an element slot. Other cells in the
// 10x18 grid are gaps in the rendered table.
export const ELEMENT_CELLS: Set<string> = new Set(
  ELEMENTS.map((el) => `${el.row}:${el.col}`),
);

// f-block placeholder cells in the main block (row 6 col 3 and row 7 col 3).
// We render these as static markers, NOT as drop targets.
export const PLACEHOLDER_CELLS: { row: number; col: number; label: string }[] = [
  { row: 6, col: 3, label: "57–71" },
  { row: 7, col: 3, label: "89–103" },
];
