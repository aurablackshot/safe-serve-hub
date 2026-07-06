import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import auraLogo from "@/assets/aura-logo.png";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") ? s.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign In — Aura Panel" },
      { name: "description", content: "Admin sign in for the Aura Panel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const target = next ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (next) window.location.href = next;
        else navigate({ to: "/dashboard" });
      }
    });
  }, [navigate, next]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Authenticated");
    if (next) window.location.href = next;
    else navigate({ to: target });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 -z-10 opacity-30 [background:radial-gradient(circle_at_30%_20%,oklch(0.78_0.18_145/.25),transparent_50%),radial-gradient(circle_at_70%_80%,oklch(0.5_0.18_250/.2),transparent_50%)]" />
      <Card className="w-full max-w-md p-8 border-border/60">
        <div className="flex items-center gap-3 mb-8">
          <img src={auraLogo} alt="Aura" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-mono tracking-tight">Aura Panel</h1>
            <p className="text-xs text-muted-foreground">Admin authentication required</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full font-mono">
            {loading ? "AUTHENTICATING..." : "SIGN IN"}
          </Button>
        </form>
      </Card>
    </div>
  );
}