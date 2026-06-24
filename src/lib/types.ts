// Types refletant le schema de base de donnees FixCI.
// Pratique pour l'autocompletion et eviter les fautes de frappe.

export type UserRole = "client" | "artisan" | "admin";
export type ArtisanStatus = "pending" | "verified" | "rejected" | "suspended";
export type DocumentType = "national_id" | "supporting_document";
export type DocumentStatus = "pending" | "approved" | "rejected";
export type UrgencyLevel = "urgent" | "today" | "this_week";

export type RequestStatus =
  | "new"
  | "quote_in_progress"
  | "quote_accepted"
  | "en_route"
  | "completed"
  | "validated"
  | "cancelled"
  | "disputed";

export type QuoteStatus = "proposed" | "accepted" | "declined" | "expired";
export type JobStatus =
  | "accepted"
  | "en_route"
  | "completed"
  | "validated"
  | "disputed";

export type PaymentStatus =
  | "pending"
  | "escrowed"
  | "release_pending"
  | "released"
  | "failed"
  | "refunded";

export type PaymentMethod = "wave" | "orange_money";

export interface Trade {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  is_urgent: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Commune {
  id: string;
  name: string;
  city: string;
  is_active: boolean;
}

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  photo_url: string | null;
}

export interface Artisan {
  id: string;
  bio: string | null;
  status: ArtisanStatus;
  is_verified_badge: boolean;
  average_rating: number;
  review_count: number;
  job_count: number;
  experience_years: number | null;
  average_response_minutes: number | null;
  gallery: string[];
  has_active_subscription: boolean;
  is_featured: boolean;
}
