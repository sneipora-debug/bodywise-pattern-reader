// Catálogo oficial de disfunções da ADT (Avaliação do Todo) – Mecanismo X.
// A IA só pode apontar itens desta lista.

export type View = "anterior" | "posterior" | "lateral";

export type Dysfunction = { id: string; view: View; segment: string; label: string };

const d = (view: View, segment: string, labels: string[]): Dysfunction[] =>
  labels.map((label, i) => ({
    id: `${view}.${segment.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}.${i + 1}`,
    view,
    segment,
    label,
  }));

export const DYSFUNCTIONS: Dysfunction[] = [
  ...d("anterior", "Clavícula", ['Perna em "V" para a direita', 'Perna em "V" para a esquerda']),
  ...d("anterior", "Tronco", [
    '"Bigode do umbigo" desviado para a direita',
    '"Bigode do umbigo" desviado para a esquerda',
    "Ventre desviado para a direita",
    "Ventre desviado para a esquerda",
    "Lateral do tronco mais baixa à direita",
    "Lateral do tronco mais baixa à esquerda",
  ]),
  ...d("anterior", "Pélvis", ["Pélvis mais alta à direita", "Pélvis mais alta à esquerda"]),
  ...d("anterior", "Joelhos", [
    "Ângulo inferior da patela desviado lateralmente à direita",
    "Ângulo inferior da patela desviado lateralmente à esquerda",
    "Ângulo inferior da patela desviado medialmente à direita",
    "Ângulo inferior da patela desviado medialmente à esquerda",
  ]),
  ...d("anterior", "Pés", [
    "Pé pronado (queda do arco medial)",
    "Pé supinado (elevação do arco medial)",
    "Pé em rotação externa",
    "Pé em rotação interna",
    "Pés desiguais em apoio (mais carga em um lado)",
  ]),
  ...d("anterior", "Pé", [
    "Arco medial direito elevado",
    "Arco medial esquerdo elevado",
    "Arco medial direito desabado",
    "Arco medial esquerdo desabado",
    "Primeiro metatarso direito girado ou elevado",
    "Primeiro metatarso esquerdo girado ou elevado",
  ]),
  ...d("anterior", "Mão", [
    "Mão direita voltada para trás",
    "Mão esquerda voltada para trás",
    "Mão direita voltada para frente ou indicação de tórax forçado para trás",
    "Mão esquerda voltada para frente ou indicação de tórax forçado para trás",
  ]),
  ...d("posterior", "Lombar", ['"C" aberta para a direita', '"C" aberta para a esquerda']),
  ...d("posterior", "Torácica", ['"C" aberta para a direita', '"C" aberta para a esquerda']),
  ...d("posterior", "Cervical", ['"C" aberta para a direita', '"C" aberta para a esquerda']),
  ...d("lateral", "Cabeça", [
    "Anteriorização à direita",
    "Anteriorização à esquerda",
    "Anteriorização bilateral",
  ]),
  ...d("lateral", "Ombro", ["Úmero anteriorizado direito", "Úmero anteriorizado esquerdo"]),
  ...d("lateral", "Pélvis", [
    "Inclinada anterior em relação ao fêmur direito",
    "Inclinada anterior em relação ao fêmur esquerdo",
    "Inclinada posterior em relação ao fêmur direito",
    "Inclinada posterior em relação ao fêmur esquerdo",
  ]),
  ...d("lateral", "Tornozelo", [
    "Ângulo > 90° entre tíbia e pé direito (flexão plantar)",
    "Ângulo > 90° entre tíbia e pé esquerdo (flexão plantar)",
    "Ângulo < 90° entre tíbia e pé direito (dorsiflexão)",
    "Ângulo < 90° entre tíbia e pé esquerdo (dorsiflexão)",
  ]),
];

export const DYSFUNCTION_BY_ID = new Map(DYSFUNCTIONS.map((x) => [x.id, x]));

export const VIEW_LABEL: Record<View, string> = {
  anterior: "Vista anterior",
  posterior: "Vista posterior",
  lateral: "Vista lateral",
};

// Protocolo provisório de 16 fotos + 5 vídeos (ajustar ao protocolo oficial).
export const PHOTO_SLOTS: { key: string; view: View; label: string }[] = [
  { key: "a1", view: "anterior", label: "Corpo inteiro" },
  { key: "a2", view: "anterior", label: "Tronco e clavículas" },
  { key: "a3", view: "anterior", label: "Pélvis e joelhos" },
  { key: "a4", view: "anterior", label: "Pés (apoio)" },
  { key: "a5", view: "anterior", label: "Arco medial / metatarsos" },
  { key: "a6", view: "anterior", label: "Mãos" },
  { key: "p1", view: "posterior", label: "Corpo inteiro" },
  { key: "p2", view: "posterior", label: "Coluna lombar" },
  { key: "p3", view: "posterior", label: "Coluna torácica" },
  { key: "p4", view: "posterior", label: "Coluna cervical" },
  { key: "p5", view: "posterior", label: "Pés e calcâneos" },
  { key: "l1", view: "lateral", label: "Lado direito – corpo inteiro" },
  { key: "l2", view: "lateral", label: "Lado esquerdo – corpo inteiro" },
  { key: "l3", view: "lateral", label: "Cabeça e ombro direito" },
  { key: "l4", view: "lateral", label: "Cabeça e ombro esquerdo" },
  { key: "l5", view: "lateral", label: "Tornozelos" },
];

export const VIDEO_SLOTS = [1, 2, 3, 4, 5].map((n) => ({ key: `v${n}`, label: `Vídeo ${n}` }));

export type TopFinding = {
  dysfunction_id: string;
  severity: number;
  rationale: string;
  myofascial_chain: string;
  structures_to_investigate: string;
  release_route: string;
};

export type AnalysisResult = {
  summary: string;
  top5: TopFinding[];
  other_findings: { dysfunction_id: string; severity: number; evidence: string }[];
  image_quality_notes: string;
};

/** Ordena por maior desvio visível e mantém só itens válidos do catálogo. */
export function rankTop5(items: TopFinding[]): TopFinding[] {
  const seen = new Set<string>();
  return items
    .filter((i) => DYSFUNCTION_BY_ID.has(i.dysfunction_id))
    .map((i) => ({ ...i, severity: Math.max(0, Math.min(10, Math.round(i.severity))) }))
    .sort((a, b) => b.severity - a.severity)
    .filter((i) => (seen.has(i.dysfunction_id) ? false : (seen.add(i.dysfunction_id), true)))
    .slice(0, 5);
}
