import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ADT Mecanismo X — Avaliação postural por fotos" },
      { name: "description", content: "Envie as fotos do paciente e receba as 5 maiores aberrações posturais com a cadeia miofascial a liberar." },
      { property: "og:title", content: "ADT Mecanismo X — Avaliação postural por fotos" },
      { property: "og:description", content: "As 5 maiores aberrações posturais e a rota de liberação miofascial, a partir das fotos do paciente." },
    ],
  }),
  component: Index,
});

function Index() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/pacientes" });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("E-mail ou senha incorretos.");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
      else toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Não foi possível entrar com Google.");
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="bg-hero relative flex flex-col justify-between overflow-hidden p-10 text-primary-foreground lg:p-16">
        <svg aria-hidden className="absolute inset-0 h-full w-full opacity-25" preserveAspectRatio="none">
          {[...Array(9)].map((_, i) => (
            <line key={i} x1="0" x2="100%" y1={`${(i + 1) * 10}%`} y2={`${(i + 1) * 10}%`} stroke="currentColor" strokeWidth="0.5" />
          ))}
          <line x1="50%" x2="50%" y1="0" y2="100%" stroke="var(--guide-line)" strokeWidth="1.5" strokeDasharray="6 6" />
        </svg>
        <p className="relative text-sm font-semibold uppercase tracking-[0.25em]">Mecanismo X · ADT</p>
        <div className="relative max-w-lg">
          <h1 className="text-5xl leading-tight lg:text-6xl">Encontre o ponto certo, não só o ponto da dor.</h1>
          <p className="mt-6 text-lg opacity-85">
            Envie as fotos do paciente e receba as 5 maiores aberrações posturais, a cadeia miofascial envolvida e por onde começar a liberação.
          </p>
        </div>
        <p className="relative text-xs opacity-70">Ferramenta de apoio à avaliação. Não substitui diagnóstico médico.</p>
      </section>

      <section className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <h2 className="text-3xl">{mode === "in" ? "Entrar" : "Criar conta"}</h2>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Senha</Label>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "in" ? "Entrar" : "Criar conta"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={google}>
            Continuar com Google
          </Button>
          <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Não tem conta? Criar agora" : "Já tenho conta"}
          </button>
        </form>
      </section>
    </main>
  );
}
