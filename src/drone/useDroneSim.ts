import { useEffect, useRef, useState } from 'react';
import * as turf from '@turf/turf';

export type LatLng = [number, number]; // [lat, lng]

export type DroneStatus = 'Idle' | 'EnRoute' | 'Arrived';

export interface DroneSimControls {
  running: boolean;
  speedKmh: number;
  timeScale?: number;
}

 param($m) $block = $m.Groups[1].Value; if ($block -notmatch 'elapsedSec') { $block += "`n  elapsedSec: number;" }; "export interface DroneSimState {" + $block + "`n}" 

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

        // Accel/decel model (m/s^2)
        const accel = 2.5 * timeScale;
        const remainingNow = Math.max(0, Math.max(0, totalM - distanceTraveledM));
        const vAllowed = Math.sqrt(Math.max(0, 2 * accel * remainingNow));
        const desiredMps = controls.running ? Math.min(targetMps, vAllowed) : 0; // no ramp if not running
        const curMps = (s.currentSpeedKmh ?? 0) / 3.6;
        const dtSec = dt / 1000;
        let nextMps = curMps;
        if (desiredMps > curMps) nextMps = Math.min(desiredMps, curMps + accel * dtSec);
        else if (desiredMps < curMps) nextMps = Math.max(desiredMps, curMps - accel * dtSec);
        const speedMps = Math.max(0, nextMps);

        if (controls.running && status !== 'Arrived') {
          distanceTraveledM += speedMps * (dt / 1000);
          status = 'EnRoute';
        } else if (!controls.running && s.progress === 0) {
          status = 'Idle';
        }
        const clamped = Math.min(distanceTraveledM, totalM);
        const progress = Math.max(0, Math.min(1, clamped / totalM));
        const remainingM = Math.max(0, totalM - clamped);
        const etaSec = controls.running && speedMps > 0 ? remainingM / speedMps : null;

        // Compute along position
        const along = turf.along(line, (clamped / 1000), { units: 'kilometers' });
        const [lng, lat] = along.geometry.coordinates as [number, number];
        const position: LatLng = [lat, lng];

        // Arrived condition
        if (progress >= 1 - 1e-6) {
          status = 'Arrived';
        }

        // Simple altitude model: cruise 60m AGL when en route, 0 when idle/arrived
        const altitudeM = controls.running ? 60 : 0;

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
          remainingM,
          etaSec,
          status,
          altitudeM,
          batteryPct,
          droneHealth,
          currentSpeedKmh: speedMps * 3.6,
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
      });
    },
  };

  return { state, api };
}

