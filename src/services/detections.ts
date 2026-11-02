export type Detection = {
  eventId: string;
  timestamp: number;
  angleDegrees: number;
  distanceMeters: number;
  xMeters: number;
  yMeters: number;
};

const INVALID_RESPONSE = "A API retornou dados de detecção inválidos.";

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseDetectionsResponse(payload: unknown): Detection[] {
  if (!payload || typeof payload !== "object" || !("detections" in payload) || !Array.isArray(payload.detections)) {
    throw new Error(INVALID_RESPONSE);
  }

  return payload.detections.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error(INVALID_RESPONSE);
    const record = item as Record<string, unknown>;
    const timestamp = typeof record.timestamp === "number"
      ? record.timestamp
      : typeof record.timestamp === "string" && /^\d+$/.test(record.timestamp)
        ? Number(record.timestamp)
        : typeof record.timestamp === "string" ? Date.parse(record.timestamp) : NaN;

    if (typeof record.event_id !== "string" || !record.event_id.trim()
      || !Number.isFinite(timestamp) || timestamp < 0 || !Number.isFinite(new Date(timestamp).getTime())
      || !finiteNumber(record.angle_degrees) || record.angle_degrees < 0 || record.angle_degrees > 360
      || !finiteNumber(record.distance_cm) || record.distance_cm < 0
      || !finiteNumber(record.x_cm) || !finiteNumber(record.y_cm)) {
      throw new Error(INVALID_RESPONSE);
    }

    return {
      eventId: record.event_id,
      timestamp,
      angleDegrees: record.angle_degrees,
      distanceMeters: record.distance_cm / 100,
      xMeters: record.x_cm / 100,
      yMeters: record.y_cm / 100,
    };
  });
}

export function parsePollInterval(value: string | undefined): number {
  const interval = Number(value);
  return Number.isFinite(interval) && interval >= 1000 && interval <= 2147483647 ? interval : 5000;
}

export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Configure VITE_API_BASE_URL no arquivo .env.local e reinicie o front.");

  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol) || url.search || url.hash || url.username || url.password) throw new Error();
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new Error("VITE_API_BASE_URL deve ser um endereço HTTP ou HTTPS válido, sem parâmetros.");
  }
}

export async function fetchLatestDetections(
  baseUrl: string,
  limit: number,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<Detection[]> {
  const url = `${normalizeApiBaseUrl(baseUrl)}/detections/latest?limit=${limit}`;
  let response: Response;
  try {
    response = await fetchImpl(url, { signal, cache: "no-store" });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("Não foi possível conectar à API. Confira o endereço e a conexão.");
  }
  if (!response.ok) throw new Error(`A API respondeu com HTTP ${response.status}.`);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(INVALID_RESPONSE);
  }
  return parseDetectionsResponse(payload);
}
