export const GPS_THRESHOLDS = {
  walking: { avgMin: 2, avgMax: 8, sustainedMax: 10, minDistanceM: 300, minDurationSec: 180 },
  cycling: { avgMin: 8, avgMax: 30, sustainedMax: 35, minDistanceM: 500, minDurationSec: 120 },
  publicTransport: {
    vehicleProveSpeedKmh: 12, vehicleProveDurationSec: 30,
    maxSpeedKmh: 80, maxSpeedSustainedSec: 60,
    minSessionDurationSec: 120, requiresPhoto: true, minDistanceM: 0,
  },
  anticheat: {
    maxAccuracyM: 50, teleportDistM: 200, teleportTimeSec: 10,
    maxTimeGapSec: 30, sustainedWindowSec: 30, noiseDiscardSpeedKmh: 150,
    minPoints: 2, coverageRatioMin: 0.5,
  },
  confidence: {
    startingScore: 100, teleportPenalty: 10, gapPenalty: 15,
    lowCoveragePenalty: 20, coverageThreshold: 0.7, manualReviewThreshold: 50,
  },
  retention: { rawTrailTtlDays: 7 },
  co2PerKm: { walking: 170, cycling: 165, vehicle: 0, stationary: 0, unknown: 0 } as Record<string, number>,
};

export type GPSThresholds = typeof GPS_THRESHOLDS;
