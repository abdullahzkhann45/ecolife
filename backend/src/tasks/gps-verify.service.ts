import { Injectable, Logger } from '@nestjs/common';
import { GPS_THRESHOLDS } from '../config/gps-thresholds';
import {
  GPSPoint, TransportMode, TaskTransportType, CleanedTrail,
  Segment, AntiCheatResult, ModeVerdict, GPSVerdict,
} from './gps-pipeline.types';

const turf = require('@turf/turf');
const T = GPS_THRESHOLDS;

@Injectable()
export class GPSVerifyService {
  private readonly logger = new Logger(GPSVerifyService.name);

  // ═══════════════════════════════════════════════════════════
  //  ORCHESTRATOR
  // ═══════════════════════════════════════════════════════════

  verify(trail: GPSPoint[], taskType: TaskTransportType, hasPhoto = false): GPSVerdict {
    // Basic validation
    if (!trail || trail.length < T.anticheat.minPoints) {
      return this.reject(taskType, 'insufficient_points',
        `Need at least ${T.anticheat.minPoints} GPS readings, got ${trail?.length ?? 0}`);
    }

    // Stage 1: Clean trail
    const cleaned = this.cleanTrail(trail);

    // GPS quality fallback
    if (cleaned.points.length < T.anticheat.minPoints) {
      return this.reject(taskType, 'low_accuracy',
        `Only ${cleaned.points.length} points within ${T.anticheat.maxAccuracyM}m accuracy`,
        cleaned.accuracyRatio);
    }

    if (cleaned.accuracyRatio < 0.5) {
      return {
        ...this.reject(taskType, 'gps_unreliable', 'GPS signal too weak to verify automatically'),
        needsPhoto: true, accuracyRatio: cleaned.accuracyRatio,
      };
    }

    // Stage 2: Anti-cheat
    const ac = this.runAntiCheat(cleaned);

    // Low confidence → auto manual review
    const forceManualReview = ac.confidence < T.confidence.manualReviewThreshold
      || (cleaned.accuracyRatio >= 0.5 && cleaned.accuracyRatio < 0.9);

    // Stage 3: Mode-specific verification
    const mv = this.verifyMode(taskType, ac, hasPhoto);

    // Apply GPS quality downgrade
    if (cleaned.accuracyRatio < 0.9 && cleaned.accuracyRatio >= 0.5) {
      mv.pointsMultiplier = Math.min(mv.pointsMultiplier, 0.5);
      mv.needsManualReview = true;
    }

    if (forceManualReview && mv.approved) {
      mv.needsManualReview = true;
    }

    const co2 = Math.round((T.co2PerKm[mv.mode] || 0) * (ac.totalDistanceM / 1000));

    const verdict: GPSVerdict = {
      approved: mv.approved,
      mode: mv.mode,
      taskTransportType: taskType,
      distanceMeters: Math.round(ac.totalDistanceM),
      distanceKm: parseFloat((ac.totalDistanceM / 1000).toFixed(2)),
      durationSeconds: Math.round(ac.durationSec),
      durationMinutes: parseFloat((ac.durationSec / 60).toFixed(1)),
      avgSpeedKmh: parseFloat(ac.avgSpeedKmh.toFixed(1)),
      maxSpeedKmh: parseFloat(ac.maxSpeedKmh.toFixed(1)),
      confidence: ac.confidence,
      pointsCount: cleaned.points.length,
      flags: ac.flags,
      co2SavedGrams: co2,
      needsManualReview: mv.needsManualReview,
      needsPhoto: mv.needsPhoto,
      pointsMultiplier: mv.pointsMultiplier,
      rejectionReason: mv.rejectionReason,
      accuracyRatio: parseFloat(cleaned.accuracyRatio.toFixed(2)),
    };

    this.logger.log(`GPS verdict: type=${taskType} mode=${mv.mode} dist=${verdict.distanceKm}km avg=${verdict.avgSpeedKmh}kmh conf=${ac.confidence} approved=${mv.approved}`);
    return verdict;
  }

