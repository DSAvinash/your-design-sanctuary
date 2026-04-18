// Rule-based crop disease knowledge base for the Guided Diagnosis Flow MVP.
// Each disease has weighted matchers across symptoms, locations, and spread patterns.
// Confidence is computed by summing matched weights / max possible.

export type SymptomId =
  | "yellowing"
  | "brown_spots"
  | "white_powder"
  | "wilting"
  | "holes"
  | "rotting"
  | "curling"
  | "stunted";

export type LocationId = "leaves" | "stem" | "fruit" | "roots" | "underside";

export type SpreadId = "random" | "uniform" | "edges" | "patches" | "spreading_fast";

export interface Disease {
  id: string;
  name: string;
  type: "fungal" | "bacterial" | "viral" | "nutrient" | "pest" | "abiotic";
  symptoms: Partial<Record<SymptomId, number>>;
  locations: Partial<Record<LocationId, number>>;
  spread: Partial<Record<SpreadId, number>>;
  inspect: string[];
}

export interface Crop {
  id: string;
  name: string;
  emoji: string;
  diseases: Disease[];
}

export const CROPS: Crop[] = [
  {
    id: "tomato",
    name: "Tomato",
    emoji: "🍅",
    diseases: [
      {
        id: "early_blight",
        name: "Early Blight",
        type: "fungal",
        symptoms: { brown_spots: 3, yellowing: 2 },
        locations: { leaves: 3, underside: 1 },
        spread: { patches: 2, spreading_fast: 2 },
        inspect: ["Concentric ring spots on lower leaves", "Yellow halo around lesions"],
      },
      {
        id: "late_blight",
        name: "Late Blight",
        type: "fungal",
        symptoms: { brown_spots: 3, rotting: 2, white_powder: 2 },
        locations: { leaves: 2, fruit: 2, stem: 1 },
        spread: { spreading_fast: 3, patches: 2 },
        inspect: ["White fuzzy growth on leaf underside", "Greasy dark lesions after rain"],
      },
      {
        id: "bacterial_wilt",
        name: "Bacterial Wilt",
        type: "bacterial",
        symptoms: { wilting: 3, stunted: 2 },
        locations: { stem: 2, roots: 2 },
        spread: { random: 2, patches: 2 },
        inspect: ["Cut stem and check for milky ooze in water", "Wilting despite moist soil"],
      },
    ],
  },
  {
    id: "rice",
    name: "Rice / Paddy",
    emoji: "🌾",
    diseases: [
      {
        id: "blast",
        name: "Rice Blast",
        type: "fungal",
        symptoms: { brown_spots: 3, wilting: 1 },
        locations: { leaves: 3, stem: 2 },
        spread: { spreading_fast: 2, patches: 2 },
        inspect: ["Diamond-shaped lesions with grey centers", "Neck rot at panicle base"],
      },
      {
        id: "bacterial_blight",
        name: "Bacterial Leaf Blight",
        type: "bacterial",
        symptoms: { yellowing: 3, wilting: 2 },
        locations: { leaves: 3, edges: 2 } as any,
        spread: { edges: 3, uniform: 1 },
        inspect: ["Yellow lesions starting at leaf tip/edge", "Milky ooze in early morning"],
      },
      {
        id: "nutrient_deficiency",
        name: "Nitrogen Deficiency",
        type: "nutrient",
        symptoms: { yellowing: 3, stunted: 2 },
        locations: { leaves: 2 },
        spread: { uniform: 3 },
        inspect: ["Older leaves yellow first", "Pale uniform color across the field"],
      },
    ],
  },
  {
    id: "wheat",
    name: "Wheat",
    emoji: "🌾",
    diseases: [
      {
        id: "rust",
        name: "Wheat Rust",
        type: "fungal",
        symptoms: { brown_spots: 3, yellowing: 2 },
        locations: { leaves: 3, stem: 2 },
        spread: { spreading_fast: 3, patches: 2 },
        inspect: ["Orange/brown pustules releasing powder when rubbed", "Spread along wind direction"],
      },
      {
        id: "powdery_mildew",
        name: "Powdery Mildew",
        type: "fungal",
        symptoms: { white_powder: 3, yellowing: 1 },
        locations: { leaves: 3 },
        spread: { patches: 2, spreading_fast: 1 },
        inspect: ["White powdery patches on upper leaf surface", "Worse in dense canopy"],
      },
    ],
  },
  {
    id: "cotton",
    name: "Cotton",
    emoji: "☁️",
    diseases: [
      {
        id: "leaf_curl",
        name: "Cotton Leaf Curl Virus",
        type: "viral",
        symptoms: { curling: 3, stunted: 2, yellowing: 1 },
        locations: { leaves: 3 },
        spread: { random: 2, patches: 2 },
        inspect: ["Whiteflies on underside of leaves", "Upward leaf curling and vein thickening"],
      },
      {
        id: "bollworm",
        name: "Bollworm Damage",
        type: "pest",
        symptoms: { holes: 3, rotting: 1 },
        locations: { fruit: 3, leaves: 1 },
        spread: { random: 3 },
        inspect: ["Round holes in bolls", "Frass/droppings near entry holes"],
      },
    ],
  },
  {
    id: "potato",
    name: "Potato",
    emoji: "🥔",
    diseases: [
      {
        id: "late_blight_potato",
        name: "Late Blight",
        type: "fungal",
        symptoms: { brown_spots: 3, rotting: 2, white_powder: 1 },
        locations: { leaves: 3, stem: 1 },
        spread: { spreading_fast: 3, patches: 2 },
        inspect: ["Dark water-soaked lesions", "White fuzz under leaves in humid mornings"],
      },
      {
        id: "early_blight_potato",
        name: "Early Blight",
        type: "fungal",
        symptoms: { brown_spots: 3, yellowing: 2 },
        locations: { leaves: 3 },
        spread: { patches: 2 },
        inspect: ["Target-board concentric rings", "Older leaves affected first"],
      },
    ],
  },
  {
    id: "chilli",
    name: "Chilli",
    emoji: "🌶️",
    diseases: [
      {
        id: "anthracnose",
        name: "Anthracnose / Fruit Rot",
        type: "fungal",
        symptoms: { brown_spots: 3, rotting: 3 },
        locations: { fruit: 3, leaves: 1 },
        spread: { spreading_fast: 2, patches: 2 },
        inspect: ["Sunken dark spots on ripening fruit", "Pinkish spore masses in lesions"],
      },
      {
        id: "thrips",
        name: "Thrips Damage",
        type: "pest",
        symptoms: { curling: 3, stunted: 1 },
        locations: { leaves: 3 },
        spread: { uniform: 2, patches: 2 },
        inspect: ["Upward leaf curling (boat-shape)", "Silvery streaks on leaf surface"],
      },
    ],
  },
  {
    id: "banana",
    name: "Banana",
    emoji: "🍌",
    diseases: [
      {
        id: "panama_wilt",
        name: "Panama Wilt (Fusarium)",
        type: "fungal",
        symptoms: { wilting: 3, yellowing: 3 },
        locations: { leaves: 2, stem: 2, roots: 2 },
        spread: { patches: 3 },
        inspect: ["Yellowing of older leaves first", "Brown discoloration in cut pseudostem"],
      },
      {
        id: "sigatoka",
        name: "Sigatoka Leaf Spot",
        type: "fungal",
        symptoms: { brown_spots: 3, yellowing: 1 },
        locations: { leaves: 3 },
        spread: { spreading_fast: 2, uniform: 1 },
        inspect: ["Streaky brown lesions parallel to veins", "Worse in humid weather"],
      },
    ],
  },
  {
    id: "grape",
    name: "Grape",
    emoji: "🍇",
    diseases: [
      {
        id: "downy_mildew",
        name: "Downy Mildew",
        type: "fungal",
        symptoms: { yellowing: 2, white_powder: 3, brown_spots: 1 },
        locations: { leaves: 3, underside: 3, fruit: 1 },
        spread: { spreading_fast: 2, patches: 2 },
        inspect: ["Oil-spot yellow patches above, white downy growth below", "After rain or heavy dew"],
      },
      {
        id: "powdery_mildew_grape",
        name: "Powdery Mildew",
        type: "fungal",
        symptoms: { white_powder: 3 },
        locations: { leaves: 3, fruit: 2 },
        spread: { patches: 2 },
        inspect: ["White powdery coating on upper surface", "Cracked/scarred berries"],
      },
    ],
  },
  {
    id: "maize",
    name: "Maize / Corn",
    emoji: "🌽",
    diseases: [
      {
        id: "fall_armyworm",
        name: "Fall Armyworm",
        type: "pest",
        symptoms: { holes: 3, rotting: 1 },
        locations: { leaves: 3, stem: 1 },
        spread: { random: 3 },
        inspect: ["Window-pane feeding and ragged holes", "Frass in leaf whorl"],
      },
      {
        id: "leaf_blight_maize",
        name: "Northern Leaf Blight",
        type: "fungal",
        symptoms: { brown_spots: 3, yellowing: 1 },
        locations: { leaves: 3 },
        spread: { spreading_fast: 2, patches: 1 },
        inspect: ["Long cigar-shaped grey-green lesions", "Spreads upward from lower leaves"],
      },
    ],
  },
  {
    id: "onion",
    name: "Onion",
    emoji: "🧅",
    diseases: [
      {
        id: "purple_blotch",
        name: "Purple Blotch",
        type: "fungal",
        symptoms: { brown_spots: 3, yellowing: 1 },
        locations: { leaves: 3 },
        spread: { spreading_fast: 2 },
        inspect: ["Purple-brown sunken lesions with yellow halo", "Tip dieback after rain"],
      },
      {
        id: "thrips_onion",
        name: "Onion Thrips",
        type: "pest",
        symptoms: { curling: 2, stunted: 2 },
        locations: { leaves: 3 },
        spread: { uniform: 2, patches: 2 },
        inspect: ["Silver streaks and white blotches on leaves", "Tiny yellow insects in leaf base"],
      },
    ],
  },
];

