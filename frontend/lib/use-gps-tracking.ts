'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface GPSPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
  speed: number | null;
}

export interface GPSTrackingState {
  isTracking: boolean;
  trail: GPSPoint[];
  error: string | null;
  errorCode: number | null;
  elapsed: number;          // seconds
  distanceMeters: number;   // rough running total
  currentSpeed: number | null;
  permissionDenied: boolean;
}

const INTERVAL_MS = 5000;

/** Haversine distance between two points in meters */
function haversine(a: GPSPoint, b: GPSPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function useGPSTracking() {
  const [state, setState] = useState<GPSTrackingState>({
    isTracking: false,
    trail: [],
    error: null,
    errorCode: null,
    elapsed: 0,
    distanceMeters: 0,
    currentSpeed: null,
    permissionDenied: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const trailRef = useRef<GPSPoint[]>([]);
  const distRef = useRef(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRecordedRef = useRef(0);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation not supported by this browser.' }));
      return;
    }

    trailRef.current = [];
    distRef.current = 0;
    startTimeRef.current = Date.now();
    lastRecordedRef.current = 0;

    setState({
      isTracking: true,
      trail: [],
      error: null,
      errorCode: null,
      elapsed: 0,
      distanceMeters: 0,
      currentSpeed: null,
      permissionDenied: false,
    });

    // Elapsed timer
    timerRef.current = setInterval(() => {
      setState(s => ({
        ...s,
        elapsed: Math.round((Date.now() - startTimeRef.current) / 1000),
      }));
    }, 1000);

    // GPS watcher
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        // Throttle to ~5s intervals
        if (now - lastRecordedRef.current < INTERVAL_MS - 500) return;
        lastRecordedRef.current = now;

        const point: GPSPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: now,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
        };

        const prev = trailRef.current[trailRef.current.length - 1];
        if (prev) {
          distRef.current += haversine(prev, point);
        }

        trailRef.current.push(point);

        setState(s => ({
          ...s,
          trail: [...trailRef.current],
          distanceMeters: Math.round(distRef.current),
          currentSpeed: pos.coords.speed,
          error: null,
        }));
      },
      (err) => {
        let msg = 'Location error.';
        if (err.code === 1) msg = 'Location permission denied. Please allow GPS access.';
        else if (err.code === 2) msg = 'Location unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setState(s => ({ ...s, error: msg, errorCode: err.code, permissionDenied: err.code === 1 }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      },
    );
  }, []);

  const stop = useCallback((): GPSPoint[] => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const finalTrail = [...trailRef.current];

    setState(s => ({
      ...s,
      isTracking: false,
      trail: finalTrail,
    }));

    return finalTrail;
  }, []);

  const reset = useCallback(() => {
    stop();
    trailRef.current = [];
    distRef.current = 0;
    setState({
      isTracking: false,
      trail: [],
      error: null,
      errorCode: null,
      elapsed: 0,
      distanceMeters: 0,
      currentSpeed: null,
      permissionDenied: false,
    });
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { ...state, start, stop, reset };
}
