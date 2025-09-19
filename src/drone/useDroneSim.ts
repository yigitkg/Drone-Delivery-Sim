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
        const speedMps = (controls.speedKmh / 3.6) * timeScale;
        let distanceTraveledM = s.distanceTraveledM;
        let status: DroneStatus = s.status;
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

        return {
          position,
          progress,
          distanceTraveledM: clamped,
          totalDistanceM: totalM,
          remainingM,
          etaSec,
          status,
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
      });
    },
  };

  return { state, api };
}

