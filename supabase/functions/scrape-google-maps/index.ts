const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keywords } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Keywords array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured. Please connect Firecrawl in Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allResults: any[] = [];
    const seen = new Set<string>();
    const startTime = Date.now();

    function addUnique(parsed: any) {
      if (!parsed) return;
      const key = normalizeName(parsed.name) + '|' + normalizeName(parsed.address || '');
      if (seen.has(key)) return;
      seen.add(key);
      allResults.push(parsed);
    }

    for (const keyword of keywords) {
      const trimmed = keyword.trim();
      if (!trimmed) continue;

      console.log(`Searching: ${trimmed}`);

      try {
        // Use Firecrawl search to find businesses
        const response = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `${trimmed} site:google.com/maps OR ${trimmed} business listing`,
            limit: 20,
            scrapeOptions: {
              formats: ['markdown'],
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(`Firecrawl error for "${trimmed}":`, data);
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Insufficient Firecrawl credits. Please upgrade your Firecrawl plan. Use coupon LOVABLE50 for 50% off first 3 months.' 
              }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          continue;
        }

        // Parse search results into business leads
        const results = data.data || [];
        for (const result of results) {
          const parsed = parseBusinessFromResult(result, trimmed);
          addUnique(parsed);
        }

        // Also try a direct Google Maps search query
        const mapsResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: trimmed,
            limit: 30,
            scrapeOptions: {
              formats: ['markdown'],
            },
          }),
        });

        const mapsData = await mapsResponse.json();
        if (mapsResponse.ok) {
          const mapsResults = mapsData.data || [];
          for (const result of mapsResults) {
            const parsed = parseBusinessFromResult(result, trimmed);
            addUnique(parsed);
          }
        }
      } catch (err) {
        console.error(`Error searching "${trimmed}":`, err);
      }
    }

    const duplicatesRemoved = seen.size; // total unique entries processed
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);

    return new Response(
      JSON.stringify({
        success: true,
        data: allResults,
        stats: {
          keywords: keywords.filter((k: string) => k.trim()).length,
          totalLeads: allResults.length,
          phoneNumbers: allResults.filter(r => r.phone).length,
          websites: allResults.filter(r => r.website).length,
          emails: allResults.filter(r => r.emails).length,
          scrapingTime: parseFloat(elapsed),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scraper error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Scraping failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseBusinessFromResult(result: any, keyword: string): any | null {
  if (!result) return null;

  const title = result.title || '';
  const url = result.url || '';
  const markdown = result.markdown || '';
  const description = result.description || '';

  // Skip non-business results
  if (!title || title.length < 3) return null;
  if (url.includes('google.com/maps') && !title) return null;

  // Extract phone from markdown/description
  const phoneMatch = (markdown + ' ' + description).match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

  // Extract email from markdown/description
  const emailMatch = (markdown + ' ' + description).match(/[\w.+-]+@[\w-]+\.[\w.]+/g);
  const emails = emailMatch ? [...new Set(emailMatch)].join(', ') : undefined;

  // Extract address patterns
  const addressMatch = (markdown + ' ' + description).match(/\d+[,\s]+[\w\s]+(?:Road|Rd|Street|St|Avenue|Ave|Lane|Ln|Drive|Dr|Nagar|Colony|Sector|Block|Plot|Phase|Market|Chowk|Marg|Path|Gali|Mohalla|Ward|Vikas|Puram)[,\s]*[\w\s,]*/i);
  const address = addressMatch ? addressMatch[0].trim().substring(0, 200) : undefined;

  // Extract rating
  const ratingMatch = (markdown + ' ' + description).match(/(\d\.\d)\s*(?:star|rating|\/\s*5|out of)/i);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

  // Extract category from context
  const categoryMatch = (markdown + ' ' + description).match(/(?:Category|Type|Business):\s*([^\n,]+)/i);
  const category = categoryMatch ? categoryMatch[1].trim() : undefined;

  // Determine website - use the URL if it's not a Google/social URL
  let website: string | undefined;
  if (url && !url.includes('google.com') && !url.includes('facebook.com') && !url.includes('instagram.com') && !url.includes('youtube.com') && !url.includes('justdial.com') && !url.includes('indiamart.com')) {
    website = url;
  }

  // Try to find website in markdown
  if (!website) {
    const webMatch = markdown.match(/(?:website|site|url|web):\s*(https?:\/\/[^\s,\n]+)/i);
    if (webMatch) website = webMatch[1];
  }

  return {
    keyword,
    name: title.replace(/\s*[-–|].*$/, '').trim().substring(0, 200),
    address,
    website,
    phone,
    emails,
    rating,
    category,
    source: url,
  };
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 60);
}
