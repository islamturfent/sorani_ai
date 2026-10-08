import type {
  CuisineType,
  PriceRange,
  RestaurantFeature,
  RestaurantStatus,
} from '@sorani/shared';

export interface RestaurantLocation {
  id: string;
  restaurantId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  timezone: string;
  openingHours: OpeningHours[];
}

export interface OpeningHours {
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  open: string; // "HH:mm" 24h
  close: string; // "HH:mm" 24h
  closed?: boolean;
}

export interface RestaurantProviderConnection {
  id: string;
  restaurantId: string;
  providerType: string;
  externalRestaurantId?: string;
  /** Encrypted-at-rest credentials. */
  credentialsEncrypted?: string;
  configuration?: Record<string, unknown>;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  cuisineTypes: CuisineType[];
  locations: RestaurantLocation[];
  phoneNumbers: string[];
  website?: string;
  priceRange?: PriceRange;
  rating?: number;
  features: RestaurantFeature[];
  reservationProvider?: string;
  reservationProviderRestaurantId?: string;
  directBookingEnabled: boolean;
  phoneBookingEnabled: boolean;
  status: RestaurantStatus;
  providerConnections?: RestaurantProviderConnection[];
}

/** Restaurant agent behaviour config. Never changes the AI core — only guides it. */
export interface RestaurantAgentConfig {
  restaurantId: string;
  preferredLanguage?: string;
  supportedLanguages: string[];
  phoneBookingEnabled: boolean;
  onlineBookingEnabled: boolean;
  requiresCustomerPhone: boolean;
  requiresCustomerName: boolean;
  confirmationRequired: boolean;
  specialInstructions?: string;
  callScript?: string;
}
