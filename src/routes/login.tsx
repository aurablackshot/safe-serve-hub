import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — HWID Licensing" },
      { name: "description", content: "Admin sign in for the HWID licensing console." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

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
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 -z-10 opacity-30 [background:radial-gradient(circle_at_30%_20%,oklch(0.78_0.18_145/.25),transparent_50%),radial-gradient(circle_at_70%_80%,oklch(0.5_0.18_250/.2),transparent_50%)]" />
      <Card className="w-full max-w-md p-8 border-border/60">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Shield className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-mono tracking-tight">HWID://CONSOLE</h1>
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
          <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/40">
            Registration is disabled. Accounts are provisioned by the system.
          </p>
        </form>
      </Card>
    </div>
  );
}