export interface DiagnosisAnswers {
  cropId: string;
  symptoms: SymptomId[];
  locations: LocationId[];
  spread: SpreadId | null;
  notes?: string;
  scanContext?: {
    disease: string;
    confidence: number;
    severity: string;
  } | null;
}

export interface RankedDisease {
  disease: Disease;
  probability: number;
  confidenceLabel: "Low" | "Medium" | "High";
}

export function rankDiseases(answers: DiagnosisAnswers): RankedDisease[] {
  const crop = CROPS.find((c) => c.id === answers.cropId);
  if (!crop) return [];

  const ranked = crop.diseases.map((disease) => {
    let score = 0;
    let max = 0;

    for (const [key, weight] of Object.entries(disease.symptoms)) {
      max += weight as number;
      if (answers.symptoms.includes(key as SymptomId)) score += weight as number;
    }
    for (const [key, weight] of Object.entries(disease.locations)) {
      max += weight as number;
      if (answers.locations.includes(key as LocationId)) score += weight as number;
    }
    if (answers.spread) {
      for (const [key, weight] of Object.entries(disease.spread)) {
        max += weight as number;
        if (answers.spread === (key as SpreadId)) score += weight as number;
      }
    }

    // Boost if scan context disease name overlaps
    if (answers.scanContext?.disease) {
      const a = answers.scanContext.disease.toLowerCase();
      if (a.includes(disease.name.toLowerCase()) || disease.name.toLowerCase().includes(a.split(" ")[0])) {
        score += 4;
        max += 4;
      }
    }

    const probability = max > 0 ? Math.round((score / max) * 100) : 0;
    const confidenceLabel: RankedDisease["confidenceLabel"] =
      probability >= 70 ? "High" : probability >= 45 ? "Medium" : "Low";

    return { disease, probability, confidenceLabel };
  });

  return ranked.sort((a, b) => b.probability - a.probability);
}

