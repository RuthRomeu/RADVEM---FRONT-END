import React, { useMemo, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

type View = "overview" | "map";

type Detection = {
  id: string;
  timestamp: string;
  x: number;
  y: number;
  signal: number;
};

const detections: Detection[] = [
  { id: "DET-8492", timestamp: "Hoje, 14:32:08", x: 342.82, y: -128.45, signal: 94 },
  { id: "DET-8491", timestamp: "Hoje, 14:28:41", x: -187.31, y: 296.72, signal: 87 },
  { id: "DET-8490", timestamp: "Hoje, 14:17:19", x: 92.14, y: 413.08, signal: 91 },
  { id: "DET-8489", timestamp: "Hoje, 13:54:03", x: -421.56, y: -84.19, signal: 79 },
  { id: "DET-8488", timestamp: "Hoje, 13:42:37", x: 256.77, y: 221.35, signal: 89 },
  { id: "DET-8487", timestamp: "Hoje, 13:31:12", x: -72.93, y: -365.21, signal: 83 },
  { id: "DET-8486", timestamp: "Hoje, 13:18:56", x: 438.06, y: 64.88, signal: 76 },
];

const chartPoints = [
  { id: "DET-8492", x: 72, y: 36 },
  { id: "DET-8491", x: 34, y: 31 },
  { id: "DET-8490", x: 58, y: 18 },
  { id: "DET-8489", x: 18, y: 57 },
  { id: "DET-8488", x: 66, y: 27 },
  { id: "DET-8487", x: 43, y: 76 },
  { id: "DET-8486", x: 81, y: 48 },
  { id: "DET-8485", x: 27, y: 72 },
  { id: "DET-8484", x: 61, y: 63 },
];

function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <>{/* Local primitive keeps all button behavior consistent. */}{React.createElement("button", props)}</>;
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return React.createElement("input", props);
}

function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return React.createElement("select", props);
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

