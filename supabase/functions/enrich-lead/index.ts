const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function scrapeWebsite(website: string, firecrawlKey: string): Promise<string | null> {
  try {
    let url = website.trim();
    if (!url.startsWith('http')) url = `https://${url}`;

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: false,
        waitFor: 5000,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const md = data?.data?.markdown || data?.markdown || '';
    const links = data?.data?.links || data?.links || [];
    // Include links for better contact extraction
    const linksText = links.slice(0, 50).join('\n');
    return (md + '\n\nLINKS FOUND:\n' + linksText).slice(0, 5000) || null;
  } catch {
    return null;
  }
}

async function scrapeContactPage(website: string, firecrawlKey: string): Promise<string | null> {
  try {
    let url = website.trim().replace(/\/$/, '');
    if (!url.startsWith('http')) url = `https://${url}`;

    // Try common contact page paths
    const contactPaths = ['/contact', '/contact-us', '/contactus', '/reach-us', '/about', '/about-us'];
    
    for (const path of contactPaths) {
      try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url + path,
            formats: ['markdown'],
            onlyMainContent: false,
            waitFor: 3000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const md = data?.data?.markdown || data?.markdown || '';
          if (md.length > 100) return md.slice(0, 3000);
        }
      } catch { /* continue to next path */ }
    }
    return null;
  } catch {
    return null;
  }
}

async function searchWeb(query: string, firecrawlKey: string, limit = 5): Promise<string | null> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const results = data?.data || [];
    return results.map((r: any) => `${r.title || ''}: ${r.description || ''} (${r.url || ''})`).join('\n').slice(0, 3000) || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, location, website, category, phone, emails, mode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

    // Gather real data from the internet - multiple sources in parallel
    let websiteContent = '';
    let contactPageContent = '';
    let searchResults = '';

    if (FIRECRAWL_API_KEY) {
      const promises: Promise<void>[] = [];

      // Scrape actual website + contact page in parallel
      if (website) {
        promises.push(
          scrapeWebsite(website, FIRECRAWL_API_KEY).then(r => { if (r) websiteContent = r; }),
          scrapeContactPage(website, FIRECRAWL_API_KEY).then(r => { if (r) contactPageContent = r; })
        );
      }

      // Search internet for contact info
      const searchQuery = `"${name}" ${location || ''} contact email phone address`;
      promises.push(
        searchWeb(searchQuery, FIRECRAWL_API_KEY, 8).then(r => { if (r) searchResults = r; })
      );

      await Promise.all(promises);

      // Deep mode: additional targeted searches
      if (mode === 'deep') {
        const deepPromises: Promise<void>[] = [];
        
        deepPromises.push(
          searchWeb(`${category || name} competitors ${location || ''}`, FIRECRAWL_API_KEY, 5)
            .then(r => { if (r) searchResults += '\n\nCOMPETITOR DATA:\n' + r; })
        );
        deepPromises.push(
          searchWeb(`"${name}" ${location || ''} news reviews`, FIRECRAWL_API_KEY, 5)
            .then(r => { if (r) searchResults += '\n\nNEWS & REVIEWS:\n' + r; })
        );
        // Search for social media profiles specifically
        deepPromises.push(
          searchWeb(`"${name}" ${location || ''} facebook instagram linkedin`, FIRECRAWL_API_KEY, 5)
            .then(r => { if (r) searchResults += '\n\nSOCIAL PROFILES:\n' + r; })
        );

        await Promise.all(deepPromises);
      }
    }

    const prompt = `You are an expert business intelligence analyst. Given the following business info AND real internet data, extract ALL verifiable information. Return ONLY valid JSON — no markdown, no explanation.

BUSINESS RECORD:
- Name: ${name}
- Location: ${location || 'Unknown'}
- Website: ${website || 'None'}
- Category: ${category || 'Unknown'}
- Phone: ${phone || 'None'}
- Emails: ${emails || 'None'}

${websiteContent ? `SCRAPED HOMEPAGE CONTENT:\n${websiteContent}\n` : ''}
${contactPageContent ? `SCRAPED CONTACT PAGE:\n${contactPageContent}\n` : ''}
${searchResults ? `WEB SEARCH RESULTS:\n${searchResults}\n` : ''}

CRITICAL RULES:
1. ONLY include data you can verify from the scraped content or search results
2. For emails/phones: extract REAL ones found in the content, not guesses
3. If data is inferred (not directly found), set confidence lower
4. Extract ALL social media URLs found (full URLs, not just platform names)
5. Look carefully in footer sections, contact pages, and metadata for contact info
6. For phone numbers, include country code if visible

Return this exact JSON structure:
{
  "industry": "specific industry based on actual content",
  "estimated_size": "micro/small/medium/large",
  "estimated_employees": "range like 1-10, 10-50, etc",
  "decision_maker_title": "likely decision maker title based on business type",
  "tech_readiness": "low/medium/high based on website quality analysis",
  "found_emails": ["only real email addresses extracted from content"],
  "found_phones": ["only real phone numbers extracted from content"],
  "found_address": "full address if found in content, or null",
  "found_social_media": {
    "facebook": "full URL or null",
    "instagram": "full URL or null",
    "linkedin": "full URL or null",
    "twitter": "full URL or null",
    "youtube": "full URL or null",
    "whatsapp": "number/link or null",
    "tiktok": "full URL or null"
  },
  "found_website": "actual website URL if discovered and different from input, or null",
  "found_key_people": [{"name": "person name", "title": "their role", "contact": "email/phone if found"}],
  "services_offered": ["list of services/products from actual content"],
  "year_established": "year if found or null",
  "accreditations": ["real certifications found in content"],
  "competitors": [{"name": "name", "website": "url", "relevance": "why"}],
  "market_position": "brief analysis based on real data",
  "recent_news": ["actual news items found"],
  "pain_points": ["2-4 specific pain points based on business analysis"],
  "recommended_approach": "2-3 sentence sales strategy based on real insights",
  "best_contact_time": "suggested best time/method",
  "talking_points": ["3-4 specific talking points based on real data"],
  "confidence": 0.0,
  "data_sources": ["list what sources provided data"]
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
        return new Response(JSON.stringify({ error: 'Rate limited, please try again later' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted, please add funds' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    let enrichedData;
    try {
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      enrichedData = JSON.parse(jsonStr);
    } catch {
      enrichedData = { error: 'Failed to parse AI response', raw: content };
    }

    // Post-process: clean up and validate extracted data
    if (enrichedData.found_emails) {
      enrichedData.found_emails = enrichedData.found_emails.filter((e: string) => 
        e && /^[\w.+-]+@[\w.-]+\.\w{2,}$/.test(e) && 
        !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.svg')
      );
    }
    if (enrichedData.found_phones) {
      enrichedData.found_phones = enrichedData.found_phones.filter((p: string) => 
        p && p.replace(/\D/g, '').length >= 7
      );
    }

    enrichedData._meta = {
      used_firecrawl: !!FIRECRAWL_API_KEY,
      scraped_website: !!websiteContent,
      scraped_contact_page: !!contactPageContent,
      searched_internet: !!searchResults,
      mode: mode || 'standard',
    };

    return new Response(JSON.stringify({ success: true, data: enrichedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Enrich error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
