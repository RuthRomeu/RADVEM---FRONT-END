import React, { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

type View = "overview" | "map";

type Detection = {
  eventId: string;
  timestamp: number;
  angleDegrees: number;
  distanceMeters: number;
  xMeters: number;
  yMeters: number;
};

type ApiDetection = {
  event_id: string;
  timestamp: number | string;
  angle_degrees: number;
  distance_cm: number;
  x_cm: number;
  y_cm: number;
};

type DetectionsResponse = { detections: ApiDetection[]; total: number };

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://r5n6ko20ii.execute-api.us-east-2.amazonaws.com").replace(/\/$/, "");
const pollIntervalMs = Number(import.meta.env.VITE_DETECTIONS_POLL_INTERVAL_MS) || 5000;
const detectionLimit = 50;
const radarPointLimit = 20;

function toDetection(item: ApiDetection): Detection {
  const timestamp = typeof item.timestamp === "number" ? item.timestamp : Number(item.timestamp) || Date.parse(item.timestamp);
  return {
    eventId: item.event_id,
    timestamp,
    angleDegrees: item.angle_degrees,
    distanceMeters: item.distance_cm / 100,
    xMeters: item.x_cm / 100,
    yMeters: item.y_cm / 100,
  };
}

function useDetections() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [newDetectionIds, setNewDetectionIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = 0;
    let controller: AbortController | undefined;
    const fadeTimeouts = new Set<number>();

    const schedulePoll = () => {
      timeoutId = window.setTimeout(poll, pollIntervalMs);
    };

    const poll = async () => {
      if (document.visibilityState === "hidden") {
        schedulePoll();
        return;
      }
      controller = new AbortController();
      try {
        const response = await fetch(`${apiBaseUrl}/detections/latest?limit=${detectionLimit}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`A API respondeu com HTTP ${response.status}.`);
        const payload = await response.json() as DetectionsResponse;
        if (!Array.isArray(payload.detections)) throw new Error("A resposta da API não contém uma lista de detecções.");

        const latest = payload.detections.map(toDetection);
        const previousIds = knownIdsRef.current;
        const arrivals = previousIds ? latest.filter((item) => !previousIds.has(item.eventId)).map((item) => item.eventId) : [];
        knownIdsRef.current = new Set(latest.map((item) => item.eventId));

        if (!cancelled) {
          setDetections(latest);
          setNewDetectionIds(arrivals);
          setError(null);
          setLastUpdatedAt(Date.now());
          setIsLoading(false);
          if (arrivals.length) {
            const fadeTimeout = window.setTimeout(() => {
              setNewDetectionIds((current) => current.filter((id) => !arrivals.includes(id)));
              fadeTimeouts.delete(fadeTimeout);
            }, 2800);
            fadeTimeouts.add(fadeTimeout);
          }
        }
      } catch (fetchError) {
        if (!cancelled && !(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setError(fetchError instanceof Error ? fetchError.message : "Não foi possível consultar a API.");
          setIsLoading(false);
        }
      } finally {
        if (!cancelled) schedulePoll();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timeoutId);
        void poll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void poll();
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearTimeout(timeoutId);
      fadeTimeouts.forEach((id) => window.clearTimeout(id));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { detections, newDetectionIds, error, isLoading, lastUpdatedAt };
}

function formatTimestamp(timestamp: number) {
  if (!Number.isFinite(timestamp)) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(timestamp);
}

function shortId(eventId: string) {
  return eventId.length > 12 ? `${eventId.slice(0, 8)}…` : eventId;
}

function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <>{/* Local primitive keeps all button behavior consistent. */}{React.createElement("button", props)}</>;
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return React.createElement("input", props);
}

function Icon({ name, size = 20 }: { name: "grid" | "radar" | "pulse" | "bell" | "search" | "calendar" | "chevron" | "arrow" | "target" | "distance"; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="m12 12 6.4-6.4" /><circle cx="17.5" cy="8" r="1.2" className="icon-fill" /></>,
    pulse: <path d="M3 12h4l2.2-6 4.2 12 2.3-6H21" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
    distance: <><path d="M4 17 17 4" /><path d="M8 4h9v9" /><path d="M4 9v11h11" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Logo() {
  return (
    <div className="logo-lockup">
      <div className="logo-mark"><span className="logo-orbit" /><span className="logo-core" /></div>
      <div><strong>RADAR</strong><span>MONITOR</span></div>
    </div>
  );
}

function Sidebar({ active, onChange, error, lastUpdatedAt }: { active: View; onChange: (view: View) => void; error: string | null; lastUpdatedAt: number | null }) {
  return (
    <aside className="sidebar">
      <Logo />
      <nav className="nav">
        <span className="nav-label">NAVEGAÇÃO</span>
        <Button className={`nav-item ${active === "overview" ? "active" : ""}`} onClick={() => onChange("overview")}>
          <Icon name="grid" /><span>Visão Geral</span>
        </Button>
        <Button className={`nav-item ${active === "map" ? "active" : ""}`} onClick={() => onChange("map")}>
          <Icon name="radar" /><span>Mapa de Detecções</span>
        </Button>
      </nav>
      <div className="system-card">
        <div className={`system-head ${error ? "disconnected" : !lastUpdatedAt ? "pending" : ""}`}><span className={`status-dot ${error ? "offline" : !lastUpdatedAt ? "pending" : ""}`} /><span>{error ? "API DESCONECTADA" : lastUpdatedAt ? "API CONECTADA" : "CONECTANDO À API"}</span></div>
        <div className="system-row"><span>Última consulta</span><strong>{lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString("pt-BR") : "—"}</strong></div>
        <div className="system-row"><span>Atualização</span><strong>{pollIntervalMs / 1000}s</strong></div>
      </div>
      <div className="operator">
        <div className="avatar">EC</div>
        <div><strong>Eng. Carlos</strong><span>Operador Nível 2</span></div>
        <Icon name="chevron" size={16} />
      </div>
    </aside>
  );
}

function Header({ title, eyebrow, children }: { title: string; eyebrow: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="title-block">
        <span className="eyebrow">{eyebrow}</span>
        <div className="page-title">{title}</div>
      </div>
      <div className="header-actions">
        {children}
        <Button className="icon-button" aria-label="Notificações"><Icon name="bell" /></Button>
      </div>
    </header>
  );
}

function KpiCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: "pulse" | "target" | "distance"; tone: string }) {
  return (
    <div className={`kpi-card ${tone}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon"><Icon name={icon} /></span>
      </div>
      <strong className="kpi-value">{value}</strong>
      <div className="kpi-detail"><span className="mini-dot" />{detail}</div>
      <div className="kpi-glow" />
    </div>
  );
}

function Overview({ detections, error, isLoading, onOpenMap }: { detections: Detection[]; error: string | null; isLoading: boolean; onOpenMap: () => void }) {
  const [search, setSearch] = useState("");
  const filteredDetections = detections.filter((item) => item.eventId.toLowerCase().includes(search.trim().toLowerCase()));
  const latestDetection = detections[0];
  const averageDistance = detections.length ? detections.reduce((sum, item) => sum + item.distanceMeters, 0) / detections.length : 0;

  return (
    <>
      <Header title="Visão Geral do Radar" eyebrow="PAINEL DE MONITORAMENTO">
        <div className="status-select-wrap"><span className={`status-dot ${error ? "offline" : ""}`} /><span className="api-status">{error ? "API indisponível" : isLoading ? "Conectando à API" : "API conectada"}</span></div>
      </Header>
      <main className="content">
        <section className="kpi-grid">
          <KpiCard label="DETECÇÕES CARREGADAS" value={String(detections.length)} detail={`Últimos ${detectionLimit} registros da API`} icon="pulse" tone="blue" />
          <KpiCard label="ÚLTIMA DETECÇÃO" value={latestDetection ? new Date(latestDetection.timestamp).toLocaleTimeString("pt-BR") : "—"} detail={latestDetection ? formatTimestamp(latestDetection.timestamp) : "Nenhum registro recebido"} icon="target" tone="green" />
          <KpiCard label="DISTÂNCIA MÉDIA" value={detections.length ? `${averageDistance.toFixed(2)} m` : "—"} detail="Média dos registros carregados" icon="distance" tone="purple" />
        </section>

        <section className="panel table-panel">
          <div className="panel-header">
            <div><div className="panel-title">Histórico de Detecções</div><span className="panel-subtitle">Atualizado automaticamente a cada {pollIntervalMs / 1000} segundos</span></div>
            <div className="panel-tools">
              <label className="search-field"><Icon name="search" size={17} /><Input placeholder="Buscar por ID..." aria-label="Buscar detecção" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <Button className="secondary-button" onClick={onOpenMap}>Ver no mapa <Icon name="arrow" size={17} /></Button>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>ID DO EVENTO</th><th>DATA/HORA</th><th>COORDENADA X</th><th>COORDENADA Y</th><th>DISTÂNCIA</th></tr></thead>
              <tbody>{filteredDetections.map((item) => (
                <tr key={item.eventId}>
                  <td title={item.eventId}><span className="id-cell"><i />{shortId(item.eventId)}</span></td>
                  <td>{formatTimestamp(item.timestamp)}</td>
                  <td><span className={`coordinate ${item.xMeters >= 0 ? "positive" : "negative"}`}>{item.xMeters > 0 ? "+" : ""}{item.xMeters.toFixed(2)}</span><small> m</small></td>
                  <td><span className={`coordinate ${item.yMeters >= 0 ? "positive" : "negative"}`}>{item.yMeters > 0 ? "+" : ""}{item.yMeters.toFixed(2)}</span><small> m</small></td>
                  <td>{item.distanceMeters.toFixed(2)} m</td>
                </tr>
              ))}</tbody>
            </table>
            {isLoading && <div className="table-message">Carregando detecções…</div>}
            {!isLoading && error && <div className="table-message error-message">Não foi possível carregar as detecções. {error}</div>}
            {!isLoading && !error && filteredDetections.length === 0 && <div className="table-message">{search ? "Nenhuma detecção corresponde à busca." : "A API ainda não recebeu detecções."}</div>}
          </div>
          <div className="table-footer"><span>Exibindo {filteredDetections.length} de {detections.length} registros recentes</span><span>Limite por consulta: {detectionLimit}</span></div>
        </section>
      </main>
    </>
  );
}

function RadarMap({ detections, newDetectionIds, selectedId, onSelect }: { detections: Detection[]; newDetectionIds: string[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const visibleDetections = detections.slice(0, radarPointLimit);
  const radarRange = Math.max(0.5, ...visibleDetections.map((item) => item.distanceMeters)) * 1.12;
  const positions = new Set<string>();
  const chartPoints = visibleDetections.flatMap((detection) => {
    const angle = Math.min(150, Math.max(0, detection.angleDegrees)) * Math.PI / 150;
    const radius = (detection.distanceMeters / radarRange) * 47;
    const x = 50 + radius * Math.cos(angle);
    const y = 50 - radius * Math.sin(angle);
    const position = `${x.toFixed(2)},${y.toFixed(2)}`;
    if (positions.has(position)) return [];
    positions.add(position);
    return [{ id: detection.eventId, x, y }];
  });

  return (
    <div className="radar-map">
      <svg viewBox="0 0 100 58" className="radar-svg" role="group" aria-label="Mapa simbólico das detecções com varredura de 180 graus">
        <defs>
          <radialGradient id="radarBg"><stop offset="0" stopColor="#0b2736" /><stop offset="1" stopColor="#07151f" /></radialGradient>
          <filter id="pointGlow"><feGaussianBlur stdDeviation="1.1" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <clipPath id="radarSweepArea"><path d="M50 50 L3 50 A47 47 0 0 1 97 50 Z" /></clipPath>
        </defs>
        <path d="M3 50 A47 47 0 0 1 97 50 Z" fill="url(#radarBg)" stroke="currentColor" strokeWidth=".3" />
        {[12, 23, 35, 47].map((r) => <path key={r} d={`M${50 - r} 50 A${r} ${r} 0 0 1 ${50 + r} 50`} className="grid-line" />)}
        <path d="M3 50h94M50 3v47M16.8 16.8 50 50 83.2 16.8" className="axis-line" />
        <g clipPath="url(#radarSweepArea)">
          <g className="symbolic-sweep" transform="rotate(-180 50 50)">
            <path d="M50 50 L96.3 41.8 A47 47 0 0 1 97 50 Z" className="sweep-trail" />
            <path d="M50 50 H97" className="sweep-beam" />
          </g>
        </g>
        <circle cx="50" cy="50" r="2" className="radar-center" />
        {chartPoints.map((point) => (
          <g key={point.id} className={`map-point ${selectedId === point.id ? "selected" : ""} ${newDetectionIds.includes(point.id) ? "recent-detection" : ""}`} onClick={() => onSelect(point.id)} role="button" tabIndex={0} aria-label={`Selecionar detecção ${shortId(point.id)}`} aria-pressed={selectedId === point.id} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(point.id); } }}>
            <circle cx={point.x} cy={point.y} r="3.8" className="point-hit-area" />
            {selectedId === point.id && <circle cx={point.x} cy={point.y} r="3.2" className="selection-ring" />}
            <g className="point-echo">
              <circle cx={point.x} cy={point.y} r="2.1" className="point-ring" />
              <circle cx={point.x} cy={point.y} r="1.15" className="point-core" filter="url(#pointGlow)" />
            </g>
            {newDetectionIds.includes(point.id) && <g className="detection-flash"><circle cx={point.x} cy={point.y} r="2.2" /></g>}
          </g>
        ))}
        <text x="3" y="55" className="radar-angle" textAnchor="middle">180°</text>
        <text x="50" y="2" className="radar-angle" textAnchor="middle">90°</text>
        <text x="97" y="55" className="radar-angle" textAnchor="middle">0°</text>
      </svg>
      <div className="radar-scale"><span>0</span><i /><span>{radarRange.toFixed(1)} m</span></div>
      <div className="map-live"><span className="status-dot" />RADAR SIMBÓLICO</div>
    </div>
  );
}

function MapView({ detections, newDetectionIds, error, isLoading, lastUpdatedAt }: { detections: Detection[]; newDetectionIds: string[]; error: string | null; isLoading: boolean; lastUpdatedAt: number | null }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => detections.find((item) => item.eventId === selectedId) ?? detections[0] ?? null, [detections, selectedId]);
  const latestUpdate = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString("pt-BR") : null;

  return (
    <>
      <Header title="Mapeamento em Tempo Real" eyebrow="LOCALIZAÇÃO ESPACIAL">
        <div className="live-badge"><span className={`status-dot ${error ? "offline" : ""}`} />{error ? "SEM CONEXÃO" : "CONSULTA ATIVA"}</div>
      </Header>
      <main className="content map-content">
        <section className="filter-bar"><div><div className="filter-title">Detecções recentes</div><span className="panel-subtitle">{error ? `A consulta falhou: ${error}` : latestUpdate ? `Última consulta à API às ${latestUpdate}` : isLoading ? "Buscando detecções na API…" : "Aguardando a primeira consulta"}</span></div><span className="panel-subtitle">Atualização automática a cada {pollIntervalMs / 1000} segundos</span></section>
        <section className="map-layout">
          <div className="panel map-panel">
            <div className="map-toolbar">
              <div><div className="panel-title">Área de Detecção — Setor A</div><span className="panel-subtitle">Visualização simbólica · Últimas {Math.min(detections.length, radarPointLimit)} detecções</span></div>
              <div className="legend"><span><i className="green-dot" />Detecção registrada</span><span><i className="cyan-dot" />Detecção recente</span></div>
            </div>
            {detections.length ? <RadarMap detections={detections} newDetectionIds={newDetectionIds} selectedId={selected?.eventId ?? null} onSelect={setSelectedId} /> : <div className="radar-empty">{isLoading ? "Carregando detecções…" : error ? "Não foi possível carregar o mapa." : "Aguardando a primeira detecção."}</div>}
          </div>
          <aside className="detail-panel panel">
            <div className="detail-head"><span>DETALHES DA DETECÇÃO</span>{selected && newDetectionIds.includes(selected.eventId) && <span className="signal-tag">RECÉM DETECTADA</span>}</div>
            {selected ? <>
              <div className="selected-visual"><div className="target-rings"><span /><i /></div><span>ITEM SELECIONADO</span><strong title={selected.eventId}>{shortId(selected.eventId)}</strong></div>
              <div className="detail-list">
                <div><span>Data e hora</span><strong>{formatTimestamp(selected.timestamp)}</strong></div>
                <div><span>Ângulo</span><strong className="green-text">{selected.angleDegrees.toFixed(1)}°</strong></div>
                <div><span>Coordenada X</span><strong className="green-text">{selected.xMeters > 0 ? "+" : ""}{selected.xMeters.toFixed(2)} m</strong></div>
                <div><span>Coordenada Y</span><strong className={selected.yMeters < 0 ? "red-text" : "green-text"}>{selected.yMeters > 0 ? "+" : ""}{selected.yMeters.toFixed(2)} m</strong></div>
                <div><span>Distância da base</span><strong>{selected.distanceMeters.toFixed(2)} m</strong></div>
              </div>
              <div className="signal-meter"><div><span>STATUS DO REGISTRO</span><strong>{newDetectionIds.includes(selected.eventId) ? "NOVO" : "REGISTRADO"}</strong></div><span>O ponto recém detectado brilha e desvanece.</span></div>
            </> : <div className="empty-detail">Selecione um ponto do mapa quando houver detecções.</div>}
          </aside>
        </section>
      </main>
    </>
  );
}

export default function App() {
  const [view, setView] = useState<View>("overview");
  const { detections, newDetectionIds, error, isLoading, lastUpdatedAt } = useDetections();
  return (
    <div className="app-shell">
      <Sidebar active={view} onChange={setView} error={error} lastUpdatedAt={lastUpdatedAt} />
      <div className="main-area">
        {view === "overview" ? <Overview detections={detections} error={error} isLoading={isLoading} onOpenMap={() => setView("map")} /> : <MapView detections={detections} newDetectionIds={newDetectionIds} error={error} isLoading={isLoading} lastUpdatedAt={lastUpdatedAt} />}
      </div>
    </div>
  );
}