function Sidebar({ active, onChange }: { active: View; onChange: (view: View) => void }) {
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
        <div className="system-head"><span className="status-dot" /><span>SISTEMA OPERACIONAL</span></div>
        <div className="system-row"><span>Sincronização</span><strong>Agora</strong></div>
        <div className="system-row"><span>Latência</span><strong>24ms</strong></div>
        <div className="system-bars"><i /><i /><i /><i /></div>
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

function Overview({ onOpenMap }: { onOpenMap: () => void }) {
  return (
    <>
      <Header title="Visão Geral do Radar" eyebrow="PAINEL DE MONITORAMENTO">
        <div className="status-select-wrap"><span className="status-dot" /><Select aria-label="Status do radar" defaultValue="online"><option value="online">Radar Online</option><option value="maintenance">Em manutenção</option></Select></div>
      </Header>
      <main className="content">
        <section className="kpi-grid">
          <KpiCard label="TOTAL DE DETECÇÕES" value="1.284" detail="+12,5% nas últimas 24h" icon="pulse" tone="blue" />
          <KpiCard label="ÚLTIMA DETECÇÃO" value="14:32:08" detail="Hoje, há 2 minutos" icon="target" tone="green" />
          <KpiCard label="DISTÂNCIA MÉDIA" value="328,4 m" detail="-4,2% vs. período anterior" icon="distance" tone="purple" />
          <div className="coverage-card">
            <span className="coverage-label">COBERTURA DO RADAR</span>
            <div className="coverage-body">
              <div className="gauge"><div><strong>94</strong><span>%</span></div></div>
              <div><strong>Área estável</strong><span>Raio operacional de 500m</span></div>
            </div>
          </div>
        </section>

        <section className="panel table-panel">
          <div className="panel-header">
            <div><div className="panel-title">Histórico de Detecções</div><span className="panel-subtitle">Registros mais recentes recebidos pela API</span></div>
            <div className="panel-tools">
              <label className="search-field"><Icon name="search" size={17} /><Input placeholder="Buscar detecção..." aria-label="Buscar detecção" /></label>
              <Button className="secondary-button" onClick={onOpenMap}>Ver no mapa <Icon name="arrow" size={17} /></Button>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>ID</th><th>DATA/HORA (TIMESTAMP)</th><th>COORDENADA X</th><th>COORDENADA Y</th><th /></tr></thead>
              <tbody>
                {detections.map((item) => (
                  <tr key={item.id}>
                    <td><span className="id-cell"><i />{item.id}</span></td>
                    <td>{item.timestamp}</td>
                    <td><span className="coordinate positive">{item.x > 0 ? "+" : ""}{item.x.toFixed(2)}</span><small> m</small></td>
                    <td><span className={`coordinate ${item.y > 0 ? "positive" : "negative"}`}>{item.y > 0 ? "+" : ""}{item.y.toFixed(2)}</span><small> m</small></td>
                    <td><Button className="row-action" aria-label={`Detalhes de ${item.id}`}><Icon name="chevron" size={16} /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer"><span>Exibindo 7 de 1.284 registros</span><div className="pagination"><Button disabled>Anterior</Button><Button className="current">1</Button><Button>2</Button><Button>3</Button><span>...</span><Button>184</Button><Button>Próximo</Button></div></div>
        </section>
      </main>
    </>
  );
}

function RadarMap({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="radar-map">
      <div className="radar-label north">N</div><div className="radar-label east">L</div><div className="radar-label south">S</div><div className="radar-label west">O</div>
      <svg viewBox="0 0 100 100" className="radar-svg" role="img" aria-label="Mapa cartesiano de detecções">
        <defs>
          <radialGradient id="radarBg"><stop offset="0" stopColor="#0b2736" /><stop offset="1" stopColor="#07151f" /></radialGradient>
          <filter id="pointGlow"><feGaussianBlur stdDeviation="1.1" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <linearGradient id="sweep" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#35f2b4" stopOpacity="0" /><stop offset="1" stopColor="#35f2b4" stopOpacity=".28" /></linearGradient>
        </defs>
        <circle cx="50" cy="50" r="47" fill="url(#radarBg)" stroke="currentColor" strokeWidth=".3" />
        {[12, 23, 35, 47].map((r) => <circle key={r} cx="50" cy="50" r={r} className="grid-line" />)}
        <path d="M3 50h94M50 3v94M17 17l66 66M83 17 17 83" className="axis-line" />
        <path d="M50 50 L50 3 A47 47 0 0 1 91 73 Z" fill="url(#sweep)" className="sweep" />
        <circle cx="50" cy="50" r="2" className="radar-center" />
        {chartPoints.map((point, index) => (
          <g key={point.id} className={`map-point ${selectedId === point.id ? "selected" : ""}`} onClick={() => onSelect(point.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect(point.id)}>
            <circle cx={point.x} cy={point.y} r={selectedId === point.id ? 3.2 : 2.1} className="point-ring" />
            <circle cx={point.x} cy={point.y} r="1.15" className={index % 4 === 0 ? "point-core amber" : "point-core"} filter="url(#pointGlow)" />
          </g>
        ))}
      </svg>
      <div className="radar-scale"><span>0</span><i /><span>500 m</span></div>
      <div className="map-live"><span className="status-dot" />VARREDURA ATIVA</div>
    </div>
  );
}

function MapView() {
  const [selectedId, setSelectedId] = useState("DET-8492");
  const selected = useMemo(() => detections.find((item) => item.id === selectedId) ?? detections[0], [selectedId]);
  return (
    <>
      <Header title="Mapeamento em Tempo Real" eyebrow="LOCALIZAÇÃO ESPACIAL">
        <div className="live-badge"><span className="status-dot" />TRANSMISSÃO AO VIVO</div>
      </Header>
      <main className="content map-content">
        <section className="filter-bar">
          <div><div className="filter-title">Intervalo de análise</div><span className="panel-subtitle">Selecione o período para filtrar as detecções</span></div>
          <div className="date-filters">
            <label><span>DATA/HORA INICIAL</span><div className="date-field"><Icon name="calendar" size={17} /><Input type="datetime-local" defaultValue="2025-05-19T00:00" /></div></label>
            <label><span>DATA/HORA FINAL</span><div className="date-field"><Icon name="calendar" size={17} /><Input type="datetime-local" defaultValue="2025-05-19T23:59" /></div></label>
            <Button className="primary-button">Aplicar filtro <Icon name="arrow" size={17} /></Button>
          </div>
        </section>
        <section className="map-layout">
          <div className="panel map-panel">
            <div className="map-toolbar">
              <div><div className="panel-title">Área de Detecção — Setor A</div><span className="panel-subtitle">Visualização cartesiana · Coordenadas em metros</span></div>
              <div className="legend"><span><i className="green-dot" />Detecção</span><span><i className="amber-dot" />Sinal crítico</span></div>
            </div>
            <RadarMap selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <aside className="detail-panel panel">
            <div className="detail-head"><span>DETALHES DA DETECÇÃO</span><span className="signal-tag">SINAL {selected.signal}%</span></div>
            <div className="selected-visual"><div className="target-rings"><span /><i /></div><span>OBJETO SELECIONADO</span><strong>{selected.id}</strong></div>
            <div className="detail-list">
              <div><span>Timestamp</span><strong>{selected.timestamp}</strong></div>
              <div><span>Coordenada X</span><strong className="green-text">{selected.x > 0 ? "+" : ""}{selected.x.toFixed(2)} m</strong></div>
              <div><span>Coordenada Y</span><strong className={selected.y < 0 ? "red-text" : "green-text"}>{selected.y > 0 ? "+" : ""}{selected.y.toFixed(2)} m</strong></div>
              <div><span>Distância da base</span><strong>{Math.round(Math.hypot(selected.x, selected.y))} m</strong></div>
            </div>
            <div className="signal-meter"><div><span>INTENSIDADE DO SINAL</span><strong>{selected.signal}%</strong></div><div className="meter-track"><i style={{ width: `${selected.signal}%` }} /></div><span>Conexão estável</span></div>
            <Button className="secondary-button full-width">Abrir registro completo <Icon name="arrow" size={17} /></Button>
          </aside>
        </section>
      </main>
    </>
  );
}

export default function App() {
  const [view, setView] = useState<View>("overview");
  return (
    <div className="app-shell">
      <Sidebar active={view} onChange={setView} />
      <div className="main-area">
        {view === "overview" ? <Overview onOpenMap={() => setView("map")} /> : <MapView />}
      </div>
    </div>
  );
}
