import test from "node:test";
import assert from "node:assert/strict";
import { classifyWebsite, hostOf, normalizeUrl } from "../website";
import { scoreClasses, scoreFromOsm, scoreTone } from "../score";
import { isRadarLeadStatus, RADAR_LEAD_STATUSES } from "../statuses";
import { radarRepository, saveAnalysis } from "../repository";

test("classifyWebsite distingue web propia, red social y directorio", () => {
  assert.equal(classifyWebsite("https://talleresreyes.com"), "own");
  assert.equal(classifyWebsite("facebook.com/talleresreyes"), "social");
  assert.equal(classifyWebsite("https://wa.me/573001234567"), "social");
  assert.equal(classifyWebsite("https://paginasamarillas.com/empresa/x"), "directory");
  assert.equal(classifyWebsite("https://maps.google.com/?q=x"), "directory");
  assert.equal(classifyWebsite(""), "none");
  assert.equal(classifyWebsite(null), "none");
});

test("hostOf y normalizeUrl normalizan entradas", () => {
  assert.equal(hostOf("www.TalleresReyes.com"), "talleresreyes.com");
  assert.equal(hostOf("https://sub.talleresreyes.com/ruta"), "sub.talleresreyes.com");
  assert.equal(normalizeUrl("talleresreyes.com"), "https://talleresreyes.com");
  assert.equal(normalizeUrl(""), "");
});

test("scoreFromOsm suma y explica los puntos", () => {
  const full = scoreFromOsm({
    name: "Taller Reyes",
    websiteKind: "none",
    phone: "3001234567",
    street: "Calle 10",
    housenumber: "5-20",
    openingHours: "L-V 8-18",
  });
  assert.equal(full.score, 95);
  assert.equal(full.breakdown.reduce((sum, item) => sum + item.points, 0), 95);

  const ownNoPhone = scoreFromOsm({ name: "Taller Reyes", websiteKind: "own", phone: "" });
  assert.equal(ownNoPhone.score, 36);

  const franchise = scoreFromOsm({
    name: "Taller Reyes",
    websiteKind: "social",
    phone: "3001234567",
    brand: "Cadena",
  });
  assert.equal(franchise.score, 63);
});

test("scoreTone y scoreClasses clasifican el score", () => {
  assert.equal(scoreTone(95), "high");
  assert.equal(scoreTone(60), "mid");
  assert.equal(scoreTone(20), "low");
  assert.match(scoreClasses(95), /emerald/);
  assert.match(scoreClasses(20), /red/);
});

test("isRadarLeadStatus valida los estados del Radar", () => {
  for (const status of RADAR_LEAD_STATUSES) {
    assert.equal(isRadarLeadStatus(status.value), true);
  }
  assert.equal(isRadarLeadStatus("NUEVO"), true);
  assert.equal(isRadarLeadStatus("PERDIDO"), false);
  assert.equal(isRadarLeadStatus(null), false);
});

test("saveAnalysis no persiste capturas y mantiene como mÃ¡ximo 50 anÃ¡lisis", () => {
  const store = new Map<string, string>();
  const fakeWindow = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  };
  (globalThis as unknown as { window: unknown }).window = fakeWindow;

  const screenshot = "data:image/png;base64," + "A".repeat(1024);
  for (let i = 0; i < 120; i++) {
    saveAnalysis({
      businessId: `biz-${i}`,
      analyzedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
      pagespeed: { performance: 80, seo: 90, accessibility: 70, bestPractices: 85, screenshot },
      analysis: {
        summary: "resumen",
        checklist: {},
        contacts: { emails: [], socials: [] },
        problems: [],
        recommendedService: { type: "web_nueva", reason: "x" },
      },
    });
  }

  const raw = store.get("radar.analyses.v1");
  assert.ok(raw);
  const parsed = JSON.parse(raw) as Record<string, { pagespeed?: { screenshot?: string | null } }>;
  const values = Object.values(parsed);
  assert.equal(values.length, 50);
  assert.ok(values.every((record) => record.pagespeed?.screenshot === null));
});

test("load migra los leads legacy al servidor y limpia la clave local", async () => {
  const store = new Map<string, string>();
  const calls: Array<{ method: string; body: unknown }> = [];
  const fakeWindow = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  };
  (globalThis as unknown as { window: unknown }).window = fakeWindow;

  const originalFetch = globalThis.fetch;
  const serverLead = {
    businessId: "osm:1",
    status: "CONTACTADO",
    notes: "Llamar",
    nextActionAt: null,
    createdAt: "2026-10-26T00:00:00.000Z",
    updatedAt: "2026-10-26T00:00:00.000Z",
    business: { id: "osm:1", name: "Taller" },
  };
  (globalThis as unknown as { fetch: unknown }).fetch = async (_url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ method, body });
    const leads = [serverLead];
    return new Response(JSON.stringify({ leads }), { status: 200 });
  };

  store.set(
    "radar.leads.v1",
    JSON.stringify([
      { business: { id: "osm:1", name: "Taller" }, status: "CONTACTADO", notes: "Llamar", nextActionAt: null },
    ])
  );

  try {
    const leads = await radarRepository.load();
    assert.equal(store.has("radar.leads.v1"), false);
    assert.ok(calls.some((call) => call.method === "POST"));
    assert.ok(
      calls.some(
        (call) =>
          call.method === "PATCH" &&
          (call.body as { status?: string }).status === "CONTACTADO"
      )
    );
    assert.equal(leads.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

