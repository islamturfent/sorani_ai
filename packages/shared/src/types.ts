// ===========================================================================
// Shared domain types and enums used across all modules.
// ===========================================================================

/** Central / Sorani Kurdish */
export type LanguageCode = 'ckb' | 'en' | 'ar' | 'tr';

export enum CuisineType {
  ITALIAN = 'ITALIAN',
  CHINESE = 'CHINESE',
  JAPANESE = 'JAPANESE',
  KURDISH = 'KURDISH',
  MIDDLE_EASTERN = 'MIDDLE_EASTERN',
  STEAKHOUSE = 'STEAKHOUSE',
  SUSHI = 'SUSHI',
  TURKISH = 'TURKISH',
  AMERICAN = 'AMERICAN',
  INDIAN = 'INDIAN',
  MEXICAN = 'MEXICAN',
  SEAFOOD = 'SEAFOOD',
  KEBAB = 'KEBAB',
  PIZZA = 'PIZZA',
  ARABIC = 'ARABIC',
  VEGETARIAN = 'VEGETARIAN',
  FAST_FOOD = 'FAST_FOOD',
  OTHER = 'OTHER',
}

/** Relative price ranges ($$ etc.) */
export enum PriceRange {
  LOW = '$',
  MEDIUM = '$$',
  HIGH = '$$$',
  LUXURY = '$$$$',
}

export enum RestaurantFeature {
  OUTDOOR_SEATING = 'OUTDOOR_SEATING',
  LIVE_MUSIC = 'LIVE_MUSIC',
  FAMILY_FRIENDLY = 'FAMILY_FRIENDLY',
  PRIVATE_ROOMS = 'PRIVATE_ROOMS',
  WIFI = 'WIFI',
  HALAL = 'HALAL',
  VEGETARIAN_OPTIONS = 'VEGETARIAN_OPTIONS',
  PARKING = 'PARKING',
  RIVER_VIEW = 'RIVER_VIEW',
  ROOFTOP = 'ROOFTOP',
  COFFEE = 'COFFEE',
  HOOKAH = 'HOOKAH',
  KIDS_PLAY_AREA = 'KIDS_PLAY_AREA',
}

export enum RestaurantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum RestaurantProviderType {
  PROVIDER_A = 'PROVIDER_A',
  PROVIDER_B = 'PROVIDER_B',
  PROVIDER_C = 'PROVIDER_C',
  DIRECT_PHONE = 'DIRECT_PHONE',
  MOCK = 'MOCK',
  NONE = 'NONE',
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  AVAILABILITY_CHECK = 'AVAILABILITY_CHECK',
  AWAITING_CUSTOMER_CONFIRMATION = 'AWAITING_CUSTOMER_CONFIRMATION',
  CREATING = 'CREATING',
  CONFIRMED = 'CONFIRMED',
  MODIFICATION_PENDING = 'MODIFICATION_PENDING',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum CallStatus {
  QUEUED = 'QUEUED',
  RINGING = 'RINGING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TRANSFERRED = 'TRANSFERRED',
}

export enum CallDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum CallType {
  CUSTOMER = 'CUSTOMER',
  RESTAURANT_PHONE_BOOKING = 'RESTAURANT_PHONE_BOOKING',
  TRANSFER = 'TRANSFER',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  RESTAURANT_MANAGER = 'RESTAURANT_MANAGER',
  CALL_CENTER_AGENT = 'CALL_CENTER_AGENT',
  VIEWER = 'VIEWER',
}

export enum ProviderStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  DEGRADED = 'DEGRADED',
}

export enum CapabilityKind {
  LLM = 'LLM',
  STT = 'STT',
  TTS = 'TTS',
  VAD = 'VAD',
  TELEPHONY = 'TELEPHONY',
  RESERVATION = 'RESERVATION',
}

// ---------------------------------------------------------------------------
// Context objects flowed through the system.
// ---------------------------------------------------------------------------

/** Minimal tenant scoping context attached to every tenant-scoped operation. */
export interface TenantContext {
  tenantId: string;
}

/** Request-wide correlation context for observability. */
export interface RequestContext extends TenantContext {
  requestId: string;
  restaurantId?: string;
  reservationId?: string;
  callId?: string;
  agentSessionId?: string;
  provider?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
