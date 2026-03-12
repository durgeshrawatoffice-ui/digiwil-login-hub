import { School, SchoolType, WebsiteType, GOV_KEYWORDS, SOCIAL_DOMAINS, GENERIC_EMAIL_DOMAINS } from "@/types/school";

const SOCIAL_RE = new RegExp(SOCIAL_DOMAINS.map(d => d.replace('.', '\\.')).join('|'), 'i');

function detectSchoolType(name: string, category?: string): SchoolType {
  const text = `${name} ${category || ''}`.toLowerCase();
  if (GOV_KEYWORDS.some(kw => text.includes(kw))) return "government";
  if (/private|public school|international|convent|montessori|academy|prep/i.test(text)) return "private";
  return "unknown";
}

function extractDomainFromEmails(emailStr: string): { domain: string; fullUrl: string; email: string } | null {
  if (!emailStr?.trim()) return null;
  const emails = emailStr.split(/[,;\s]+/).map(e => e.trim()).filter(e => e.includes('@'));

  for (const email of emails) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || domain.length < 4) continue;
    if (GENERIC_EMAIL_DOMAINS.has(domain)) continue;
    if (SOCIAL_RE.test(domain)) continue;
    return { domain, fullUrl: `https://${domain}`, email };
  }
  return null;
}

function classifyWebsite(website: string | undefined, emails: string | undefined): { type: WebsiteType; discovered: boolean; detectedUrl?: string; reason?: string } {
  const url = website?.trim();

  if (!url) {
    const emailDomain = emails ? extractDomainFromEmails(emails) : null;
    if (emailDomain) {
      return {
        type: "email_domain_found",
        discovered: true,
        detectedUrl: emailDomain.fullUrl,
        reason: `Domain "${emailDomain.domain}" found in email (${emailDomain.email})`
      };
    }
    return { type: "no_website", discovered: false };
  }

  if (SOCIAL_RE.test(url)) {
    const emailDomain = emails ? extractDomainFromEmails(emails) : null;
    if (emailDomain) {
      return {
        type: "email_domain_found",
        discovered: true,
        detectedUrl: emailDomain.fullUrl,
        reason: `Domain "${emailDomain.domain}" found in email — listed site is social media only`
      };
    }
    return { type: "social_only", discovered: false };
  }

  return { type: "verified_website", discovered: false };
}

function calculateTrustScore(school: Partial<School>, websiteType: WebsiteType): number {
  let score = 30;
  if (websiteType === "email_domain_found") score += 30;
  else if (websiteType === "no_website") score += 25;
  else if (websiteType === "social_only") score += 20;
  else if (websiteType === "verified_website") score += 5;
  if (school.phone) score += 20;
  if (school.emails) score += 10;
  if (school.rating && school.rating >= 4.0) score += 10;
  return Math.min(100, Math.max(0, score));
}

export function parseCSVData(rows: Record<string, string>[]): School[] {
  return rows.map((r, i) => {
    const name = r.Name || r['School Name'] || r.Title || '';
    if (!name.trim()) return null;

    let website = (r.Website || '').trim();
    if (website.toUpperCase() === 'N/A') website = '';

    let emails = (r.Emails || '').trim();
    if (emails.toUpperCase() === 'N/A') emails = '';

    let phone = (r.Phone || r['Phone Number'] || '').trim();
    if (phone.toUpperCase() === 'N/A') phone = '';

    let category = r.Category || 'School';
    if (category.toUpperCase() === 'N/A') category = 'School';

    let address = r.Address || '';
    if (address.toUpperCase() === 'N/A') address = '';

    const rating = parseFloat(r.Rating || r['Average Rating']) || undefined;

    const schoolType = detectSchoolType(name, category);
    const classification = classifyWebsite(website || undefined, emails || undefined);

    const school: School = {
      id: `csv-${Date.now()}-${i}`,
      name,
      location: address,
      address,
      website: website || undefined,
      detectedWebsite: classification.detectedUrl || (website && !SOCIAL_RE.test(website) ? website : undefined),
      websiteConfirmed: classification.type === "verified_website",
      websiteType: classification.type,
      discovered: classification.discovered,
      status: classification.type === "verified_website" ? "found" :
        classification.type === "email_domain_found" ? "found" :
          classification.type === "no_website" ? "pending" : "pending",
      schoolType,
      similarityScore: classification.type === "verified_website" ? 85 :
        classification.type === "email_domain_found" ? 70 : undefined,
      retryCount: 0,
      phone: phone || undefined,
      emails: emails || undefined,
      category,
      rating,
      ratingInfo: (r['Rating Info'] || r.Reviews)?.toUpperCase() === 'N/A' ? undefined : (r['Rating Info'] || r.Reviews || undefined),
      openHours: (r['Open Hours'] || r.Timings)?.toUpperCase() === 'N/A' ? undefined : (r['Open Hours'] || r.Timings || undefined),
      facebook: r.Facebook || undefined,
      instagram: r.Instagram || undefined,
      twitter: r.Twitter || undefined,
      socialMedias: r['Social Medias'] || undefined,
      featuredImage: r['Featured image'] || undefined,
      trustScore: 0,
      trustReason: classification.reason,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    school.trustScore = calculateTrustScore(school, classification.type);
    return school;
  }).filter(Boolean) as School[];
}

export function parseSimpleCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];

  // Try to detect if it has headers
  const firstLine = lines[0];
  const hasHeaders = firstLine.includes('Name') || firstLine.includes('Title') || firstLine.includes('ID') || firstLine.includes('Address');

  if (hasHeaders) {
    const headers = parseCSVLine(firstLine);
    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h.replace(/^\ufeff/, '')] = values[idx] || ''; });
      return obj;
    }).filter(r => Object.values(r).some(v => v.trim()));
  }

  // Simple format: name, location per line
  return lines.filter(Boolean).map(line => {
    const parts = line.split(',').map(p => p.trim());
    return { Name: parts[0], Address: parts[1] || '' };
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
