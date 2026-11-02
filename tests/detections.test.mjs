import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Transpila o serviço com a dependência já usada pelo projeto, sem exigir um executor adicional.
const source = await readFile(new URL("../src/services/detections.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { fetchLatestDetections, normalizeApiBaseUrl, parseDetectionsResponse, parsePollInterval } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

const detection = {
  event_id: "evento-123",
  timestamp: 1790784000000,
  angle_degrees: 135.5,
  distance_cm: 82.3,
  x_cm: -58.2,
  y_cm: 58.2,
};

test("converte o contrato do GET para metros e preserva o timestamp em milissegundos", () => {
  const [result] = parseDetectionsResponse({ detections: [detection], total: 1 });
  assert.equal(result.eventId, "evento-123");
  assert.equal(result.timestamp, 1790784000000);
  assert.equal(result.angleDegrees, 135.5);
  assert.equal(result.distanceMeters, 82.3 / 100);
  assert.equal(result.xMeters, -58.2 / 100);
  assert.equal(result.yMeters, 58.2 / 100);
  assert.deepEqual(parseDetectionsResponse({ detections: [], total: 0 }), []);
});

test("aceita timestamps numéricos em texto e registros antigos em ISO", () => {
  const results = parseDetectionsResponse({ detections: [
    { ...detection, timestamp: "1790784000000" },
    { ...detection, timestamp: "2026-10-21T18:30:00Z" },
    { ...detection, timestamp: "0" },
  ] });
  assert.equal(results[0].timestamp, 1790784000000);
  assert.equal(results[1].timestamp, Date.parse("2026-10-21T18:30:00Z"));
  assert.equal(results[2].timestamp, 0);
});

test("rejeita respostas incompatíveis antes de apresentá-las na interface", () => {
  for (const payload of [
    {},
    { detections: null },
    { detections: [{ ...detection, event_id: "" }] },
    { detections: [{ ...detection, distance_cm: "82.3" }] },
    { detections: [{ ...detection, timestamp: "data inválida" }] },
    { detections: [{ ...detection, angle_degrees: 361 }] },
  ]) {
    assert.throws(() => parseDetectionsResponse(payload), /dados de detecção inválidos/);
  }
});

test("monta a rota GET para um endpoint com estágio e mantém a configuração do fetch", async () => {
  const controller = new AbortController();
  const fetchMock = async (url, options) => {
    assert.equal(url, "https://api.example.com/prod/detections/latest?limit=50");
    assert.equal(options.signal, controller.signal);
    assert.equal(options.cache, "no-store");
    return new Response(JSON.stringify({ detections: [detection], total: 1 }), { status: 200 });
  };
  const result = await fetchLatestDetections("https://api.example.com/prod/", 50, controller.signal, fetchMock);
  assert.equal(result[0].eventId, detection.event_id);
});

test("informa falhas HTTP, de conexão e configuração", async () => {
  const signal = new AbortController().signal;
  await assert.rejects(fetchLatestDetections("https://api.example.com", 50, signal, async () => new Response("erro", { status: 503 })), /HTTP 503/);
  await assert.rejects(fetchLatestDetections("https://api.example.com", 50, signal, async () => { throw new TypeError("Failed to fetch"); }), /Não foi possível conectar à API/);
  await assert.rejects(fetchLatestDetections("https://api.example.com", 50, signal, async () => new Response("não é JSON")), /dados de detecção inválidos/);
  assert.throws(() => normalizeApiBaseUrl(""), /Configure VITE_API_BASE_URL/);
  assert.throws(() => normalizeApiBaseUrl("COLE_O_ENDPOINT_DA_API"), /endereço HTTP ou HTTPS válido/);
  assert.throws(() => normalizeApiBaseUrl("https://api.example.com/?token=segredo"), /sem parâmetros/);
});

test("aceita intervalos válidos e evita consultas contínuas com configuração inválida", () => {
  assert.equal(parsePollInterval("3000"), 3000);
  for (const value of [undefined, "", "0", "-1", "500", "2147483648", "inválido"]) {
    assert.equal(parsePollInterval(value), 5000);
  }
});
