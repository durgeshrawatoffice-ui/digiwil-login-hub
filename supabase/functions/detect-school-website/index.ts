const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Blocklists ──────────────────────────────────────────────────────────────

const DIRECTORY_DOMAINS = new Set([
  "facebook.com", "linkedin.com", "instagram.com", "twitter.com", "x.com",
  "youtube.com", "pinterest.com", "quora.com", "reddit.com", "t.me", "telegram.org",
  "google.com", "yahoo.com", "bing.com", "duckduckgo.com", "g.page",
  "justdial.com", "justdial.in", "sulekha.com", "indiamart.com",
  "mouthshut.com", "jdmagicbox.com", "tradeindia.com", "yellowpages.com",
  "yelp.com", "trustpilot.com", "mapsofindia.com",
  "glassdoor.com", "naukri.com", "indeed.com", "ambitionbox.com", "timesjobs.com",
  "shiksha.com", "collegedunia.com", "targetstudy.com", "careers360.com",
  "schoolsuniverse.com", "ezyadmit.in", "edustoke.com", "cbseshiksha.in",
  "schools.org.in", "schoolmykids.com", "icbse.com", "studyguideindia.com",
  "school.careers360.com", "admissionjankari.com", "vidyalayam.com",
  "ezyschooling.com", "clickedindia.net", "clickedindia.com",
  "indiainfo.net", "indiainfo.com", "indiacatalog.com", "educatetoday.net",
  "aura.education", "citylocal.in", "citylocal.co.in",
  "schooldekho.org", "schooldekho.com", "clickindia.com", "getit.in",
  "asklaila.com", "grotal.com", "yelu.in", "hotfrog.in",
  "urbanpro.com", "tutorialspoint.com", "byjus.com", "unacademy.com",
  "eduminatti.com", "dialmedial.com", "webindia123.com", "theindianeducation.com",
  "mappls.com", "cybo.com", "bharatbz.com", "postoffices.co.in", "postoffices.in",
  "padhain.com",
  "nic.in", "gov.in", "udiseplus.gov.in", "cbse.gov.in", "cbse.nic.in",
  "aicte-india.org",
  "wikipedia.org", "wikimapia.org", "mapquest.com",
  "github.io", "blogspot.com", "wordpress.com", "weebly.com", "wix.com", "wixsite.com",
  "sites.google.com", "pages.github.com", "tumblr.com", "medium.com", "substack.com",
]);

const DIRECTORY_PATH_PATTERNS = [
  /\/school[-_]?s?\//i, /\/place\//i, /\/listing[-_]/i, /\/business[-_]/i,
  /\/company[-_]/i, /\/institute\//i, /\/college\//i, /\/education\//i,
  /\/profile\//i, /\/directory\//i, /\/web[-_]dir/i, /wd_detail/i,
  /\/detail(s)?\.php/i, /\/detail(s)?\/[^/]+$/i,
];

const AGGREGATOR_DOMAIN_KEYWORDS = [
  "catalog", "directory", "listing", "locate", "local",
  "educatetoday", "schooldekho", "schoolkhojo", "aura.education",
  "citylocal", "citysearch", "citybizlist",
  "findaguru", "findschool", "findcollege",
  "admissions", "admissiondesk", "myclassboard", "mycbseguide",
  "entrancezone", "entrancecorner", "schooladmission", "schoolfee",
  "topschool", "bestschool", "schoolrating",
  "indiaeducation", "indiacatalog", "indianschools", "indiaedu",
  "examresult", "result.gov",
  "justdial", "sulekha", "indiamart", "yellowpages", "yelp",
  "eduminatti", "dialmedial", "cybo", "bharatbz", "mappls", "postoffices", "padhain"
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function isDirectoryOrInvalid(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = url.pathname;

    if (urlStr.endsWith(".pdf") || urlStr.endsWith(".doc")) return true;
    if (hostname.split(".").length === 1) return true;

    for (const blocked of DIRECTORY_DOMAINS) {
      if (hostname === blocked || hostname.endsWith("." + blocked)) return true;
    }
    for (const pattern of DIRECTORY_PATH_PATTERNS) {
      if (pattern.test(pathname)) return true;
    }
    for (const keyword of AGGREGATOR_DOMAIN_KEYWORDS) {
      if (hostname.includes(keyword)) return true;
    }
    if (/\?.*\bid=\d+/i.test(urlStr)) return true;
    if (/\?.*\bschool_?id=\d+/i.test(urlStr)) return true;

    return false;
  } catch {
    return true;
  }
}

