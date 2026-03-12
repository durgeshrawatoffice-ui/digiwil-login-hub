const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractEmails(text: string): string[] {
  const matches = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g) || [];
  return [...new Set(matches)].filter(
    (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".svg") && !e.endsWith(".gif") &&
           !e.endsWith(".css") && !e.endsWith(".js") && !e.includes("example.com") &&
           !e.includes("sentry.io") && !e.includes("wixpress.com")
  );
}

function extractPhones(text: string): string[] {
  // Better phone regex that handles international formats
  const patterns = [
    /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}/g,
    /(?:\+91[\s.-]?)?\d{5}[\s.-]?\d{5}/g, // Indian mobile
    /(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, // US/Canada
  ];
  
  const allMatches: string[] = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    allMatches.push(...matches);
  }
  
  return [...new Set(allMatches.map((p) => p.trim()).filter((p) => {
    const digits = p.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15 && !/^0{5,}/.test(digits);
  }))];
}

function extractSocialLink(html: string, markdown: string, pattern: RegExp): string | null {
  const combined = html + " " + markdown;
  const match = combined.match(pattern);
  if (!match) return null;
  // Clean the URL - remove trailing quotes, brackets, etc.
  return match[0].replace(/["'\s>)\]]+.*$/, "").replace(/[.,;]+$/, "").trim();
}

function extractPageUrl(html: string, markdown: string, keywords: string[]): string | null {
  const combined = html + " " + markdown;
  for (const kw of keywords) {
    const pattern = new RegExp(`https?://[^\\s"'<>]*${kw}[^\\s"'<>]*`, "i");
    const match = combined.match(pattern);
    if (match) return match[0].replace(/["'\s>)\]]+.*$/, "").trim();
  }
  return null;
}

interface ScrapedData {
  url: string;
  title: string;
  email1: string;
  email2: string;
  phone1: string;
  phone2: string;
  aboutPage: string;
  contactPage: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
  telegram: string;
  pinterest: string;
  twitter: string;
  snapchat: string;
  skype: string;
}

async function scrapeWebsite(url: string, apiKey: string): Promise<ScrapedData> {
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = `https://${formattedUrl}`;
  }

  // Scrape main page
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: formattedUrl,
      formats: ["markdown", "html", "links"],
      onlyMainContent: false,
      waitFor: 5000,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Scrape failed: ${response.status}`);

  const html = data.data?.html || data.html || "";
  const markdown = data.data?.markdown || data.markdown || "";
  const metadata = data.data?.metadata || data.metadata || {};
  const links: string[] = data.data?.links || data.links || [];

  // Also try scraping contact page for more data
  let contactHtml = "";
  let contactMarkdown = "";
  const baseUrl = formattedUrl.replace(/\/$/, "");
  
  try {
    const contactRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: baseUrl + "/contact",
        formats: ["markdown", "html"],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });
    if (contactRes.ok) {
      const contactData = await contactRes.json();
      contactHtml = contactData.data?.html || contactData.html || "";
      contactMarkdown = contactData.data?.markdown || contactData.markdown || "";
    }
  } catch { /* contact page might not exist */ }

  const allText = html + " " + markdown + " " + contactHtml + " " + contactMarkdown + " " + links.join(" ");
  const allHtml = html + " " + contactHtml;
  const allMarkdown = markdown + " " + contactMarkdown;

  const emails = extractEmails(allText);
  const phones = extractPhones(allMarkdown + " " + allHtml);

  // Extract social links with improved patterns
  const facebook = extractSocialLink(allHtml, allMarkdown, /https?:\/\/(www\.)?facebook\.com\/[^\s"'<>)]+/i);
  const instagram = extractSocialLink(allHtml, allMarkdown, /https?:\/\/(www\.)?instagram\.com\/[^\s"'<>)]+/i);
  const linkedin = extractSocialLink(allHtml, allMarkdown, /https?:\/\/(www\.)?linkedin\.com\/[^\s"'<>)]+/i);
  const tiktok = extractSocialLink(allHtml, allMarkdown, /https?:\/\/(www\.)?tiktok\.com\/[^\s"'<>)]+/i);
  const youtube = extractSocialLink(allHtml, allMarkdown, /https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/[^\s"'<>)]+/i);
  const twitter = extractSocialLink(allHtml, allMarkdown, /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s"'<>)]+/i);
  const pinterest = extractSocialLink(allHtml, allMarkdown, /https?:\/\/(www\.)?pinterest\.com\/[^\s"'<>)]+/i);
  const snapchat = extractSocialLink(allHtml, allMarkdown, /https?:\/\/(www\.)?snapchat\.com\/[^\s"'<>)]+/i);

  const whatsappMatch = allText.match(/https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/[^\s"'<>)]+/i);
  const whatsapp = whatsappMatch ? whatsappMatch[0].replace(/["'\s>)\]]+.*$/, "") : null;

  const telegramMatch = allText.match(/https?:\/\/(t\.me|telegram\.me)\/[^\s"'<>)]+/i);
  const telegram = telegramMatch ? telegramMatch[0].replace(/["'\s>)\]]+.*$/, "") : null;

  const skypeMatch = allText.match(/skype:[^\s"'<>)]+/i);
  const skype = skypeMatch ? skypeMatch[0] : null;

  const aboutPage = extractPageUrl(allHtml, allMarkdown, ["about", "about-us", "aboutus"]);
  const contactPage = extractPageUrl(allHtml, allMarkdown, ["contact", "contact-us", "contactus"]);

  return {
    url: formattedUrl,
    title: metadata.title || "",
    email1: emails[0] || "",
    email2: emails[1] || "",
    phone1: phones[0] || "",
    phone2: phones[1] || "",
    aboutPage: aboutPage || "",
    contactPage: contactPage || "",
    facebook: facebook || "",
    instagram: instagram || "",
    linkedin: linkedin || "",
    tiktok: tiktok || "",
    youtube: youtube || "",
    whatsapp: whatsapp || "",
    telegram: telegram || "",
    pinterest: pinterest || "",
    twitter: twitter || "",
    snapchat: snapchat || "",
    skype: skype || "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls, batchSize = 5 } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "urls array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Firecrawl connector not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: ScrapedData[] = [];
    const errors: { url: string; error: string }[] = [];

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((url: string) => scrapeWebsite(url, apiKey))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const r = batchResults[j];
        if (r.status === "fulfilled") {
          results.push(r.value);
        } else {
          errors.push({ url: batch[j], error: r.reason?.message || "Unknown error" });
        }
      }

      if (i + batchSize < urls.length) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    return new Response(JSON.stringify({ results, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-website-details error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
