const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, location, website, category, phone } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

    let searchResults = '';
    if (FIRECRAWL_API_KEY) {
      const queries = [
        `"${category || name}" competitors ${location || ''}`,
        `${category || name} market ${location || ''} top companies`,
      ];

      for (const query of queries) {
        try {
          const res = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, limit: 5 }),
          });
          if (res.ok) {
            const data = await res.json();
            const results = data?.data || [];
            searchResults += results.map((r: any) => `${r.title || ''}: ${r.description || ''} (${r.url || ''})`).join('\n') + '\n';
          }
        } catch { /* skip */ }
      }
    }

    const prompt = `You are a competitive intelligence analyst. Analyze the competitive landscape for this business. Return ONLY valid JSON.

BUSINESS:
- Name: ${name}
- Category: ${category || 'Unknown'}
- Location: ${location || 'Unknown'}
- Website: ${website || 'None'}

${searchResults ? `WEB RESEARCH:\n${searchResults}\n` : ''}

Return this JSON structure:
{
  "competitors": [
    {
      "name": "competitor name",
      "website": "url or null",
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1"],
      "relevance": "why this is a competitor",
      "market_share": "estimated share or position"
    }
  ],
  "market_overview": "2-3 sentence market analysis",
  "positioning_strategy": "Recommended positioning for selling TO this business (they are the prospect, not a competitor)",
  "differentiation_tips": ["tip1", "tip2", "tip3"],
  "pricing_insight": "What pricing approaches work in this market",
  "confidence": 0.0
}

Find 3-5 real competitors. Base on actual data when available.`;

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
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { error: 'Parse failed', raw: content };
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Competitor analysis error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
