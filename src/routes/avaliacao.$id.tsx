import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { analyzeAssessment } from "@/lib/analyze.functions";
import {
  DYSFUNCTION_BY_ID,
  PHOTO_SLOTS,
  VIDEO_SLOTS,
  VIEW_LABEL,
  type AnalysisResult,
  type View,
} from "@/lib/mecanismo-x";

export const Route = createFileRoute("/avaliacao/$id")({
  head: () => ({
    meta: [
      { title: "Avaliação postural — ADT Mecanismo X" },
      { name: "description", content: "Fotos, vídeos e as 5 maiores aberrações do paciente." },
      { property: "og:title", content: "Avaliação postural — ADT Mecanismo X" },
      { property: "og:description", content: "Fotos, vídeos e as 5 maiores aberrações do paciente." },
    ],
  }),
  component: Page,
});

type Media = { id: string; kind: string; view: string; label: string | null; storage_path: string; url?: string };

function Page() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeAssessment);
  const [analyzing, setAnalyzing] = useState(false);
  const [lines, setLines] = useState(true);

  const { data: assessment } = useQuery({
    queryKey: ["assessment", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessments").select("*, patients(name,complaint)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: media } = useQuery({
    queryKey: ["media", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_media").select("*").eq("assessment_id", id);
      if (error) throw error;
      if (!data.length) return [] as Media[];
      const { data: signed } = await supabase.storage.from("avaliacoes").createSignedUrls(data.map((m) => m.storage_path), 3600);
      return data.map((m, i) => ({ ...m, url: signed?.[i]?.signedUrl })) as Media[];
    },
  });

  const byLabel = new Map((media ?? []).map((m) => [m.label, m]));
  const photoCount = (media ?? []).filter((m) => m.kind === "photo").length;
  const result = assessment?.result as AnalysisResult | null;

  async function upload(file: File, slot: string, kind: "photo" | "video", view: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${u.user.id}/${id}/${slot}-${Date.now()}.${ext}`;
    const t = toast.loading("Enviando…");
    const { error } = await supabase.storage.from("avaliacoes").upload(path, file, { contentType: file.type });
    if (error) return toast.error(error.message, { id: t });
    const old = byLabel.get(slot);
    if (old) {
      await supabase.from("assessment_media").delete().eq("id", old.id);
      await supabase.storage.from("avaliacoes").remove([old.storage_path]);
    }
    const { error: e2 } = await supabase
      .from("assessment_media")
      .insert({ assessment_id: id, kind, view, label: slot, storage_path: path, mime_type: file.type });
    if (e2) return toast.error(e2.message, { id: t });
    toast.success("Enviado", { id: t });
    qc.invalidateQueries({ queryKey: ["media", id] });
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      await analyze({ data: { assessmentId: id } });
      qc.invalidateQueries({ queryKey: ["assessment", id] });
      toast.success("Análise concluída");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na análise");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <AppShell>
      <Link to="/pacientes" className="text-sm text-muted-foreground hover:underline">← Pacientes</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">{assessment?.patients?.name}</h1>
          {assessment?.patients?.complaint && <p className="text-muted-foreground">Queixa: {assessment.patients.complaint}</p>}
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={lines} onCheckedChange={setLines} /> Linhas de avaliação
          </label>
          <Button size="lg" onClick={runAnalysis} disabled={analyzing || photoCount === 0}>
            {analyzing ? "Analisando… (pode levar 1-2 min)" : result ? "Analisar novamente" : `Analisar ${photoCount} foto(s)`}
          </Button>
        </div>
      </div>

      {result && <Results result={result} />}

      {(["anterior", "posterior", "lateral"] as View[]).map((view) => (
        <section key={view} className="mt-10">
          <h2 className="text-2xl">{VIEW_LABEL[view]}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {PHOTO_SLOTS.filter((s) => s.view === view).map((s) => (
              <Slot key={s.key} label={s.label} media={byLabel.get(s.key)} lines={lines} accept="image/*"
                onFile={(f) => upload(f, s.key, "photo", view)} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="text-2xl">Vídeos de comprovação</h2>
        <p className="text-sm text-muted-foreground">Os vídeos ficam guardados para sua conferência; a análise automática usa as fotos.</p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {VIDEO_SLOTS.map((s) => (
            <Slot key={s.key} label={s.label} media={byLabel.get(s.key)} lines={false} accept="video/*"
              onFile={(f) => upload(f, s.key, "video", "video")} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Slot({ label, media, lines, accept, onFile }: {
  label: string; media?: Media; lines: boolean; accept: string; onFile: (f: File) => void;
}) {
  return (
    <label className="group block cursor-pointer">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border-2 border-dashed bg-muted transition group-hover:border-primary">
        {media?.url ? (
          media.kind === "video" ? (
            <video src={media.url} className="h-full w-full object-cover" controls />
          ) : (
            <>
              <img src={media.url} alt={label} className="h-full w-full object-contain" />
              {lines && <GuideLines />}
            </>
          )
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">+</div>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      <input type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  );
}

// Linhas principais: prumo central + horizontais de referência.
function GuideLines() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--guide-line)" strokeWidth="0.25" />
      ))}
      <line x1="50" x2="50" y1="0" y2="100" stroke="var(--guide-line)" strokeWidth="0.6" strokeDasharray="2 1.5" />
    </svg>
  );
}

function severityClass(s: number) {
  return s >= 7 ? "bg-severity-high" : s >= 4 ? "bg-severity-mid" : "bg-severity-low";
}

function Results({ result }: { result: AnalysisResult }) {
  return (
    <section className="mt-8">
      <Card className="p-6">
        <h2 className="text-2xl">As 5 maiores aberrações</h2>
        <p className="mt-2 text-muted-foreground">{result.summary}</p>
        <ol className="mt-6 space-y-4">
          {result.top5.map((f, i) => {
            const d = DYSFUNCTION_BY_ID.get(f.dysfunction_id);
            return (
              <li key={f.dysfunction_id} className="rounded-lg border p-4">
                <div className="flex items-start gap-4">
                  <span className="font-display text-3xl text-primary">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg">{d?.segment}: {d?.label}</h3>
                      <span className="text-xs text-muted-foreground">{d && VIEW_LABEL[d.view]}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded bg-muted">
                      <div className={`h-full rounded ${severityClass(f.severity)}`} style={{ width: `${f.severity * 10}%` }} />
                    </div>
                    <p className="mt-3 text-sm">{f.rationale}</p>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      <div><dt className="font-semibold">Cadeia miofascial</dt><dd className="text-muted-foreground">{f.myofascial_chain}</dd></div>
                      <div><dt className="font-semibold">Investigar</dt><dd className="text-muted-foreground">{f.structures_to_investigate}</dd></div>
                      <div><dt className="font-semibold">Rota de toque</dt><dd className="text-muted-foreground">{f.release_route}</dd></div>
                    </dl>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {result.other_findings.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg">Outros achados</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {result.other_findings.filter((o) => DYSFUNCTION_BY_ID.has(o.dysfunction_id)).map((o) => {
                const d = DYSFUNCTION_BY_ID.get(o.dysfunction_id)!;
                return <li key={o.dysfunction_id}>• {d.segment}: {d.label} — <span className="text-muted-foreground">{o.evidence}</span></li>;
              })}
            </ul>
          </div>
        )}
        {result.image_quality_notes && <p className="mt-6 text-xs text-muted-foreground">Qualidade das fotos: {result.image_quality_notes}</p>}
        <p className="mt-2 text-xs text-muted-foreground">Sugestão de apoio. Confirme com sua avaliação manual.</p>
      </Card>
    </section>
  );
}