export const SYMPTOM_OPTIONS: { id: SymptomId; label: string; icon: string }[] = [
  { id: "yellowing", label: "Yellowing", icon: "wb_sunny" },
  { id: "brown_spots", label: "Brown / dark spots", icon: "scatter_plot" },
  { id: "white_powder", label: "White powder / fuzz", icon: "ac_unit" },
  { id: "wilting", label: "Wilting", icon: "water_drop" },
  { id: "holes", label: "Holes / chewed", icon: "bug_report" },
  { id: "rotting", label: "Rotting / soft tissue", icon: "sick" },
  { id: "curling", label: "Leaf curling", icon: "all_inclusive" },
  { id: "stunted", label: "Stunted growth", icon: "trending_down" },
];

export const LOCATION_OPTIONS: { id: LocationId; label: string; icon: string }[] = [
  { id: "leaves", label: "Leaves", icon: "eco" },
  { id: "underside", label: "Leaf underside", icon: "flip" },
  { id: "stem", label: "Stem", icon: "park" },
  { id: "fruit", label: "Fruit / pods", icon: "nutrition" },
  { id: "roots", label: "Roots", icon: "grass" },
];

export const SPREAD_OPTIONS: { id: SpreadId; label: string; icon: string }[] = [
  { id: "random", label: "Random / scattered", icon: "shuffle" },
  { id: "uniform", label: "Uniform across field", icon: "view_module" },
  { id: "edges", label: "Starts at edges/tips", icon: "border_outer" },
  { id: "patches", label: "In patches", icon: "dashboard" },
  { id: "spreading_fast", label: "Spreading fast", icon: "trending_up" },
];
