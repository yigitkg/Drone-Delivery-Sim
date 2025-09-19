# Drone Delivery Sim

Real-time delivery drone flight simulation with a clean, professional UI. The map shows start, destination, live drone position, and the traveled route polyline. Metrics include drone speed, distance traveled, total/remaining distance, ETA, weather, and package status. Built with React, TypeScript, Tailwind, Vite, React-Leaflet, and Turf.

## Run Locally

Prerequisites:
- Node.js 20.19+ recommended (Vite 5+).

Steps:
1) Clone the repo and navigate into the app folder
   - `git clone https://github.com/yigitkg/Drone-Delivery-Sim.git`
   - `cd Drone-Delivery-Sim`
2) Install dependencies
   - `npm install`
3) Start the dev server
   - `npm run dev`
4) Open the URL shown (typically `http://localhost:5173`).

Useful scripts:
- `npm run build` — production build
- `npm run preview` — preview built app
- `npm run lint` — run ESLint

## Features

- Start/destination markers and a route line between them.
- Live drone marker and an accumulating traveled trail polyline.
- Metrics: Drone Speed, Distance (traveled), Total/Remaining, ETA.
- Weather and Package Status (mocked for MVP).

## Configuration

- Default demo coordinates are embedded. Future enhancement can add URL parameters (e.g., `?start=lat,lng&end=lat,lng&speed=20`).
- Place a custom icon at `public/droneIcon.png` to use a drone marker; otherwise Leaflet default marker is used.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS for styling
- React-Leaflet + Leaflet for mapping
- Turf.js for geospatial calculations

