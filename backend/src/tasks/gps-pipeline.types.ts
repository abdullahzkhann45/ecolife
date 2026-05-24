export interface GPSPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
  speed?: number | null;
}

export type TransportMode = 'walking' | 'cycling' | 'vehicle' | 'stationary' | 'unknown';
export type TaskTransportType = 'walking' | 'cycling' | 'public_transport' | 'carpool';

export interface CleanedTrail {
  points: GPSPoint[];
  discardedCount: number;
  totalOriginalCount: number;
  accuracyRatio: number;
}

export interface Segment {
  from: GPSPoint;
  to: GPSPoint;
  distanceM: number;
  timeSec: number;
  speedKmh: number;
  index: number;
}

export interface AntiCheatResult {
  segments: Segment[];
  totalDistanceM: number;
  durationSec: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  teleportCount: number;
  gapCount: number;
  coverageRatio: number;
  confidence: number;
  flags: string[];
}

export interface ModeVerdict {
  approved: boolean;
  mode: TransportMode;
  rejectionReason: string | null;
  pointsMultiplier: number;
  needsManualReview: boolean;
  needsPhoto: boolean;
}

export interface GPSVerdict {
  approved: boolean;
  mode: TransportMode;
  taskTransportType: TaskTransportType;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  confidence: number;
  pointsCount: number;
  flags: string[];
  co2SavedGrams: number;
  needsManualReview: boolean;
  needsPhoto: boolean;
  pointsMultiplier: number;
  rejectionReason: string | null;
  accuracyRatio: number;
}
