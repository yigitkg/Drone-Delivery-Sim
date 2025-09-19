import { useEffect, useRef, useState } from 'react';
import * as turf from '@turf/turf';

export type LatLng = [number, number]; // [lat, lng]

export type DroneStatus = 'Idle' | 'EnRoute' | 'Arrived';

export interface DroneSimControls {
  running: boolean;
  speedKmh: number;
  timeScale?: number;
}

export interface DroneSimState {
  position: LatLng;
  progress: number; // 0..1
  distanceTraveledM: number;
  totalDistanceM: number;
  remainingM: number;
  etaSec: number | null;
  status: DroneStatus;
  altitudeM: number;
  batteryPct: number; // 0..100
  droneHealth: 'Iyi' | 'Dikkat' | 'Kritik';
  currentSpeedKmh: number;
  elapsedSec: number;
}

export function useDroneSim(start: LatLng, end: LatLng, controls: DroneSimControls) {
  const [state, setState] = useState<DroneSimState>(() => {
    const line = turf.lineString([[start[1], start[0]], [end[1], end[0]]]);
    const totalKm = turf.length(line, { units: 'kilometers' });
    const totalM = totalKm * 1000;
    return {
      position: start,
      progress: 0,
      distanceTraveledM: 0,
      totalDistanceM: totalM,
      remainingM: totalM,
      etaSec: null,
      status: 'Idle',
      altitudeM: 0,
      batteryPct: 100,
      droneHealth: 'Iyi',
      currentSpeedKmh: 0,
      elapsedSec: 0,
    };
  });

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  // reset when endpoints change
  useEffect(() => {
    const line = turf.lineString([[start[1], start[0]], [end[1], end[0]]]);
    const totalKm = turf.length(line, { units: 'kilometers' });
    const totalM = totalKm * 1000;
    setState({
      position: start,
      progress: 0,
      distanceTraveledM: 0,
      totalDistanceM: totalM,
      remainingM: totalM,
      etaSec: null,
      status: controls.running ? 'EnRoute' : 'Idle',
      altitudeM: controls.running ? 60 : 0,
      batteryPct: 100,
      droneHealth: 'Iyi',
      currentSpeedKmh: 0,
      elapsedSec: 0,
    });
  }, [start[0], start[1], end[0], end[1]]);

  useEffect(() => {
    const line = turf.lineString([[start[1], start[0]], [end[1], end[0]]]);
    const totalKm = turf.length(line, { units: 'kilometers' });
    const totalM = Math.max(0.000001, totalKm * 1000);

    const loop = (now: number) => {
      if (lastRef.current == null) lastRef.current = now;
      let dt = now - lastRef.current;
      lastRef.current = now;
      dt = Math.min(dt, 200); // cap to avoid large jumps

      setState((s) => {
        const timeScale = controls.timeScale ?? 1;
        const targetMps = (controls.speedKmh / 3.6) * timeScale;
        let distanceTraveledM = s.distanceTraveledM;
        let status: DroneStatus = s.status;
        const dtSec = dt / 1000;
        const dtEffSec = dtSec * timeScale; // simulation time scaling

        // Linear profile: ramp-up first 5s, ramp-down near arrival (aggressive ease-out)
        const elapsedSec = controls.running && status !== 'Arrived' ? s.elapsedSec + dtEffSec : s.elapsedSec;
        const remainingM = Math.max(0, totalM - distanceTraveledM);
        const remainingTimeAtTarget = targetMps > 0 ? remainingM / targetMps : Infinity;
        const rampUpFactor = Math.min(1, elapsedSec / 5);
        // Aggressive ease-out over the last 3 seconds
        const rampWindow = 3;
        const rampDownFactor = remainingTimeAtTarget > rampWindow
          ? 1
          : Math.max(0, 1 - Math.pow(1 - (remainingTimeAtTarget / rampWindow), 4));
        const profileFactor = controls.running ? Math.min(rampUpFactor, rampDownFactor) : 0;
        const speedMps = Math.max(0, targetMps * profileFactor);

        if (controls.running && status !== 'Arrived') {
          distanceTraveledM += speedMps * dtEffSec;
          status = 'EnRoute';
        } else if (!controls.running && s.progress === 0) {
          status = 'Idle';
        }
        const clamped = Math.min(distanceTraveledM, totalM);
        const progress = Math.max(0, Math.min(1, clamped / totalM));
        const remainingMAfter = Math.max(0, totalM - clamped);
        // Freeze ETA when paused by keeping last known value if speed is zero
        const etaSec = speedMps > 0 ? (remainingMAfter / speedMps) : s.etaSec;

        // Compute along position
        const along = turf.along(line, (clamped / 1000), { units: 'kilometers' });
        const [lng, lat] = along.geometry.coordinates as [number, number];
        const position: LatLng = [lat, lng];

        // Arrived condition (tolerant): mark arrived when very close
        if (remainingMAfter <= 0.5 || progress >= 0.999) {
          status = 'Arrived';
        }

        // Keep altitude steady when paused; set to cruise (60) while en route, 0 on reset/arrive handled elsewhere
        const altitudeM = controls.running ? 60 : s.altitudeM;

        // Battery model: ~2% per km consumption based on ground distance
        const consumedPct = (clamped / 1000) * 2; // %
        const batteryPct = Math.max(0, 100 - consumedPct);
        let droneHealth: DroneSimState['droneHealth'] = 'Iyi';
        if (batteryPct <= 15) droneHealth = 'Kritik';
        else if (batteryPct <= 25) droneHealth = 'Dikkat';

        return {
          position,
          progress,
          distanceTraveledM: clamped,
          totalDistanceM: totalM,
          remainingM: remainingMAfter,
          etaSec,
          status,
          altitudeM,
          batteryPct,
          droneHealth,
          currentSpeedKmh: speedMps * 3.6,
          elapsedSec,
        };
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [controls.running, controls.speedKmh, controls.timeScale, start[0], start[1], end[0], end[1]]);

  const api = {
    reset: () => {
      const line = turf.lineString([[start[1], start[0]], [end[1], end[0]]]);
      const totalKm = turf.length(line, { units: 'kilometers' });
      const totalM = totalKm * 1000;
      setState({
        position: start,
        progress: 0,
        distanceTraveledM: 0,
        totalDistanceM: totalM,
        remainingM: totalM,
        etaSec: null,
        status: 'Idle',
        altitudeM: 0,
        batteryPct: 100,
        droneHealth: 'Iyi',
        currentSpeedKmh: 0,
        elapsedSec: 0,
      });
    },
  };

  return { state, api };
}
