import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — ADT Mecanismo X" },
      { name: "description", content: "Seus pacientes e avaliações posturais." },
      { property: "og:title", content: "Pacientes — ADT Mecanismo X" },
      { property: "og:description", content: "Seus pacientes e avaliações posturais." },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [complaint, setComplaint] = useState("");
  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id,name,complaint,created_at,assessments(id,status,created_at)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { data: p, error } = await supabase.from("patients").insert({ name, complaint: complaint || null }).select().single();
    if (error) return toast.error(error.message);
    const { data: a, error: aErr } = await supabase.from("assessments").insert({ patient_id: p.id }).select().single();
    if (aErr) return toast.error(aErr.message);
    qc.invalidateQueries({ queryKey: ["patients"] });
    navigate({ to: "/avaliacao/$id", params: { id: a.id } });
  }

  async function newAssessment(patientId: string) {
    const { data: a, error } = await supabase.from("assessments").insert({ patient_id: patientId }).select().single();
    if (error) return toast.error(error.message);
    navigate({ to: "/avaliacao/$id", params: { id: a.id } });
  }

  return (
    <AppShell>
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <section>
          <h1 className="text-4xl">Pacientes</h1>
          <div className="mt-6 space-y-3">
            {patients?.length === 0 && <p className="text-muted-foreground">Nenhum paciente ainda. Cadastre o primeiro ao lado.</p>}
            {patients?.map((p) => (
              <Card key={p.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl">{p.name}</h3>
                    {p.complaint && <p className="text-sm text-muted-foreground">Queixa: {p.complaint}</p>}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => newAssessment(p.id)}>
                    Nova avaliação
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...(p.assessments ?? [])]
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .map((a) => (
                      <Link
                        key={a.id}
                        to="/avaliacao/$id"
                        params={{ id: a.id }}
                        className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
                      >
                        {new Date(a.created_at).toLocaleDateString("pt-BR")} · {a.status === "analyzed" ? "analisada" : "rascunho"}
                      </Link>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        </section>
        <Card className="h-fit p-6">
          <form onSubmit={create} className="space-y-4">
            <h2 className="text-2xl">Novo paciente</h2>
            <div className="space-y-2">
              <Label htmlFor="n">Nome</Label>
              <Input id="n" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c">Queixa principal</Label>
              <Textarea id="c" value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Ex.: dor na cervical" />
            </div>
            <Button type="submit" className="w-full">Cadastrar e iniciar avaliação</Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
