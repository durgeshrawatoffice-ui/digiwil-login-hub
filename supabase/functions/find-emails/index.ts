const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function scrapeForEmails(website: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey || !website) return null;

  try {
    let url = website.trim();
    if (!url.startsWith('http')) url = `https://${url}`;
    const baseUrl = url.replace(/\/$/, '');

    // Scrape main page + contact page in parallel
    const pages = [baseUrl, baseUrl + '/contact', baseUrl + '/contact-us', baseUrl + '/about'];
    const results: string[] = [];

    for (const pageUrl of pages) {
      try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: pageUrl,
            formats: ['markdown'],
            onlyMainContent: false,
            waitFor: 3000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const md = data?.data?.markdown || data?.markdown || '';
          if (md.length > 50) results.push(md);
        }
      } catch { /* continue */ }
      if (results.length >= 2) break; // Got enough content
    }

    return results.join('\n\n---\n\n').slice(0, 4000) || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, website, location, category } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    // Actually scrape the website for real email addresses
    const scrapedContent = await scrapeForEmails(website);

    // Also search the web for email addresses
    let searchResults = '';
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (FIRECRAWL_API_KEY) {
      try {
        const response = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `"${name}" ${location || ''} email contact`,
            limit: 5,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const results = data?.data || [];
          searchResults = results.map((r: any) => `${r.title || ''}: ${r.description || ''}`).join('\n').slice(0, 2000);
        }
      } catch { /* continue without search */ }
    }

    const prompt = `You are an expert email research analyst. Given a business and REAL scraped website data, extract and predict email addresses. Return ONLY valid JSON.

Business:
- Name: ${name}
- Website/Domain: ${website || 'None'}
- Location: ${location || 'Unknown'}
- Category: ${category || 'Unknown'}

${scrapedContent ? `SCRAPED WEBSITE CONTENT (REAL DATA):\n${scrapedContent}\n` : ''}
${searchResults ? `WEB SEARCH RESULTS:\n${searchResults}\n` : ''}

RULES:
1. First extract ALL real email addresses found in the scraped content
2. Then predict likely email patterns based on the domain
3. Mark extracted emails with confidence 0.95, predicted ones with 0.3-0.7
4. Extract the domain from the website URL for pattern prediction
5. Look carefully for emails in contact sections, footer, mailto: links

Return JSON:
{
  "predicted_emails": [
    {"email": "real@domain.com", "confidence": 0.95, "type": "extracted", "source": "contact page"},
    {"email": "info@domain.com", "confidence": 0.7, "type": "predicted", "source": "common pattern"}
  ],
  "email_pattern": "detected pattern like first.last@domain.com",
  "common_formats": ["info@", "admin@", "contact@"],
  "domain_from_website": "extracted domain",
  "verification_tips": "how to verify these emails",
  "total_found": 0
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let emailData;
    try {
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      emailData = JSON.parse(jsonStr);
    } catch {
      emailData = { error: 'Failed to parse', raw: content };
    }

    // Post-process: validate email format
    if (emailData.predicted_emails) {
      emailData.predicted_emails = emailData.predicted_emails.filter((e: any) =>
        e.email && /^[\w.+-]+@[\w.-]+\.\w{2,}$/.test(e.email)
      );
      emailData.total_found = emailData.predicted_emails.length;
    }

    emailData._meta = {
      scraped_website: !!scrapedContent,
      searched_web: !!searchResults,
    };

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Email finder error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
