import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { DYSFUNCTIONS, rankTop5, type AnalysisResult } from "./mecanismo-x";

const schema = z.object({
  summary: z.string(),
  top5: z.array(
    z.object({
      dysfunction_id: z.string(),
      severity: z.number(),
      rationale: z.string(),
      myofascial_chain: z.string(),
      structures_to_investigate: z.string(),
      release_route: z.string(),
    }),
  ),
  other_findings: z.array(
    z.object({ dysfunction_id: z.string(), severity: z.number(), evidence: z.string() }),
  ),
  image_quality_notes: z.string(),
});

const catalog = DYSFUNCTIONS.map((x) => `${x.id} | ${x.segment} | ${x.label}`).join("\n");

const INSTRUCTIONS = `Você é um assistente de avaliação postural estática do método Mecanismo X (Liberação Miofascial Restaurativa, Prof. Ronaldo Sanches), etapa ADT – Avaliação do Todo.
Analise as fotos (vistas anterior, posterior e lateral) usando linhas de referência mentais (linha de prumo, horizontais de ombros, clavículas, cristas ilíacas, patelas, maléolos) para encontrar assimetrias, desvios e rotações.
REGRAS:
- Só use disfunções do CATÁLOGO abaixo, referenciando o id exato.
- Escolha as 5 maiores aberrações pelo MAIOR DESVIO VISÍVEL (severity 0-10). Se houver menos de 5 evidentes, retorne menos.
- Para cada uma, explique a compensação em cadeia e, com base nos Trilhos Anatômicos de Thomas Myers, indique a cadeia/linha miofascial envolvida, as estruturas a investigar (ex.: mão voltada para trás = rotação interna do braço → investigar subescapular) e a rota de toque / região a abordar primeiro.
- Liste outras disfunções observadas em other_findings.
- Seja honesto sobre a qualidade das fotos em image_quality_notes. Não faça diagnóstico médico.
- Responda em português do Brasil.
CATÁLOGO (id | segmento | disfunção):
${catalog}`;

export async function analyzePhotos(
  photos: { url: string; label: string }[],
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Chave da IA não configurada.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  const content: Array<{ type: "text"; text: string } | { type: "image"; image: URL }> = [];
  for (const p of photos) {
    content.push({ type: "text", text: `Foto: ${p.label}` });
    content.push({ type: "image", image: new URL(p.url) });
  }

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content }],
    output: Output.object({ schema }),
    abortSignal: signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  try {
    const out = await result.output;
    return { ...out, top5: rankTop5(out.top5) };
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) throw new Error("A IA não retornou uma análise válida. Tente novamente.");
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos para continuar.");
    if (status === 429) throw new Error("Muitas análises ao mesmo tempo. Aguarde um minuto e tente de novo.");
    throw e;
  }
}