  // ═══════════════════════════════════════════════════════════
  //  STAGE 1: CLEAN TRAIL
  // ═══════════════════════════════════════════════════════════

  cleanTrail(trail: GPSPoint[]): CleanedTrail {
    const sorted = [...trail].sort((a, b) => a.timestamp - b.timestamp);
    const totalOriginal = sorted.length;

    // Filter accuracy > threshold + speed noise > 150 km/h
    const clean = sorted.filter(p =>
      p.accuracy <= T.anticheat.maxAccuracyM &&
      (p.speed == null || (p.speed * 3.6) <= T.anticheat.noiseDiscardSpeedKmh)
    );

    return {
      points: clean,
      discardedCount: totalOriginal - clean.length,
      totalOriginalCount: totalOriginal,
      accuracyRatio: totalOriginal > 0 ? clean.length / totalOriginal : 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  STAGE 2: ANTI-CHEAT
  // ═══════════════════════════════════════════════════════════

  runAntiCheat(cleaned: CleanedTrail): AntiCheatResult {
    const pts = cleaned.points;
    const flags: string[] = [];
    let confidence = T.confidence.startingScore;
    let totalDist = 0;
    let maxSpeed = 0;
    let teleportCount = 0;
    let gapCount = 0;
    const segments: Segment[] = [];

    for (let i = 1; i < pts.length; i++) {
      const from = turf.point([pts[i - 1].lng, pts[i - 1].lat]);
      const to = turf.point([pts[i].lng, pts[i].lat]);
      const distM = turf.distance(from, to, { units: 'meters' });
      const timeSec = (pts[i].timestamp - pts[i - 1].timestamp) / 1000;
      const speedKmh = timeSec > 0 ? (distM / 1000) / (timeSec / 3600) : 0;

      segments.push({ from: pts[i - 1], to: pts[i], distanceM: distM, timeSec, speedKmh, index: i });
      totalDist += distM;
      if (speedKmh > maxSpeed) maxSpeed = speedKmh;

      // Teleportation check
      if (distM > T.anticheat.teleportDistM && timeSec < T.anticheat.teleportTimeSec) {
        teleportCount++;
        flags.push(`teleport_at_${i}`);
        confidence -= T.confidence.teleportPenalty;
      }

      // Time gap check
      if (timeSec > T.anticheat.maxTimeGapSec) {
        gapCount++;
        flags.push(`time_gap_${Math.round(timeSec)}s_at_${i}`);
        confidence -= T.confidence.gapPenalty;
      }
    }

    // Turf line distance comparison (reduces jitter inflation)
    if (pts.length >= 2) {
      const line = turf.lineString(pts.map(p => [p.lng, p.lat]));
      const turfDist = turf.length(line, { units: 'meters' });
      totalDist = Math.min(totalDist, turfDist * 1.05);
    }

    const durationSec = pts.length >= 2
      ? (pts[pts.length - 1].timestamp - pts[0].timestamp) / 1000 : 0;

    // Coverage ratio
    const expectedPoints = durationSec / 5;
    const coverageRatio = expectedPoints > 0 ? pts.length / expectedPoints : 0;
    if (coverageRatio < T.anticheat.coverageRatioMin) {
      flags.push('incomplete_tracking');
    }
    if (coverageRatio < T.confidence.coverageThreshold) {
      confidence -= T.confidence.lowCoveragePenalty;
    }

    // Average speed (p90 cleaned)
    const speeds = segments.map(s => s.speedKmh).sort((a, b) => a - b);
    const p90 = speeds.slice(0, Math.max(1, Math.floor(speeds.length * 0.9)));
    const avgSpeed = p90.length > 0 ? p90.reduce((a, b) => a + b, 0) / p90.length : 0;

    confidence = Math.max(0, Math.min(100, confidence));

    return {
      segments, totalDistanceM: totalDist, durationSec,
      avgSpeedKmh: avgSpeed, maxSpeedKmh: maxSpeed,
      teleportCount, gapCount, coverageRatio,
      confidence, flags,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  STAGE 3: MODE-SPECIFIC VERIFICATION
  // ═══════════════════════════════════════════════════════════

  verifyMode(taskType: TaskTransportType, ac: AntiCheatResult, hasPhoto: boolean): ModeVerdict {
    switch (taskType) {
      case 'walking': return this._verifyWalking(ac);
      case 'cycling': return this._verifyCycling(ac);
      case 'public_transport': return this._verifyPublicTransport(ac, hasPhoto);
      case 'carpool': return this._verifyCarpool(ac);
      default: return this._verifyWalking(ac);
    }
  }

  private _verifyWalking(ac: AntiCheatResult): ModeVerdict {
    const base: ModeVerdict = {
      approved: false, mode: 'walking', rejectionReason: null,
      pointsMultiplier: 1, needsManualReview: false, needsPhoto: false,
    };

    // Duration check
    if (ac.durationSec < T.walking.minDurationSec) {
      base.rejectionReason = `Session too short (${Math.round(ac.durationSec)}s). Minimum ${T.walking.minDurationSec}s.`;
      return base;
    }

    // Distance check
    if (ac.totalDistanceM < T.walking.minDistanceM) {
      base.rejectionReason = `Distance too short (${Math.round(ac.totalDistanceM)}m). Minimum ${T.walking.minDistanceM}m.`;
      return base;
    }

    // Avg speed check
    if (ac.avgSpeedKmh < T.walking.avgMin) {
      base.rejectionReason = `Average speed too low (${ac.avgSpeedKmh.toFixed(1)} km/h). You may have been stationary.`;
      return base;
    }
    if (ac.avgSpeedKmh > T.walking.avgMax) {
      base.rejectionReason = `Average speed ${ac.avgSpeedKmh.toFixed(1)} km/h exceeds walking range.`;
      return base;
    }

    // Sustained speed check
    if (this._checkSustainedSpeed(ac.segments, T.walking.sustainedMax, T.anticheat.sustainedWindowSec)) {
      base.rejectionReason = `Speed exceeded ${T.walking.sustainedMax} km/h for ${T.anticheat.sustainedWindowSec}+ seconds — indicates vehicle.`;
      return base;
    }

    base.approved = true;
    return base;
  }

  private _verifyCycling(ac: AntiCheatResult): ModeVerdict {
    const base: ModeVerdict = {
      approved: false, mode: 'cycling', rejectionReason: null,
      pointsMultiplier: 1, needsManualReview: false, needsPhoto: false,
    };

    if (ac.durationSec < T.cycling.minDurationSec) {
      base.rejectionReason = `Session too short (${Math.round(ac.durationSec)}s). Minimum ${T.cycling.minDurationSec}s.`;
      return base;
    }

    if (ac.totalDistanceM < T.cycling.minDistanceM) {
      base.rejectionReason = `Distance too short (${Math.round(ac.totalDistanceM)}m). Minimum ${T.cycling.minDistanceM}m.`;
      return base;
    }

    if (ac.avgSpeedKmh < T.cycling.avgMin) {
      base.rejectionReason = `Average speed ${ac.avgSpeedKmh.toFixed(1)} km/h is below cycling range. Consider submitting as a walking task.`;
      base.mode = 'walking';
      return base;
    }

    if (ac.avgSpeedKmh > T.cycling.avgMax) {
      base.rejectionReason = `Average speed ${ac.avgSpeedKmh.toFixed(1)} km/h exceeds cycling range — indicates motorized vehicle.`;
      return base;
    }

    if (this._checkSustainedSpeed(ac.segments, T.cycling.sustainedMax, T.anticheat.sustainedWindowSec)) {
      base.rejectionReason = `Speed exceeded ${T.cycling.sustainedMax} km/h for ${T.anticheat.sustainedWindowSec}+ seconds — indicates motorized vehicle.`;
      return base;
    }

    base.approved = true;
    return base;
  }

  private _verifyPublicTransport(ac: AntiCheatResult, hasPhoto: boolean): ModeVerdict {
    const base: ModeVerdict = {
      approved: false, mode: 'vehicle', rejectionReason: null,
      pointsMultiplier: 1, needsManualReview: false, needsPhoto: false,
    };

    // Check 3: Duration
    if (ac.durationSec < T.publicTransport.minSessionDurationSec) {
      base.rejectionReason = `Session too short to verify (${Math.round(ac.durationSec)}s). Minimum ${T.publicTransport.minSessionDurationSec}s.`;
      return base;
    }

    // Check 1: Prove vehicle — sustained speed above 12 km/h for 30s
    const provedVehicle = this._checkSustainedSpeed(
      ac.segments, T.publicTransport.vehicleProveSpeedKmh, T.publicTransport.vehicleProveDurationSec
    );
    if (!provedVehicle) {
      base.rejectionReason = `Speed indicates walking, not vehicle transport. Never sustained ${T.publicTransport.vehicleProveSpeedKmh} km/h for ${T.publicTransport.vehicleProveDurationSec}s.`;
      return base;
    }

    // Check 2: Not highway — cumulative time above 80 km/h must be < 60s
    const highSpeedTime = this._cumulativeTimeAboveSpeed(ac.segments, T.publicTransport.maxSpeedKmh);
    if (highSpeedTime > T.publicTransport.maxSpeedSustainedSec) {
      base.rejectionReason = `Speed indicates private vehicle on highway. ${Math.round(highSpeedTime)}s above ${T.publicTransport.maxSpeedKmh} km/h.`;
      return base;
    }

    // Check 4: Photo
    if (!hasPhoto) {
      base.approved = true;
      base.pointsMultiplier = 0.5;
      base.needsManualReview = true;
      base.needsPhoto = true;
      base.rejectionReason = null;
      return base;
    }

    base.approved = true;
    return base;
  }

  private _verifyCarpool(ac: AntiCheatResult): ModeVerdict {
    const base: ModeVerdict = {
      approved: false, mode: 'vehicle', rejectionReason: null,
      pointsMultiplier: 1, needsManualReview: false, needsPhoto: false,
    };

    if (ac.durationSec < T.publicTransport.minSessionDurationSec) {
      base.rejectionReason = `Session too short (${Math.round(ac.durationSec)}s). Minimum ${T.publicTransport.minSessionDurationSec}s.`;
      return base;
    }

    const provedVehicle = this._checkSustainedSpeed(
      ac.segments, T.publicTransport.vehicleProveSpeedKmh, T.publicTransport.vehicleProveDurationSec
    );
    if (!provedVehicle) {
      base.rejectionReason = `Speed indicates walking, not vehicle transport.`;
      return base;
    }

    base.approved = true;
    return base;
  }

  // ═══════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════

  /** Check if speed exceeds threshold for windowSec consecutive seconds */
  private _checkSustainedSpeed(segments: Segment[], thresholdKmh: number, windowSec: number): boolean {
    let accumulated = 0;
    for (const seg of segments) {
      if (seg.speedKmh > thresholdKmh) {
        accumulated += seg.timeSec;
        if (accumulated >= windowSec) return true;
      } else {
        accumulated = 0;
      }
    }
    return false;
  }

  /** Sum total time where speed exceeds threshold (not necessarily consecutive) */
  private _cumulativeTimeAboveSpeed(segments: Segment[], thresholdKmh: number): number {
    return segments.reduce((sum, s) => sum + (s.speedKmh > thresholdKmh ? s.timeSec : 0), 0);
  }

  private reject(taskType: TaskTransportType, flag: string, reason: string, accuracyRatio = 0): GPSVerdict {
    this.logger.warn(`GPS rejected: ${flag} — ${reason}`);
    return {
      approved: false, mode: 'unknown', taskTransportType: taskType,
      distanceMeters: 0, distanceKm: 0, durationSeconds: 0, durationMinutes: 0,
      avgSpeedKmh: 0, maxSpeedKmh: 0, confidence: 0, pointsCount: 0,
      flags: [flag], co2SavedGrams: 0,
      needsManualReview: false, needsPhoto: false,
      pointsMultiplier: 0, rejectionReason: reason, accuracyRatio,
    };
  }
}
