import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, LogOut, RotateCcw, Ban, Clock, Shield, Trash2, Upload, Package } from "lucide-react";
import { PRODUCTS, DURATIONS, computeExpiresAt, type DurationValue } from "@/lib/products";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — HWID Licensing" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

type Customer = {
  id: string;
  name: string;
  hwid: string;
  product: string;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setCustomers(data as Customer[]);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      await load();
      if (mounted) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login" });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, load]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const setDuration = async (c: Customer, value: DurationValue) => {
    const expires_at = computeExpiresAt(value);
    const { error } = await supabase
      .from("customers")
      .update({ expires_at, revoked: false })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Duration updated");
    load();
  };

  const toggleRevoke = async (c: Customer) => {
    const { error } = await supabase
      .from("customers")
      .update({ revoked: !c.revoked })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(c.revoked ? "Access restored" : "Access revoked");
    load();
  };

  const remove = async (c: Customer) => {
    if (!confirm(`Delete customer ${c.name}?`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/30 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Shield className="size-4" />
            </div>
            <div>
              <h1 className="font-mono text-sm tracking-tight">HWID://CONSOLE</h1>
              <p className="text-xs text-muted-foreground">Licensing dashboard</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Customers</h2>
            <p className="text-sm text-muted-foreground">
              {customers.length} active licen{customers.length === 1 ? "se" : "ses"}
            </p>
          </div>
          <AddCustomerDialog open={addOpen} onOpenChange={setAddOpen} onAdded={load} />
        </div>

        <Card className="overflow-hidden border-border/60">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No customers yet. Click <span className="text-foreground">Add customer</span> to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>HWID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <CustomerRow
                    key={c.id}
                    c={c}
                    onSetDuration={setDuration}
                    onToggleRevoke={toggleRevoke}
                    onDelete={remove}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <div className="mt-12 mb-6">
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Package className="size-5" /> App versions
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload a new build per product. Clients auto-download on next run.
          </p>
        </div>
        <VersionsPanel />
      </main>
    </div>
  );
}

function statusOf(c: Customer): { label: string; tone: "ok" | "warn" | "bad" } {
  if (c.revoked) return { label: "Revoked", tone: "bad" };
  if (c.expires_at && new Date(c.expires_at) < new Date())
    return { label: "Expired", tone: "bad" };
  if (!c.expires_at) return { label: "Lifetime", tone: "ok" };
  return { label: "Active", tone: "ok" };
}

function CustomerRow({
  c,
  onSetDuration,
  onToggleRevoke,
  onDelete,
}: {
  c: Customer;
  onSetDuration: (c: Customer, v: DurationValue) => void;
  onToggleRevoke: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}) {
  const st = statusOf(c);
  return (
    <TableRow>
      <TableCell className="font-medium">{c.name}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
        {c.hwid}
      </TableCell>
      <TableCell>{c.product}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={
            st.tone === "ok"
              ? "border-primary/40 text-primary"
              : st.tone === "warn"
              ? "border-yellow-500/40 text-yellow-500"
              : "border-destructive/40 text-destructive"
          }
        >
          {st.label}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <Select onValueChange={(v) => onSetDuration(c, v as DurationValue)}>
            <SelectTrigger className="w-[130px] h-8">
              <Clock className="size-3 mr-1" />
              <SelectValue placeholder="Set duration" />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={c.revoked ? "outline" : "secondary"}
            size="sm"
            onClick={() => onToggleRevoke(c)}
          >
            {c.revoked ? (
              <>
                <RotateCcw className="size-3 mr-1" /> Restore
              </>
            ) : (
              <>
                <Ban className="size-3 mr-1" /> Revoke
              </>
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(c)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function AddCustomerDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [hwid, setHwid] = useState("");
  const [product, setProduct] = useState<string>(PRODUCTS[0]);
  const [duration, setDuration] = useState<DurationValue>("30d");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setHwid("");
    setProduct(PRODUCTS[0]);
    setDuration("30d");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !hwid.trim()) return toast.error("Name and HWID required");
    setSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("customers").insert({
      name: name.trim(),
      hwid: hwid.trim(),
      product,
      expires_at: computeExpiresAt(duration),
      created_by: userData.user?.id,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Customer added");
    reset();
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="font-mono">
          <Plus className="size-4 mr-2" /> Add customer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hwid">HWID / UUID</Label>
            <Input
              id="hwid"
              className="font-mono"
              value={hwid}
              onChange={(e) => setHwid(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={(v) => setDuration(v as DurationValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting} className="font-mono">
              {submitting ? "SUBMITTING..." : "SUBMIT"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type AppVersion = {
  id: string;
  product: string;
  version: string;
  file_url: string | null;
  file_path: string | null;
  updated_at: string;
};

function VersionsPanel() {
  const [versions, setVersions] = useState<Record<string, AppVersion>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("app_versions").select("*");
    if (error) return toast.error(error.message);
    const map: Record<string, AppVersion> = {};
    (data as AppVersion[]).forEach((v) => (map[v.product] = v));
    setVersions(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card className="p-8 text-center text-muted-foreground border-border/60">
        Loading…
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PRODUCTS.map((p) => (
            <VersionRow key={p} product={p} version={versions[p]} onChanged={load} />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function VersionRow({
  product,
  version,
  onChanged,
}: {
  product: string;
  version: AppVersion | undefined;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [versionStr, setVersionStr] = useState(version?.version ?? "1.0.0");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionStr.trim()) return toast.error("Version required");
    setBusy(true);
    try {
      let file_url = version?.file_url ?? null;
      let file_path = version?.file_path ?? null;

      if (file) {
        const ext = file.name.split(".").pop() || "ahk";
        const path = `${product.replace(/\s+/g, "_")}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("releases")
          .upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("releases").getPublicUrl(path);
        file_url = pub.publicUrl;
        file_path = path;
      }

      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        product,
        version: versionStr.trim(),
        file_url,
        file_path,
        updated_by: userData.user?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("app_versions")
        .upsert(payload, { onConflict: "product" });
      if (error) throw error;
      toast.success(`${product} updated to v${versionStr}`);
      setOpen(false);
      setFile(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{product}</TableCell>
      <TableCell className="font-mono">
        {version ? (
          <Badge variant="outline" className="border-primary/40 text-primary">
            v{version.version}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell>
        {version?.file_url ? (
          <a
            href={version.file_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline truncate max-w-[260px] inline-block"
          >
            {version.file_path ?? "download"}
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">no file</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {version ? new Date(version.updated_at).toLocaleString() : "—"}
      </TableCell>
      <TableCell className="text-right">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary">
              <Upload className="size-3 mr-1" /> {version ? "Update" : "Publish"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish new version — {product}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`v-${product}`}>Version</Label>
                <Input
                  id={`v-${product}`}
                  className="font-mono"
                  value={versionStr}
                  onChange={(e) => setVersionStr(e.target.value)}
                  placeholder="1.2.0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`f-${product}`}>File (.ahk or .exe)</Label>
                <Input
                  id={`f-${product}`}
                  type="file"
                  accept=".ahk,.exe,.zip"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to only bump the version number.
                </p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy} className="font-mono">
                  {busy ? "UPLOADING..." : "PUBLISH"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}