function officialSiteConfidencePenalty(urlStr: string): number {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = url.pathname.toLowerCase();
    let penalty = 0;

    if (hostname.endsWith("github.io")) return -100;
    if (/\?.*\bid=\d+/.test(urlStr)) return -100;
    if (/\/\d{10}\//.test(pathname)) return -100;

    const pathDepth = pathname.split("/").filter(Boolean).length;
    if (pathDepth >= 3) penalty -= 15;
    if (pathDepth >= 5) penalty -= 20;
    if (/\/\d{4,}/.test(pathname)) penalty -= 40;
    if (/\/[a-z]+-[a-z]+-[a-z]+-[a-z]+-[a-z]+/.test(pathname)) penalty -= 25;
    if (/\/[a-z]{4,}\/\d/.test(pathname)) penalty -= 50;

    const genericEduDomain = /^(aura|top|best|india|my|find|all|one|e|i|smart|great|good)\.(education|school|edu|academy)/.test(hostname);
    if (genericEduDomain) penalty -= 80;

    return penalty;
  } catch {
    return -100;
  }
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function extractText(html: string): string {
  const prioritySections: string[] = [];
  const priorityRegex =
    /<(footer|address|[^>]*(footer|contact|about|address)[^>]*)[\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = priorityRegex.exec(html)) !== null) {
    prioritySections.push(m[0]);
  }
  const fullHtml = prioritySections.length > 0
    ? prioritySections.join(" ") + " " + html
    : html;

  return fullHtml
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Address verification ────────────────────────────────────────────────────

interface VerificationResult {
  verified: boolean;
  score: number;
  matchedOn: string[];
}

async function fetchPage(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function scoreAddressMatch(
  pageText: string,
  school: { name: string; location?: string; address?: string }
): VerificationResult {
  const text = normalise(pageText);
  const matched: string[] = [];
  let score = 0;

  const locationTokens = (school.location ?? "")
    .split(/[\s,]+/)
    .map((t) => t.toLowerCase().trim())
    .filter((t) => t.length >= 3);

  const city = locationTokens[0] ?? "";
  if (city && new RegExp(`\\b${city}\\b`, 'i').test(text)) {
    score += 40;
    matched.push(`city:${city}`);
  }

  if (locationTokens[1] && new RegExp(`\\b${locationTokens[1]}\\b`, 'i').test(text)) {
    score += 15;
    matched.push(`state:${locationTokens[1]}`);
  }

  if (school.address) {
    const pinMatch = school.address.match(/\b\d{6}\b/);
    if (pinMatch && text.includes(pinMatch[0])) {
      score += 15;
      matched.push(`pin:${pinMatch[0]}`);
    }

    const addrTokens = normalise(school.address)
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !/^\d{1,3}$/.test(t));

    let addrScore = 0;
    for (const token of addrTokens) {
      if (text.includes(token) && addrScore < 30) {
        addrScore += 5;
        matched.push(`addr:${token}`);
      }
    }
    score += addrScore;
  }

  const nameTokens = normalise(school.name)
    .split(/\s+/)
    .filter((t) => t.length >= 4);
  let nameScore = 0;
  for (const token of nameTokens) {
    if (text.includes(token) && nameScore < 10) {
      nameScore += 5;
    }
  }
  score += nameScore;
  score = Math.min(score, 100);

  return { verified: score >= 40, score, matchedOn: matched };
}

async function verifyWebsiteAddress(
  websiteUrl: string,
  school: { name: string; location?: string; address?: string }
): Promise<VerificationResult> {
  const base = websiteUrl.replace(/\/$/, "");
  const pagesToTry = [
    base + "/",
    base + "/contact",
    base + "/contact-us",
    base + "/about",
    base + "/about-us",
    base + "/reach-us",
  ];

  let best: VerificationResult = { verified: false, score: 0, matchedOn: [] };

  for (const pageUrl of pagesToTry) {
    const html = await fetchPage(pageUrl);
    if (!html) continue;

    const text = extractText(html);
    const result = scoreAddressMatch(text, school);

    if (result.score > best.score) {
      best = result;
    }
    if (best.score >= 70) break;
  }

  return best;
}

// ─── Search methods ──────────────────────────────────────────────────────────

async function searchClearbit(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.length > 0 && data[0].domain) {
        return `https://${data[0].domain}`;
      }
    }
  } catch (e) {
    console.warn("Clearbit search failed", e);
  }
  return null;
}

