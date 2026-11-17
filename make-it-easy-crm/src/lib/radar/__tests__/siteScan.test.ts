import test from "node:test";
import assert from "node:assert/strict";
import { classifySite, factsFromHtml, type SiteFacts } from "../siteScan";
import { extractContacts, mergeContacts, verifyEmailWith } from "../contacts";
import { scoreFromOsm } from "../score";
import { isDeficientQuality, qualityClasses, qualityLabel } from "../siteQuality";

const YEAR = new Date().getFullYear();

function goodFacts(overrides: Partial<SiteFacts> = {}): SiteFacts {
  return {
    ok: true,
    status: 200,
    finalUrl: `https://talleresreyes.com/`,
    ms: 400,
    bytes: 40_000,
    isHtml: true,
    title: "Taller Reyes | Mecánica integral en Bogotá",
    description:
      "Taller mecánico con más de 20 años de experiencia en Bogotá. Diagnóstico, frenos, suspensión y mantenimiento preventivo.",
    h1Count: 1,
    hasViewport: true,
    hasForm: true,
    hasWhatsapp: true,
    hasBooking: true,
    copyrightYear: YEAR,
    placeholder: false,
    freeHosting: false,
    ...overrides,
  };
}

test("classifySite marca una web completa como buena", () => {
  const result = classifySite(goodFacts());
  assert.equal(result.quality, "good");
  assert.equal(result.grade, 100);
  assert.equal(result.signals.reduce((sum, item) => sum + item.points, 0), result.grade);
});

test("classifySite marca como mala una web sin HTTPS ni móvil", () => {
  const result = classifySite(
    goodFacts({
      finalUrl: "http://talleresreyes.com/",
      hasViewport: false,
      title: "",
      description: "",
      h1Count: 0,
      hasForm: false,
      hasWhatsapp: false,
      hasBooking: false,
      copyrightYear: null,
    })
  );
  assert.equal(result.quality, "bad");
  assert.ok(result.grade < 40);
});

test("classifySite limita a 20 una web aparcada o en construcción", () => {
  const result = classifySite(goodFacts({ placeholder: true }));
  assert.equal(result.quality, "bad");
  assert.equal(result.grade, 20);
  assert.ok(result.signals.some((signal) => signal.id === "cap"));
});

test("classifySite deja en weak una web buena pero no adaptada a móvil", () => {
  const result = classifySite(goodFacts({ hasViewport: false }));
  assert.equal(result.quality, "weak");
  assert.equal(result.grade, 55);
});

test("classifySite distingue rota de no comprobable", () => {
  const broken = classifySite(goodFacts({ ok: false, status: 404 }));
  assert.equal(broken.quality, "broken");
  assert.equal(broken.grade, 0);

  const blocked = classifySite(goodFacts({ ok: false, status: 403 }));
  assert.equal(blocked.quality, "unknown");

  const offline = classifySite(goodFacts({ ok: false, status: null }));
  assert.equal(offline.quality, "unknown");
});

test("factsFromHtml extrae señales de la home", () => {
  const html = `<!doctype html><html lang="es"><head>
    <title>Taller Reyes | Mecánica en Bogotá</title>
    <meta name="description" content="Taller mecánico con más de 20 años de experiencia en Bogotá. Diagnóstico, frenos, suspensión y mantenimiento.">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    </head><body>
    <h1>Taller Reyes</h1>
    <a href="https://wa.me/573001234567">WhatsApp</a>
    <a href="/reservar">Reservar cita</a>
    <form><input name="telefono"></form>
    <footer>© ${YEAR} Taller Reyes</footer>
    </body></html>`;
  const facts = factsFromHtml(html, "https://talleresreyes.com/", {
    ok: true,
    status: 200,
    ms: 120,
    bytes: 900,
  });
  assert.equal(facts.title, "Taller Reyes | Mecánica en Bogotá");
  assert.equal(facts.h1Count, 1);
  assert.equal(facts.hasViewport, true);
  assert.equal(facts.hasForm, true);
  assert.equal(facts.hasWhatsapp, true);
  assert.equal(facts.hasBooking, true);
  assert.equal(facts.copyrightYear, YEAR);
  assert.equal(facts.placeholder, false);
});

