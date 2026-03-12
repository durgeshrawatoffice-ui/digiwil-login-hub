import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Globe, Eye, Copy, Trash2, FileText, ExternalLink } from "lucide-react";

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  headline: string;
  description: string | null;
  button_text: string;
  fields: string[];
  thank_you_message: string | null;
  is_published: boolean;
  submissions_count: number;
  created_at: string;
}

interface Submission {
  id: string;
  data: Record<string, string>;
  created_at: string;
}

export function LandingPageBuilder() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", headline: "Get in Touch", description: "", button_text: "Submit", thank_you_message: "Thank you!" });
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(["name", "email", "phone"]));
  const [previewPage, setPreviewPage] = useState<LandingPage | null>(null);
  const [viewSubmissions, setViewSubmissions] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const availableFields = ["name", "email", "phone", "company", "message", "website", "budget"];

  useEffect(() => { loadPages(); }, []);

  const loadPages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("landing_pages").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setPages(data.map(p => ({ ...p, fields: Array.isArray(p.fields) ? p.fields as string[] : ["name", "email", "phone"] })));
  };

  const createPage = async () => {
    if (!form.title.trim() || !form.slug.trim()) { toast.error("Title and slug are required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const slug = form.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

    const { error } = await supabase.from("landing_pages").insert({
      user_id: user.id,
      title: form.title,
      slug,
      headline: form.headline,
      description: form.description || null,
      button_text: form.button_text,
      fields: Array.from(selectedFields),
      thank_you_message: form.thank_you_message,
    });

    if (error) {
      if (error.code === "23505") toast.error("Slug already exists");
      else toast.error("Failed to create");
      return;
    }
    toast.success("Landing page created");
    setCreating(false);
    setForm({ title: "", slug: "", headline: "Get in Touch", description: "", button_text: "Submit", thank_you_message: "Thank you!" });
    setSelectedFields(new Set(["name", "email", "phone"]));
    loadPages();
  };

  const togglePublish = async (page: LandingPage) => {
    await supabase.from("landing_pages").update({ is_published: !page.is_published }).eq("id", page.id);
    loadPages();
    toast.success(page.is_published ? "Unpublished" : "Published");
  };

  const deletePage = async (id: string) => {
    await supabase.from("landing_pages").delete().eq("id", id);
    toast.success("Deleted");
    loadPages();
  };

  const loadSubmissions = async (pageId: string) => {
    setViewSubmissions(pageId);
    const { data } = await supabase
      .from("landing_page_submissions")
      .select("*")
      .eq("page_id", pageId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setSubmissions(data.map(s => ({ ...s, data: (s.data as Record<string, string>) || {} })));
  };

  const copyEmbedCode = (page: LandingPage) => {
    const url = `${window.location.origin}/form/${page.slug}`;
    const code = `<iframe src="${url}" width="100%" height="500" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(code);
    toast.success("Embed code copied!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Landing Pages</h2>
          <p className="text-sm text-muted-foreground">Create lead capture forms that feed into your pipeline</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button className="font-mono text-xs uppercase"><Plus className="h-3 w-3 mr-1" /> New Page</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Landing Page</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Page title" value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); if (!form.slug) setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })); }} />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/form/</span>
                <Input placeholder="url-slug" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} className="flex-1" />
              </div>
              <Input placeholder="Headline" value={form.headline} onChange={e => setForm(p => ({ ...p, headline: e.target.value }))} />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
              <Input placeholder="Button text" value={form.button_text} onChange={e => setForm(p => ({ ...p, button_text: e.target.value }))} />
              <Input placeholder="Thank you message" value={form.thank_you_message} onChange={e => setForm(p => ({ ...p, thank_you_message: e.target.value }))} />

              <div>
                <p className="text-xs font-mono text-muted-foreground mb-2">FORM FIELDS</p>
                <div className="flex flex-wrap gap-2">
                  {availableFields.map(f => (
                    <button
                      key={f}
                      onClick={() => {
                        const next = new Set(selectedFields);
                        next.has(f) ? next.delete(f) : next.add(f);
                        setSelectedFields(next);
                      }}
                      className={`px-2 py-1 text-xs font-mono border rounded transition-colors ${selectedFields.has(f) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={createPage} className="w-full font-mono text-xs uppercase">Create Page</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {pages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No landing pages yet. Create one to start capturing leads.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map(page => (
            <Card key={page.id} className="border-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold truncate">{page.title}</CardTitle>
                  <Switch checked={page.is_published} onCheckedChange={() => togglePublish(page)} />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">/form/{page.slug}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={page.is_published ? "default" : "secondary"} className="font-mono text-[10px]">
                    {page.is_published ? "Live" : "Draft"}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {page.fields.length} fields
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    <FileText className="h-2.5 w-2.5 mr-1" /> {page.submissions_count} submissions
                  </Badge>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="font-mono text-[10px] flex-1" onClick={() => setPreviewPage(page)}>
                    <Eye className="h-3 w-3 mr-1" /> Preview
                  </Button>
                  <Button variant="outline" size="sm" className="font-mono text-[10px]" onClick={() => copyEmbedCode(page)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="font-mono text-[10px]" onClick={() => loadSubmissions(page.id)}>
                    <FileText className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="font-mono text-[10px]" onClick={() => deletePage(page.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewPage} onOpenChange={(o) => { if (!o) setPreviewPage(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Preview: {previewPage?.title}</DialogTitle></DialogHeader>
          {previewPage && (
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              <h3 className="text-xl font-bold text-center">{previewPage.headline}</h3>
              {previewPage.description && <p className="text-sm text-center text-muted-foreground">{previewPage.description}</p>}
              <div className="space-y-3">
                {previewPage.fields.map(f => (
                  <Input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} disabled className="bg-secondary/50" />
                ))}
              </div>
              <Button disabled className="w-full">{previewPage.button_text}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Submissions Dialog */}
      <Dialog open={!!viewSubmissions} onOpenChange={(o) => { if (!o) { setViewSubmissions(null); setSubmissions([]); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Submissions</DialogTitle></DialogHeader>
          {submissions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No submissions yet</p>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">DATE</TableHead>
                    {Object.keys(submissions[0]?.data || {}).map(k => (
                      <TableHead key={k} className="font-mono text-xs">{k.toUpperCase()}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      {Object.values(s.data).map((v, i) => (
                        <TableCell key={i} className="text-xs">{v}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
