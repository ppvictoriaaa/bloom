import apiClient from './client';

const recClient = apiClient;

// ── Types ──────────────────────────────────────────────────────────────────

export type EventType = 'watering' | 'fertilizing' | 'harvesting' | 'care';
export type EventStatus = 'planned' | 'done' | 'skipped';
export type EventSource = 'base' | 'weather-adjusted' | 'manual';
export type AccuracyLevel = 'high' | 'estimated';

export interface CalendarEvent {
  id: string;
  plantSlug: string;
  plantLabel?: string;
  type: EventType;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  status: EventStatus;
  source: EventSource;
  weatherAdjusted: boolean;
  accuracyLevel: AccuracyLevel;
  metadata?: {
    variety?: string;
    soilType?: string;
    originalDate?: string;
    shiftReason?: string;
    temperature?: number;
    precipitation?: number;
  };
}

export interface WeatherDay {
  date: string;   // YYYY-MM-DD
  precip: number; // mm
  maxTemp: number; // °C
}

export interface CalendarResponse {
  gardenId: string;
  generatedAt: string;
  calendarStart: string;
  calendarEnd: string;
  weatherApplied: boolean;
  weatherAccuracyDays: number;
  notice: string;
  events: CalendarEvent[];
  weatherDays?: WeatherDay[];
}

export interface PlantCareRule {
  plantSlug: string;
  category: string;
  supportsVarieties: boolean;
  varietyType: 'ripening' | 'harvestSeason' | 'none';
  allowedVarieties: string[];
}

export interface WeatherRefreshResponse {
  gardenId: string;
  weatherAccuracyDays: number;
  adjustedEvents: number;
  notice: string;
}

export interface GenerateCalendarPayload {
  userId: string;
  gardenId: string;
  location: { latitude: number; longitude: number; city?: string };
  soilType?: 'sandy' | 'loamy' | 'clay';
  months?: number;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const recommendationsApi = {
  generateCalendar: (data: GenerateCalendarPayload) =>
    recClient.post<CalendarResponse>('/care-calendar/generate', data),

  getCalendar: (gardenId: string) =>
    recClient.get<CalendarResponse>(`/care-calendar/${gardenId}`),

  refreshWeather: (gardenId: string) =>
    recClient.post<WeatherRefreshResponse>(`/care-calendar/${gardenId}/refresh-weather`),

  updateEventStatus: (eventId: string, status: EventStatus) =>
    recClient.patch<CalendarEvent>(`/care-calendar/events/${eventId}/status`, { status }),

  addPlants: (gardenId: string, plants: { slug: string; label?: string }[]) =>
    recClient.post<CalendarResponse>(`/care-calendar/${gardenId}/add-plants`, { plants }),

  deleteCalendar: (gardenId: string) =>
    recClient.delete(`/care-calendar/${gardenId}`),

  getGardensWithCalendar: (gardenIds: string[]) =>
    recClient.get<string[]>(`/care-calendar/with-calendar?gardenIds=${gardenIds.join(',')}`),

  getPlantCareRules: (slugs: string[]): Promise<PlantCareRule[]> =>
    recClient
      .get<PlantCareRule[]>('/plant-care-rules')
      .then((r) => r.data.filter((rule) => slugs.includes(rule.plantSlug))),
};

// ── Geocoding via Open-Meteo (free, no API key) ───────────────────────────

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  name: string; // "Kyiv, Ukraine"
}

export const geocodeCity = async (city: string): Promise<GeocodedLocation | null> => {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
    );
    const data = await res.json();
    if (data.results?.[0]) {
      const r = data.results[0];
      return {
        latitude: r.latitude,
        longitude: r.longitude,
        name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
      };
    }
    return null;
  } catch {
    return null;
  }
};