test("factsFromHtml detecta dominios aparcados", () => {
  const html = `<html><head><title>Coming Soon</title></head><body>This domain is for sale</body></html>`;
  const facts = factsFromHtml(html, "https://talleresreyes.com/", {
    ok: true,
    status: 200,
    ms: 100,
    bytes: 100,
  });
  assert.equal(facts.placeholder, true);
});

test("extractContacts obtiene emails, teléfonos, redes y decisor", () => {
  const html = `<html><body>
    <p>Juan Pérez, Gerente General</p>
    <a href="mailto:ventas@talleresreyes.com">Escríbenos</a>
    <a href="tel:+57 300 123 4567">Llamar</a>
    <a href="https://instagram.com/talleresreyes">Instagram</a>
    <a href="https://wa.me/573001234567">WhatsApp</a>
  </body></html>`;
  const contacts = extractContacts(html);
  assert.deepEqual(contacts.emails, ["ventas@talleresreyes.com"]);
  assert.equal(contacts.phones.length, 1);
  assert.match(contacts.phones[0], /300/);
  assert.equal(contacts.socials[0], "https://instagram.com/talleresreyes");
  assert.equal(contacts.contactName, "Juan Pérez");
  assert.equal(contacts.contactRole, "gerente general");
});

test("extractContacts no confunde un cargo con un nombre", () => {
  const html = `<html><body><p>Arquitecto de Procesos · Fundador</p></body></html>`;
  const contacts = extractContacts(html);
  assert.equal(contacts.contactName, null);
});

test("mergeContacts prioriza el decisor de la página de contacto", () => {
  const primary = {
    emails: ["info@talleresreyes.com"],
    phones: [],
    socials: [],
    contactName: null,
    contactRole: null,
  };
  const extra = {
    emails: ["ventas@talleresreyes.com"],
    phones: ["3001234567"],
    socials: [],
    contactName: "María Gómez",
    contactRole: "administradora",
  };
  const merged = mergeContacts(primary, extra);
  assert.deepEqual(merged.emails, ["info@talleresreyes.com", "ventas@talleresreyes.com"]);
  assert.equal(merged.contactName, "María Gómez");
});

test("verifyEmailWith clasifica verificado, genérico, desechable e inválido", async () => {
  const mxTrue = async (): Promise<boolean> => true;
  const mxFalse = async (): Promise<boolean> => false;

  assert.equal((await verifyEmailWith("ventas@talleresreyes.com", mxTrue)).status, "risky");
  assert.equal((await verifyEmailWith("juan.perez@talleresreyes.com", mxTrue)).status, "verified");
  assert.equal((await verifyEmailWith("juan.perez@talleresreyes.com", mxFalse)).status, "invalid");
  assert.equal((await verifyEmailWith("juan@mailinator.com", mxTrue)).status, "invalid");
  assert.equal((await verifyEmailWith("sin-arroba", mxTrue)).status, "invalid");
});

test("scoreFromOsm suma la calidad de la web y mantiene el desglose coherente", () => {
  const bad = scoreFromOsm({ name: "Taller Reyes", websiteKind: "own", phone: "", siteQuality: "bad" });
  assert.equal(bad.score, 51);
  assert.equal(bad.breakdown.reduce((sum, item) => sum + item.points, 0), bad.score);

  const broken = scoreFromOsm({ name: "Taller Reyes", websiteKind: "own", phone: "", siteQuality: "broken" });
  assert.equal(broken.score, 61);

  const weak = scoreFromOsm({ name: "Taller Reyes", websiteKind: "own", phone: "", siteQuality: "weak" });
  assert.equal(weak.score, 44);

  const good = scoreFromOsm({ name: "Taller Reyes", websiteKind: "own", phone: "", siteQuality: "good" });
  assert.equal(good.score, 36);
});

test("qualityLabel y helpers describen la calidad de la web", () => {
  assert.equal(qualityLabel("bad", 28), "Mala 28");
  assert.equal(qualityLabel("weak", 55), "Mejorable 55");
  assert.equal(qualityLabel("good", 82), "Buena 82");
  assert.equal(qualityLabel("broken"), "Rota");
  assert.equal(qualityLabel("unknown"), "Sin analizar");
  assert.equal(isDeficientQuality("weak"), true);
  assert.equal(isDeficientQuality("good"), false);
  assert.match(qualityClasses("bad"), /red/);
});