/**
 * Search using Firecrawl Search API — much more accurate than DDG HTML scraping.
 * Returns structured results with URLs, titles, and descriptions.
 */
async function searchFirecrawl(
  query: string,
  maxResults = 8
): Promise<Array<{ url: string; title: string; description: string; markdown?: string }>> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    console.warn("FIRECRAWL_API_KEY not set, skipping Firecrawl search");
    return [];
  }

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: maxResults,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!res.ok) {
      console.warn(`Firecrawl search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data?.success || !data?.data) return [];

    return data.data
      .filter((r: any) => r.url && !isDirectoryOrInvalid(r.url))
      .map((r: any) => ({
        url: r.url,
        title: r.title || "",
        description: r.description || "",
        markdown: r.markdown || "",
      }));
  } catch (e) {
    console.warn("Firecrawl search error:", e);
    return [];
  }
}

/**
 * Fallback DuckDuckGo search.
 */
async function searchDDG(query: string, maxResults = 5): Promise<string[]> {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      }
    );
    if (!res.ok) return [];

    const html = await res.text();
    const regex = /href="\/\/duckduckgo\.com\/l\/\?uddg=([^\&]+)\&/g;
    const urls: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null && urls.length < maxResults * 3) {
      try {
        const decoded = decodeURIComponent(match[1]);
        if (!urls.includes(decoded) && !isDirectoryOrInvalid(decoded)) {
          urls.push(decoded);
        }
      } catch (_) { /* skip */ }
    }

    return urls.slice(0, maxResults);
  } catch (e) {
    console.warn("DDG search failed", e);
    return [];
  }
}

// ─── AI-powered candidate ranking ───────────────────────────────────────────

interface RankedCandidate {
  url: string;
  confidence: number;
  reasoning: string;
  isOfficialSite: boolean;
}

async function aiRankCandidates(
  school: { name: string; location?: string; address?: string; phone?: string; emails?: string; category?: string },
  candidates: Array<{ url: string; title: string; description: string; markdown?: string; addressScore?: number; addressMatches?: string[] }>
): Promise<RankedCandidate | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || candidates.length === 0) return null;

  const candidateDetails = candidates.slice(0, 6).map((c, i) => {
    const contentSnippet = (c.markdown || c.description || "").slice(0, 500);
    return `
CANDIDATE ${i + 1}:
- URL: ${c.url}
- Title: "${c.title}"
- Description: "${c.description}"
- Address verification score: ${c.addressScore ?? "not checked"}/100
- Address matches: ${c.addressMatches?.join(", ") || "none"}
- Content snippet: "${contentSnippet}"`;
  }).join("\n");

  const prompt = `You are an expert at identifying official school/business websites. Given a school record and multiple candidate URLs found via search, determine which URL (if any) is the school's OFFICIAL website.

SCHOOL RECORD:
- Name: ${school.name}
- Location: ${school.location || "Unknown"}
- Address: ${school.address || "Unknown"}
- Phone: ${school.phone || "Unknown"}
- Email: ${school.emails || "Unknown"}
- Category: ${school.category || "School"}

CANDIDATE WEBSITES:
${candidateDetails}

RULES:
1. The official website must be the school's OWN domain — NOT a directory, listing, or aggregator page
2. Look for matching school name in the page title/content
3. Address/city match is a strong signal
4. Phone/email match on the page is very strong signal
5. If NO candidate is clearly the official site, return candidate_index: -1
6. Prefer shorter, cleaner domains (e.g. schoolname.com vs schoolname.somebuilder.com)
7. A school's own website will typically have admissions info, contact details, about section
8. Reject social media profiles, directory listings, and generic education portals`;

  try {
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "rank_website",
            description: "Select the best official website candidate",
            parameters: {
              type: "object",
              properties: {
                candidate_index: { type: "number", description: "1-based index of the best candidate, or -1 if none match" },
                confidence: { type: "number", description: "Confidence score 0-100" },
                reasoning: { type: "string", description: "Brief explanation" },
                is_official_site: { type: "boolean", description: "Is this definitely the school's own website?" },
              },
              required: ["candidate_index", "confidence", "reasoning", "is_official_site"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "rank_website" } },
      }),
    });

    if (!aiRes.ok) return null;

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return null;

    const args = JSON.parse(toolCall.function.arguments);
    if (args.candidate_index <= 0 || args.candidate_index > candidates.length) return null;

    const selected = candidates[args.candidate_index - 1];
    return {
      url: selected.url,
      confidence: args.confidence,
      reasoning: args.reasoning,
      isOfficialSite: args.is_official_site,
    };
  } catch (e) {
    console.warn("AI ranking failed:", e);
    return null;
  }
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schools } = await req.json();

    if (!schools || !Array.isArray(schools) || schools.length === 0) {
      return new Response(
        JSON.stringify({ error: "schools array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const school of schools) {
      try {
        let detectedWebsite: string | null = null;
        let reasoning = "Could not find a matching active website.";
        let confidence = 0;
        let verificationInfo = "";
        let searchMethod = "unknown";

        // ── Method 1: Clearbit (fast for well-known orgs) ──────────────────
        const clearbitUrl = await searchClearbit(school.name);
        if (clearbitUrl) {
          const verification = await verifyWebsiteAddress(clearbitUrl, school);
          if (verification.verified) {
            detectedWebsite = clearbitUrl;
            confidence = Math.min(95, 80 + Math.round(verification.score * 0.15));
            reasoning = "Found via Clearbit and address verified on website.";
            verificationInfo = `Address match score: ${verification.score}/100. Matched: ${verification.matchedOn.join(", ")}`;
            searchMethod = "clearbit";
          }
        }

        // ── Method 2: Firecrawl Search (primary, most accurate) ────────────
        if (!detectedWebsite) {
          // Build multiple targeted queries for better coverage
          const queries = [
            `"${school.name}" ${school.location || ""} official website`,
            `${school.name} ${school.address || school.location || ""} school site`,
          ];

          let allCandidates: Array<{ url: string; title: string; description: string; markdown?: string; addressScore?: number; addressMatches?: string[] }> = [];
          const seenUrls = new Set<string>();

          for (const query of queries) {
            if (detectedWebsite) break;
            
            const firecrawlResults = await searchFirecrawl(query, 6);
            
            for (const result of firecrawlResults) {
              const urlKey = result.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
              if (seenUrls.has(urlKey)) continue;
              seenUrls.add(urlKey);

              // Apply penalty check
              const penalty = officialSiteConfidencePenalty(result.url);
              if (penalty <= -80) continue;

              // Quick address verification using scraped content
              const contentText = result.markdown || result.description || "";
              let addressVerification: VerificationResult = { verified: false, score: 0, matchedOn: [] };
              
              if (contentText.length > 50) {
                addressVerification = scoreAddressMatch(contentText, school);
              }

              allCandidates.push({
                ...result,
                addressScore: Math.max(0, addressVerification.score + penalty),
                addressMatches: addressVerification.matchedOn,
              });
            }
          }

          if (allCandidates.length > 0) {
            // Sort by address score first
            allCandidates.sort((a, b) => (b.addressScore || 0) - (a.addressScore || 0));

            // If top candidate has very high address score, use it directly
            const topCandidate = allCandidates[0];
            if ((topCandidate.addressScore || 0) >= 70) {
              detectedWebsite = topCandidate.url;
              confidence = Math.min(95, 70 + Math.round((topCandidate.addressScore || 0) * 0.25));
              reasoning = "Found via Firecrawl search with strong address match.";
              verificationInfo = `Address score: ${topCandidate.addressScore}/100. Matched: ${topCandidate.addressMatches?.join(", ")}`;
              searchMethod = "firecrawl";
            } else {
              // Use AI to rank candidates
              const aiResult = await aiRankCandidates(school, allCandidates);
              
              if (aiResult && aiResult.isOfficialSite && aiResult.confidence >= 50) {
                // Verify the AI-selected URL by fetching its actual content
                const deepVerification = await verifyWebsiteAddress(aiResult.url, school);
                
                const finalConfidence = Math.max(aiResult.confidence, deepVerification.score);
                
                if (finalConfidence >= 40 || aiResult.confidence >= 70) {
                  detectedWebsite = aiResult.url;
                  confidence = Math.min(95, finalConfidence);
                  reasoning = `AI-ranked best match: ${aiResult.reasoning}`;
                  searchMethod = "firecrawl+ai";
                  verificationInfo = deepVerification.score > 0 
                    ? `AI confidence: ${aiResult.confidence}. Address score: ${deepVerification.score}/100. Matched: ${deepVerification.matchedOn.join(", ")}`
                    : `AI confidence: ${aiResult.confidence}. ${aiResult.reasoning}`;
                }
              }
              
              // If AI didn't find a match, try the top address-scored candidate with deep verification
              if (!detectedWebsite && topCandidate.addressScore && topCandidate.addressScore >= 30) {
                const deepVerification = await verifyWebsiteAddress(topCandidate.url, school);
                if (deepVerification.verified) {
                  detectedWebsite = topCandidate.url;
                  confidence = Math.min(85, 50 + Math.round(deepVerification.score * 0.3));
                  reasoning = "Found via Firecrawl search with address verification.";
                  verificationInfo = `Address score: ${deepVerification.score}/100. Matched: ${deepVerification.matchedOn.join(", ")}`;
                  searchMethod = "firecrawl";
                }
              }
            }
          }
        }

        // ── Method 3: DuckDuckGo fallback with address verification ────────
        if (!detectedWebsite) {
          const query = `"${school.name}" ${school.location ?? ""} ${school.address ?? ""} official website -directory -listing -justdial -sulekha -indiamart -facebook -mappls -cybo -bharatbz -padhain`;
          const candidateUrls = await searchDDG(query, 5);

          let bestScore = 0;
          let bestUrl: string | null = null;
          let bestVerification: VerificationResult | null = null;

          for (const url of candidateUrls) {
            const penalty = officialSiteConfidencePenalty(url);
            const verification = await verifyWebsiteAddress(url, school);
            const effectiveScore = Math.max(0, verification.score + penalty);

            if (effectiveScore > bestScore) {
              bestScore = effectiveScore;
              bestUrl = url;
              bestVerification = { ...verification, score: effectiveScore };
            }
            if (bestScore >= 70) break;
          }

          if (bestUrl && bestVerification && bestVerification.verified && bestScore >= 40) {
            detectedWebsite = bestUrl;
            confidence = Math.min(85, 55 + Math.round(bestVerification.score * 0.3));
            reasoning = "Found via DuckDuckGo search and address verified.";
            verificationInfo = `Address score: ${bestVerification.score}/100. Matched: ${bestVerification.matchedOn.join(", ")}`;
            searchMethod = "ddg";
          } else if (bestUrl && bestScore >= 30) {
            detectedWebsite = bestUrl;
            confidence = 35;
            reasoning = "Found via DuckDuckGo but address could not be fully verified.";
            searchMethod = "ddg";
            verificationInfo = bestVerification
              ? `Partial score: ${bestVerification.score}/100. Matched: ${bestVerification.matchedOn.join(", ")}`
              : "No address tokens found.";
          }
        }

        // ── Method 4: Broader fallback (name only) ─────────────────────────
        if (!detectedWebsite) {
          const fallbackQuery = `${school.name} school official website`;
          const fallbackUrls = await searchDDG(fallbackQuery, 3);

          for (const url of fallbackUrls) {
            const verification = await verifyWebsiteAddress(url, school);
            if (verification.verified) {
              detectedWebsite = url;
              confidence = 50;
              reasoning = "Found via broader search with partial address verification.";
              verificationInfo = `Address score: ${verification.score}/100. Matched: ${verification.matchedOn.join(", ")}`;
              searchMethod = "ddg";
              break;
            }
          }
        }

        if (detectedWebsite) {
          results.push({
            id: school.id,
            status: "found",
            detectedWebsite,
            similarityScore: confidence,
            reasoning,
            verificationInfo,
            searchMethod,
          });
        } else {
          results.push({
            id: school.id,
            status: "not_found",
            reasoning,
          });
        }
      } catch (err) {
        console.error("Error processing school:", school.name, err);
        results.push({
          id: school.id,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-school-website error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
