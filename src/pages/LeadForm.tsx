import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { useEffect } from "react";

interface PageConfig {
  headline: string;
  description: string | null;
  button_text: string;
  fields: string[];
  thank_you_message: string | null;
  id: string;
}

const LeadForm = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("landing_pages")
      .select("id, headline, description, button_text, fields, thank_you_message")
      .eq("slug", slug)
      .eq("is_published", true)
      .single()
      .then(({ data, error }) => {
        if (data) {
          setPage({
            ...data,
            fields: Array.isArray(data.fields) ? data.fields as string[] : ["name", "email"],
          });
        }
        setLoading(false);
      });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page) return;
    setSubmitting(true);

    const { error } = await supabase.from("landing_page_submissions").insert({
      page_id: page.id,
      data: formData,
    });

    if (error) {
      toast.error("Failed to submit");
      setSubmitting(false);
      return;
    }

    // Increment counter - best effort
    try {
      await supabase.from("landing_pages").update({ submissions_count: (page as any).submissions_count + 1 } as any).eq("id", page.id);
    } catch {}

    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!page) return <div className="flex h-screen items-center justify-center"><p className="text-muted-foreground">Page not found</p></div>;

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-3">
            <CheckCircle className="h-12 w-12 mx-auto text-chart-2" />
            <h2 className="text-xl font-bold">{page.thank_you_message || "Thank you!"}</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">{page.headline}</h1>
            {page.description && <p className="text-sm text-muted-foreground">{page.description}</p>}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            {page.fields.map(f => (
              <Input
                key={f}
                placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                required={f === "name" || f === "email"}
                type={f === "email" ? "email" : f === "phone" ? "tel" : "text"}
                value={formData[f] || ""}
                onChange={e => setFormData(p => ({ ...p, [f]: e.target.value }))}
              />
            ))}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : page.button_text}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadForm;
