import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PHOTO_SLOTS, VIEW_LABEL, type View } from "./mecanismo-x";

export const analyzeAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { assessmentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: media, error } = await supabase
      .from("assessment_media")
      .select("view,label,storage_path,kind")
      .eq("assessment_id", data.assessmentId)
      .eq("kind", "photo");
    if (error) throw new Error(error.message);
    if (!media?.length) throw new Error("Envie ao menos uma foto antes de analisar.");

    const { data: signed, error: sErr } = await supabase.storage
      .from("avaliacoes")
      .createSignedUrls(media.map((m) => m.storage_path), 60 * 30);
    if (sErr || !signed) throw new Error(sErr?.message ?? "Falha ao acessar as fotos.");

    const photos = media.map((m, i) => ({
      url: signed[i]?.signedUrl ?? "",
      label: `${VIEW_LABEL[m.view as View]} – ${PHOTO_SLOTS.find((s) => s.key === m.label)?.label ?? m.label}`,
    }));

    if (photos.some((p) => !p.url)) throw new Error("Falha ao acessar as fotos.");
    const { analyzePhotos } = await import("./analyze.server");
    const result = await analyzePhotos(photos);

    const { error: uErr } = await supabase
      .from("assessments")
      .update({ result: result as never, status: "analyzed", analyzed_at: new Date().toISOString() })
      .eq("id", data.assessmentId);
    if (uErr) throw new Error(uErr.message);
    return result;
  });
