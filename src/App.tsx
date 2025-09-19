import './App.css'
import './index.css'
import { useMemo, useRef, useState } from 'react'
import { MapDrone } from './map/MapDrone'
import { useDroneSim } from './drone/useDroneSim'
function StatusPill({ label, color }: { label: string; color: 'green' | 'yellow' | 'red' | 'blue' }) {
  const cls = color === 'green' ? 'status-green' : color === 'yellow' ? 'status-yellow' : color === 'red' ? 'status-red' : 'status-blue'
  return <span className={`status-pill ${cls}`}><span className="w-2 h-2 rounded-full bg-current inline-block"></span>{label}</span>
}

function Header() {
  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10">
      <div className="flex items-center gap-3 text-xl font-semibold">
        <span className="text-emerald-400">🛩️</span>
        <span>Drone Teslimat Paneli</span>
      </div>
      <div className="text-sm text-slate-400">MVP Simulasyon</div>
    </div>
  )
}

function MetricsGrid({
  speedKmh,
  distanceM,
  totalDistanceM,
  remainingM,
  etaSec,
  position,
  weather,
  packageStatus,
  pickupBranchCode,
  droneSerial,
  altitudeM,
  batteryPct,
  deliveryAddress,
  droneHealth,
}: any) {
  const coord = Array.isArray(position) ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : '-';
  const fmtKmOrM = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`);
  const fmtEta = (s: number | null) => (s == null ? '-' : s >= 3600 ? `${Math.floor(s / 3600)}saat ${(Math.floor(s / 60) % 60)}dk` : `${Math.floor(s / 60)}dk ${Math.floor(s % 60)}sn`);
  const items = [
    { label: 'Drone Hizi', value: `${(Number(speedKmh)||0).toFixed(1)} km/sa` },
    { label: 'Mesafe', value: fmtKmOrM(distanceM) },
    { label: 'Toplam Mesafe', value: fmtKmOrM(totalDistanceM) },
    { label: 'Kalan Mesafe', value: fmtKmOrM(remainingM) },
    { label: 'ETA', value: fmtEta(etaSec) },
    { label: 'Hava Durumu', value: weather },
    { label: 'Paket Durumu', value: packageStatus },
    { label: 'Paket Alis Subesi', value: pickupBranchCode },
    { label: 'Drone Seri No', value: droneSerial },
    { label: 'Irtifa', value: `${Math.round(altitudeM)} m` },
    { label: 'Batarya', value: `${batteryPct.toFixed(0)}%` },
    { label: 'Teslimat Adresi', value: deliveryAddress, wrap: true },
    { label: 'Drone Sağlığı', value: droneHealth === 'Iyi' ? 'İyi' : droneHealth },
    { label: 'Koordinat', value: coord, mono: true, wrap: true },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
      {items.map((m: any) => (
        <div key={m.label} className="card p-3 min-h-[92px] flex flex-col justify-between">
          <div className="metric">
            <div className="text-slate-400 text-[11px] uppercase tracking-wider">{m.label}</div>
            <div
              title={String(m.value)}
              className={`value mt-1 text-center ${m.mono ? 'font-mono tabular-nums' : ''} ${m.wrap ? 'break-all text-base md:text-lg' : 'overflow-hidden text-ellipsis whitespace-nowrap text-xl md:text-2xl'}`}
            >
              {m.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Controls({ running, timeScale, speedKmh, onStart, onPause, onReset, onTimeScale, onSpeed, startLabel }: any) {
  return (
    <div className="card p-4 flex flex-wrap items-center gap-3">
      <button onClick={onStart} disabled={running} className="px-3 py-2 bg-emerald-600 disabled:opacity-50 hover:bg-emerald-500 rounded-lg">{startLabel || 'Baslat'}</button>
      <button onClick={onPause} disabled={!running} className="px-3 py-2 bg-slate-700 disabled:opacity-50 hover:bg-slate-600 rounded-lg">Duraklat</button>
      <button onClick={onReset} className="px-3 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg">Sifirla</button>
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm text-slate-400">Zaman</span>
        <div className="inline-flex rounded-lg overflow-hidden border border-slate-700">
          {[1,2,5,20].map((x) => (
            <button key={x} onClick={() => onTimeScale(x)} className={`px-3 py-2 text-sm ${timeScale===x? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{x}x</button>
          ))}
        </div>
        <span className="text-sm text-slate-400 ml-3">Hiz</span>
        <div className="inline-flex rounded-lg overflow-hidden border border-slate-700">
          {[10,20,40,60].map((v) => (
            <button key={v} onClick={() => onSpeed(v)} className={`px-3 py-2 text-sm ${speedKmh===v? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{v}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function App() {
  const startLL = useMemo<[number, number]>(() => [37.6568, 27.3660], [])
  const endLL = useMemo<[number, number]>(() => [37.6605, 27.3725], [])
  const [running, setRunning] = useState(false)
  const [timeScale, setTimeScale] = useState(1)
  const [speedKmh, setSpeedKmh] = useState(20)
  const trailRef = useRef<[number, number][]>([])
  const { state, api } = useDroneSim(startLL, endLL, { running, speedKmh, timeScale })
  const trail = useMemo(() => {
    if (running || state.progress > 0) {
      const last = trailRef.current[trailRef.current.length - 1]
      const cur = state.position
      if (!last || Math.hypot((cur[0]-last[0])*111000, (cur[1]-last[1])*90000) > 5) {
        trailRef.current = [...trailRef.current, cur]
      }
    }
    if (state.status === 'Idle' && state.progress === 0) {
      trailRef.current = []
    }
    return trailRef.current
  }, [state.position[0], state.position[1], running, state.status, state.progress])

  const statusLabel = state.status === 'Idle' ? 'Bosta' : state.status === 'EnRoute' ? 'Ucus Suruyor' : 'Varildi'
  const statusColor: any = state.status === 'Arrived' ? 'green' : running ? 'blue' : 'yellow'
  const weather = 'Acik, 24 C, Ruzgar 5 m/sn'
  const packageStatus = state.status === 'Arrived' ? 'Teslim Edildi' : running ? 'Dagitimda' : 'Hazirlaniyor'
  const pickupBranchCode = 'BR-IST-012'
  const droneSerial = 'DRN-AX45-2025-001'
  const deliveryAddress = 'Bostanli Mah., 1803/1 Sk. No:12, Karsiyaka/Izmir'
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="w-full p-0 space-y-4">
        <div className="flex items-center justify-between px-6 xl:px-8 2xl:px-12">
          <StatusPill label={statusLabel} color={statusColor as any} />
        </div>
        <div className="w-full px-6 xl:px-8 2xl:px-12">
          <Controls
            running={running}
            timeScale={timeScale}
            speedKmh={state.currentSpeedKmh}
            onStart={() => setRunning(true)}
            onPause={() => setRunning(false)}
            onReset={() => { setRunning(false); api.reset(); }}
            onTimeScale={(v: number) => setTimeScale(v)}
            onSpeed={(v: number) => setSpeedKmh(v)} startLabel={startLabel} />
          <MetricsGrid
            speedKmh={state.currentSpeedKmh}
            distanceM={state.distanceTraveledM}
            totalDistanceM={state.totalDistanceM}
            remainingM={state.remainingM}
            etaSec={state.etaSec}
            position={state.position}
            weather={weather}
            packageStatus={packageStatus}
            pickupBranchCode={pickupBranchCode}
            droneSerial={droneSerial}
            altitudeM={state.altitudeM}
            batteryPct={state.batteryPct}
            deliveryAddress={deliveryAddress}
            droneHealth={state.droneHealth}
          />
        </div>
        <div className="w-full px-6 xl:px-8 2xl:px-12">
          <MapDrone start={startLL} end={endLL} position={state.position} traveled={trail} />
        </div>
      </main>
    </div>
  )
}

export default App



