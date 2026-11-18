import test from "node:test";
import assert from "node:assert/strict";
import { detectWhatsApp, mergeWhatsAppDetections } from "../whatsapp";
import { recommendPackage } from "../packages";
import type { AuditReport } from "../audit/types";

test("detecta WhatsApp manual con numero", () => {
  const result = detectWhatsApp(
    '<a href="https://wa.me/573001234567">Escríbenos por WhatsApp</a>',
    "Escríbenos por WhatsApp"
  );
  assert.equal(result.kind, "manual");
  assert.equal(result.confidence, "high");
  assert.equal(result.number, "573001234567");
  assert.equal(result.hasLink, true);
});

test("detecta automatizacion con Wati y texto de bot", () => {
  const result = detectWhatsApp(
    '<script src="https://wati.io/widget.js"></script><a href="https://wa.me/573001234567">WhatsApp</a>',
    "Nuestro asistente virtual responde 24/7"
  );
  assert.equal(result.kind, "automation");
  assert.equal(result.provider, "Wati");
  assert.equal(result.confidence, "high");
});

test("detecta WhatsApp Business API aunque no haya widget", () => {
  const result = detectWhatsApp(
    '<script>fetch("https://graph.facebook.com/v20.0/messages")</script>',
    "Atención por WhatsApp Business"
  );
  assert.equal(result.kind, "automation");
  assert.equal(result.confidence, "medium");
  assert.equal(result.hasBusinessApi, true);
});

test("un chat web sin WhatsApp no se marca como automatizacion", () => {
  const result = detectWhatsApp(
    '<script src="https://widget.intercom.io/widget/abc"></script>',
    "Estamos en línea"
  );
  assert.equal(result.kind, "widget");
  assert.equal(result.webChatProvider, "Intercom");
  assert.equal(result.hasLink, false);
});

test("sin WhatsApp ni chat devuelve none", () => {
  const result = detectWhatsApp("<h1>Taller</h1>", "Taller de mecánica");
  assert.equal(result.kind, "none");
  assert.equal(result.confidence, "high");
});

test("mergeWhatsAppDetections prioriza automatizacion", () => {
  const manual = detectWhatsApp('<a href="https://wa.me/573001234567">WhatsApp</a>', "WhatsApp");
  const auto = detectWhatsApp(
    '<script src="https://wati.io/widget.js"></script>',
    "chatbot 24/7"
  );
  const merged = mergeWhatsAppDetections(manual, auto);
  assert.equal(merged.kind, "automation");
  assert.equal(merged.provider, "Wati");
  assert.equal(merged.number, "573001234567");
});

test("recommendPackage vende agente si el WhatsApp es manual", () => {
  const report = {
    url: "https://talleresreyes.com",
    finalUrl: "https://talleresreyes.com",
    fetchedAt: new Date().toISOString(),
    durationMs: 100,
    globalScore: 80,
    potentialScore: 90,
    areas: [{ area: "onpage", label: "On-page", weight: 25, score: 80, pass: 8, warn: 1, fail: 0, na: 0 }],
    checks: [],
    quickWins: [],
    critical: [],
    meta: {
      status: 200,
      responseMs: 100,
      htmlBytes: 1000,
      compressed: true,
      title: "Taller",
      description: "Taller",
    },
  } as AuditReport;

  assert.equal(recommendPackage(report, "manual").id, "whatsapp");
  assert.equal(recommendPackage(report, "none").id, "whatsapp");
  assert.equal(recommendPackage(report, "automation").id, "web");
});
