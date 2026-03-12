import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PARKED_INDICATORS = [
  "domain for sale", "buy this domain", "this domain is parked",
  "domain parking", "godaddy", "sedoparking", "hugedomains",
  "afternic", "dan.com", "undeveloped", "is available for purchase",
  "domain has expired", "this website is for sale", "register this domain",
  "namecheap", "domain is pending", "coming soon", "under construction",
  "parked free", "courtesy of", "this site can't be reached",
  "website coming soon", "future home of", "greatdomains",
];

const SCHOOL_CONTENT_KEYWORDS = [
  "admission", "student", "teacher", "faculty", "campus", "curriculum",
  "academic", "school", "education", "class", "exam", "result",
  "principal", "parent", "syllabus", "enrollment", "grade", "cbse",
  "icse", "board", "vidyalaya", "academy", "institute",
];

async function fetchWithRetry(
  url: string,
  retries = 3,
  timeoutMs = 10000
): Promise<{ ok: boolean; status?: number; html?: string; error?: string; finalUrl?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      const html = await res.text();
      return { ok: true, status: res.status, html, finalUrl: res.url };
    } catch (e) {
      console.log(`Attempt ${attempt}/${retries} failed for ${url}: ${e instanceof Error ? e.message : "Unknown"}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      } else {
        return { ok: false, error: e instanceof Error ? e.message : "Unknown" };
      }
    }
  }
  return { ok: false, error: "All retries exhausted" };
}

function extractPageInfo(html: string): {
  title: string;
  description: string;
  bodyText: string;
  hasSchoolContent: boolean;
  isParked: boolean;
  contactInfo: string[];
  headings: string[];
} {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim().slice(0, 300) : "";

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
  const description = descMatch ? descMatch[1].trim().slice(0, 500) : "";

  // Extract visible text (strip tags)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyRaw = bodyMatch ? bodyMatch[1] : html;
  const bodyText = bodyRaw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);

  // Extract headings
  const headingMatches = html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi);
  const headings: string[] = [];
  for (const m of headingMatches) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 2 && text.length < 200) headings.push(text);
    if (headings.length >= 10) break;
  }

  // Extract contact info (phones, emails)
  const phoneMatches = bodyText.match(/[\+]?[\d\s\-\(\)]{7,15}/g) || [];
  const emailMatches = bodyText.match(/[\w.-]+@[\w.-]+\.\w{2,}/g) || [];
  const contactInfo = [...new Set([...phoneMatches.slice(0, 5), ...emailMatches.slice(0, 5)])];

  // Check for school-related content
  const lowerBody = bodyText.toLowerCase();
  const schoolKeywordCount = SCHOOL_CONTENT_KEYWORDS.filter((k) => lowerBody.includes(k)).length;
  const hasSchoolContent = schoolKeywordCount >= 3;

  // Check if parked
  const lowerAll = (title + " " + bodyText).toLowerCase();
  const isParked = PARKED_INDICATORS.some((p) => lowerAll.includes(p));

  return { title, description, bodyText, hasSchoolContent, isParked, contactInfo, headings };
}

function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const aN = a.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const bN = b.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  if (aN === bN) return 100;
  if (bN.includes(aN) || aN.includes(bN)) return 85;

  const aWords = new Set(aN.split(/\s+/).filter((w) => w.length > 2));
  const bWords = new Set(bN.split(/\s+/).filter((w) => w.length > 2));
  if (aWords.size === 0) return 0;
  let matches = 0;
  for (const w of aWords) {
    if (bWords.has(w)) matches++;
  }
  return Math.round((matches / aWords.size) * 100);
}

function checkPhoneMatch(schoolPhone: string | undefined, pageContacts: string[]): boolean {
  if (!schoolPhone) return false;
  const normalized = schoolPhone.replace(/[\s\-\(\)\+]/g, "").slice(-10);
  if (normalized.length < 7) return false;
  return pageContacts.some((c) => c.replace(/[\s\-\(\)\+]/g, "").includes(normalized));
}

function checkEmailDomainMatch(schoolEmails: string | undefined, pageContacts: string[]): boolean {
  if (!schoolEmails) return false;
  const schoolDomains = schoolEmails
    .split(/[,;\s]+/)
    .map((e) => e.match(/@([\w.-]+)/)?.[1])
    .filter(Boolean);
  return pageContacts.some((c) => {
    const domain = c.match(/@([\w.-]+)/)?.[1];
    return domain && schoolDomains.includes(domain);
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schools } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!schools || !Array.isArray(schools)) {
      return new Response(JSON.stringify({ error: "schools array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const school of schools) {
      try {
        const url = school.detectedWebsite;
        if (!url) {
          results.push({ id: school.id, status: "skip", reason: "No URL to validate" });
          continue;
        }

        // === PASS 1: Multi-retry HTTP check ===
        let fetchResult = await fetchWithRetry(url);

        // Try alternate protocol if failed
        if (!fetchResult.ok) {
          const altUrl = url.startsWith("https://")
            ? url.replace("https://", "http://")
            : url.replace("http://", "https://");
          fetchResult = await fetchWithRetry(altUrl, 2, 8000);
        }

        if (!fetchResult.ok) {
          results.push({
            id: school.id,
            status: "dead",
            reason: `Domain unreachable after multiple attempts: ${fetchResult.error}`,
            domainActive: false,
            retryAttempts: 3,
          });
          continue;
        }

        // === PASS 2: Deep content extraction ===
        const pageInfo = extractPageInfo(fetchResult.html || "");

        // Immediate parked domain detection
        if (pageInfo.isParked) {
          results.push({
            id: school.id,
            status: "dead",
            reason: "Domain is parked/for sale — not an active school website",
            domainActive: false,
            isParked: true,
            websiteTitle: pageInfo.title,
          });
          continue;
        }

        // === PASS 3: Local signal matching ===
        const titleSim = similarityScore(school.name, pageInfo.title);
        const descSim = similarityScore(school.name, pageInfo.description);
        const headingSim = Math.max(0, ...pageInfo.headings.map((h) => similarityScore(school.name, h)));
        const phoneMatch = checkPhoneMatch(school.phone, pageInfo.contactInfo);
        const emailMatch = checkEmailDomainMatch(school.emails, pageInfo.contactInfo);

        const localSignals = {
          titleSimilarity: titleSim,
          descriptionSimilarity: descSim,
          headingSimilarity: headingSim,
          hasSchoolContent: pageInfo.hasSchoolContent,
          phoneMatch,
          emailMatch,
          contactsFound: pageInfo.contactInfo.length,
        };

        // Quick-reject: no school content + very low similarity + no contact match
        if (!pageInfo.hasSchoolContent && titleSim < 15 && headingSim < 15 && !phoneMatch && !emailMatch) {
          results.push({
            id: school.id,
            status: "mismatch",
            domainActive: true,
            reason: "No school content found; title/heading don't match; no contact overlap",
            confidence: 10,
            belongsToSchool: false,
            isLegitimate: false,
            websiteTitle: pageInfo.title,
            ...localSignals,
          });
          continue;
        }

        // === PASS 4: AI deep verification with rich context ===
        const prompt = `You are a strict domain validation assistant for Indian schools. Analyze ALL evidence below and determine if this website genuinely belongs to this specific school. Be skeptical — many domains are wrong, parked, or belong to different organizations.

SCHOOL RECORD:
- Name: ${school.name}
- Location: ${school.location || "Unknown"}
- Address: ${school.address || "Unknown"}
- Phone: ${school.phone || "Unknown"}
- Email: ${school.emails || "Unknown"}
- Category: ${school.category || "Unknown"}

WEBSITE ANALYSIS:
- URL: ${url}
- Final URL (after redirects): ${fetchResult.finalUrl || url}
- HTTP Status: ${fetchResult.status}
- Page Title: "${pageInfo.title}"
- Meta Description: "${pageInfo.description}"
- Top Headings: ${pageInfo.headings.slice(0, 5).join(" | ") || "None"}
- Page Content Snippet: "${pageInfo.bodyText.slice(0, 800)}"
- Contacts Found on Page: ${pageInfo.contactInfo.join(", ") || "None"}

LOCAL MATCHING RESULTS:
- Title Similarity: ${titleSim}%
- Description Similarity: ${descSim}%
- Best Heading Similarity: ${headingSim}%
- Has School Content Keywords: ${pageInfo.hasSchoolContent}
- Phone Number Match: ${phoneMatch}
- Email Domain Match: ${emailMatch}

VALIDATION RULES:
- If phone or email matches, confidence should be high
- If page has no school-related content at all, it's likely wrong
- Generic/template sites with no specific school info = mismatch
- Parked domains, "coming soon", or placeholder pages = dead
- The URL domain name alone is NOT enough to verify — check actual content`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            tools: [
              {
                type: "function",
                function: {
                  name: "validate_domain",
                  description: "Validate if a domain belongs to a school",
                  parameters: {
                    type: "object",
                    properties: {
                      belongs_to_school: { type: "boolean", description: "Does this website genuinely belong to this specific school?" },
                      confidence: { type: "number", description: "Confidence score 0-100" },
                      reasoning: { type: "string", description: "Brief explanation of the decision" },
                      is_legitimate_school_site: { type: "boolean", description: "Is this a real school website (not parked/generic/spam)?" },
                      is_parked_or_placeholder: { type: "boolean", description: "Is this domain parked, for sale, or a placeholder?" },
                      content_relevance: { type: "string", description: "How relevant is the page content to a school? (high/medium/low/none)" },
                    },
                    required: ["belongs_to_school", "confidence", "reasoning", "is_legitimate_school_site", "is_parked_or_placeholder", "content_relevance"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "validate_domain" } },
          }),
        });

        if (!aiRes.ok) {
          // Fallback to local signals only
          const localConfidence = Math.round(
            (titleSim * 0.3 + headingSim * 0.2 + (phoneMatch ? 30 : 0) + (emailMatch ? 20 : 0) + (pageInfo.hasSchoolContent ? 15 : 0))
          );
          results.push({
            id: school.id,
            status: localConfidence >= 50 ? "verified" : "mismatch",
            domainActive: true,
            confidence: localConfidence,
            belongsToSchool: localConfidence >= 50,
            websiteTitle: pageInfo.title,
            reasoning: `AI unavailable; local signals: title=${titleSim}%, phone=${phoneMatch}, email=${emailMatch}, schoolContent=${pageInfo.hasSchoolContent}`,
            ...localSignals,
          });
          continue;
        }

        const aiData = await aiRes.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall?.function?.arguments) {
          const args = JSON.parse(toolCall.function.arguments);

          // Override AI if it says parked
          if (args.is_parked_or_placeholder) {
            results.push({
              id: school.id,
              status: "dead",
              domainActive: false,
              isParked: true,
              reason: `AI detected parked/placeholder: ${args.reasoning}`,
              websiteTitle: pageInfo.title,
              ...localSignals,
            });
          } else {
            results.push({
              id: school.id,
              status: args.belongs_to_school ? "verified" : "mismatch",
              domainActive: true,
              belongsToSchool: args.belongs_to_school,
              confidence: args.confidence,
              isLegitimate: args.is_legitimate_school_site,
              reasoning: args.reasoning,
              contentRelevance: args.content_relevance,
              websiteTitle: pageInfo.title,
              ...localSignals,
            });
          }
        } else {
          results.push({
            id: school.id,
            status: "unverified",
            domainActive: true,
            websiteTitle: pageInfo.title,
            reason: "AI returned no structured result",
            ...localSignals,
          });
        }
      } catch (err) {
        console.error("Validation error for", school.name, err);
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
    console.error("validate-domain error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
