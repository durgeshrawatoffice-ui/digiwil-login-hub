export type SchoolStatus = "pending" | "processing" | "found" | "not_found" | "error";

export type WebsiteType = 
  | "verified_website" 
  | "unverified_website" 
  | "social_only" 
  | "no_website" 
  | "email_domain_found" 
  | "dead" 
  | "discovered";

export type SchoolType = "government" | "private" | "unknown";

export type QualityScore = {
  mobile: number;
  speed: number;
  ssl: boolean;
  overall: number;
};

export type PipelineStage = "new" | "call_needed" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type CallStatus = "pending" | "calling" | "completed" | "no_answer" | "callback" | "not_interested" | "wrong_number";

export interface School {
  id: string;
  name: string;
  location?: string;
  address?: string;
  website?: string;
  detectedWebsite?: string;
  websiteConfirmed: boolean;
  websiteType?: WebsiteType;
  discovered: boolean;
  domainValidated?: boolean;
  domainActive?: boolean;
  status: SchoolStatus;
  schoolType: SchoolType;
  similarityScore?: number;
  qualityScore?: QualityScore;
  retryCount: number;
  lastError?: string;
  phone?: string;
  emails?: string;
  category?: string;
  rating?: number;
  ratingInfo?: string;
  openHours?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  socialMedias?: string;
  featuredImage?: string;
  trustScore?: number;
  trustReason?: string;
  callStatus?: CallStatus;
  callNotes?: string;
  pipelineStage?: PipelineStage;
  assignedTo?: string;
  assignedName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Government school keywords
export const GOV_KEYWORDS = [
  'govt', 'government', 'sarvodaya', 'kendriya', 'vidyalaya', 'navodaya',
  'zila parishad', 'municipal', 'corporation', 'cantonment', 'sainik',
  'central school', 'model school', 'kasturba', 'eklavya', 'jawahar',
  'primary school govt', 'upper primary', 'composite school',
  'district institute', 'block resource', 'mandal parishad'
];

export const SOCIAL_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 
  'linkedin.com', 'youtube.com', 'youtu.be', 'justdial.com', 
  'indiamart.com', 'sulekha.com'
];

export const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'yahoo.in', 'yahoo.co.in', 'outlook.com', 
  'hotmail.com', 'live.com', 'rediffmail.com', 'aol.com', 'icloud.com',
  'protonmail.com', 'zoho.com', 'yandex.com', 'msn.com', 'googlemail.com',
  'mail.com', 'gmx.com', 'naver.com'
]);
