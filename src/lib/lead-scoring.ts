import { School } from "@/types/school";

export interface LeadScore {
  total: number; // 0-100
  breakdown: {
    website: number;      // 0-25
    contact: number;      // 0-25
    social: number;       // 0-20
    dataQuality: number;  // 0-15
    verification: number; // 0-15
  };
  grade: "A" | "B" | "C" | "D" | "F";
  color: string; // tailwind token
}

export function calculateLeadScore(school: School): LeadScore {
  const breakdown = {
    website: 0,
    contact: 0,
    social: 0,
    dataQuality: 0,
    verification: 0,
  };

  // Website (0-25)
  if (school.detectedWebsite || school.website) {
    breakdown.website += 10;
    if (school.websiteType === "verified_website") breakdown.website += 15;
    else if (school.websiteType === "discovered") breakdown.website += 10;
    else if (school.websiteType === "unverified_website") breakdown.website += 5;
    else if (school.websiteType === "social_only") breakdown.website += 2;
  }

  // Contact (0-25)
  if (school.phone) breakdown.contact += 12;
  if (school.emails) {
    const emailCount = school.emails.split(",").length;
    breakdown.contact += Math.min(13, emailCount * 7);
  }

  // Social (0-20)
  let socialCount = 0;
  if (school.facebook) socialCount++;
  if (school.instagram) socialCount++;
  if (school.twitter) socialCount++;
  if (school.socialMedias) socialCount += Math.min(2, school.socialMedias.split(",").length);
  breakdown.social = Math.min(20, socialCount * 5);

  // Data Quality (0-15)
  if (school.name) breakdown.dataQuality += 3;
  if (school.location) breakdown.dataQuality += 3;
  if (school.address) breakdown.dataQuality += 3;
  if (school.category) breakdown.dataQuality += 3;
  if (school.rating) breakdown.dataQuality += 3;

  // Verification (0-15)
  if (school.domainValidated) breakdown.verification += 8;
  if (school.domainActive) breakdown.verification += 4;
  if (school.qualityScore) breakdown.verification += 3;

  const total = Math.min(100,
    breakdown.website + breakdown.contact + breakdown.social +
    breakdown.dataQuality + breakdown.verification
  );

  let grade: LeadScore["grade"];
  let color: string;
  if (total >= 80) { grade = "A"; color = "text-chart-2"; }
  else if (total >= 60) { grade = "B"; color = "text-chart-4"; }
  else if (total >= 40) { grade = "C"; color = "text-chart-5"; }
  else if (total >= 20) { grade = "D"; color = "text-chart-1"; }
  else { grade = "F"; color = "text-destructive"; }

  return { total, breakdown, grade, color };
}

export function getScoreGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "bg-chart-2 text-chart-2-foreground";
  if (score >= 60) return "bg-chart-4 text-chart-4-foreground";
  if (score >= 40) return "bg-chart-5 text-chart-5-foreground";
  if (score >= 20) return "bg-chart-1 text-chart-1-foreground";
  return "bg-destructive text-destructive-foreground";
}

export function getScoreBgClass(grade: LeadScore["grade"]): string {
  switch (grade) {
    case "A": return "bg-chart-2/15 border-chart-2/30";
    case "B": return "bg-chart-4/15 border-chart-4/30";
    case "C": return "bg-chart-5/15 border-chart-5/30";
    case "D": return "bg-chart-1/15 border-chart-1/30";
    case "F": return "bg-destructive/15 border-destructive/30";
  }
}
