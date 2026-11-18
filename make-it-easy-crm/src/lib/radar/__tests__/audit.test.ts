import test from "node:test";
import assert from "node:assert/strict";
import { runChecks, type AuditContext } from "../audit/checks";
import type { AuditCheck } from "../audit/types";

function result(html: string, finalUrl = "https://example.com/", status = 200) {
  return {
    ok: status < 400,
    status,
    finalUrl,
    html,
    bytes: html.length,
    ms: 100,
    headers: { "content-type": "text/html" },
  };
}

function context(overrides: Partial<AuditContext> = {}): AuditContext {
  const html = `<!doctype html><html lang="es"><head>
    <title>Taller Reyes | Mecánica en Bogotá</title>
    <meta name="description" content="Taller mecánico en Bogotá con diagnóstico, frenos y suspensión. Pide tu cita hoy mismo.">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    </head><body><h1>Taller Reyes</h1><p>Taller mecánico en Bogotá. Calle 10 #5-20. Teléfono 300 123 4567.</p></body></html>`;
  return {
    page: result(html),
    robots: result("User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml", "https://example.com/robots.txt"),
    sitemap: result(
      "<urlset><url><loc>https://example.com/</loc><lastmod>2026-11-01</lastmod></url></urlset>",
      "https://example.com/sitemap.xml"
    ),
    httpRedirect: { status: 301, location: "https://example.com/" },
    notFound: result("No encontrado", "https://example.com/radar-404", 404),
    redirectChain: {
      chain: [
        { url: "http://example.com/", status: 301, location: "https://example.com/" },
        { url: "https://example.com/", status: 200, location: null },
      ],
      finalUrl: "https://example.com/",
      loop: false,
      exceeded: false,
    },
    ...overrides,
  };
}

function check(ctx: AuditContext, id: string): AuditCheck {
  const found = runChecks(ctx).checks.find((item) => item.id === id);
  assert.ok(found, `No se generó el check ${id}`);
  return found;
}

test("schema ausente queda en warn con aviso de Rich Results", () => {
  const schema = check(context(), "on_schema");
  assert.equal(schema.status, "warn");
  assert.match(schema.evidence, /Rich Results/i);
});

test("hreflang autorreferente, x-default, códigos y estado", () => {
  const html = `<!doctype html><html lang="es"><head>
    <title>Taller Reyes | Mecánica en Bogotá</title>
    <link rel="alternate" hreflang="es" href="https://example.com/">
    <link rel="alternate" hreflang="en" href="https://example.com/en/">
    <link rel="alternate" hreflang="x-default" href="https://example.com/">
    </head><body><h1>Taller</h1></body></html>`;
  const ctx = context({
    page: result(html),
    hreflangStatus: [
      { url: "https://example.com/", status: 200, ok: true, unknown: false },
      { url: "https://example.com/en/", status: 200, ok: true, unknown: false },
    ],
  });
  assert.equal(check(ctx, "on_hreflang_self").status, "pass");
  assert.equal(check(ctx, "on_hreflang_xdefault").status, "pass");
  assert.equal(check(ctx, "on_hreflang_codes").status, "pass");
  assert.equal(check(ctx, "on_hreflang_status").status, "pass");
});

test("hreflang en-UK se marca inválido", () => {
  const html = `<html><head><link rel="alternate" hreflang="en-UK" href="https://example.com/uk/"></head><body><h1>Taller</h1></body></html>`;
  const ctx = context({ page: result(html) });
  assert.equal(check(ctx, "on_hreflang_codes").status, "fail");
});

test("detecta salto de jerarquía de encabezados", () => {
  const ctx = context({
    page: result("<html><body><h1>Taller</h1><h3>Servicios</h3></body></html>"),
  });
  assert.equal(check(ctx, "on_heading_order").status, "warn");
});

test("detecta contenido mixto", () => {
  const ctx = context({
    page: result('<html><body><h1>Taller</h1><img src="http://cdn.example.com/a.jpg"></body></html>'),
  });
  assert.equal(check(ctx, "tech_mixed_content").status, "warn");
});

test("detecta imágenes genéricas y sin srcset", () => {
  const ctx = context({
    page: result('<html><body><h1>Taller</h1><img src="/img/IMG_1234.jpg" alt="Taller"></body></html>'),
  });
  assert.equal(check(ctx, "tech_img_names").status, "warn");
  assert.equal(check(ctx, "tech_img_srcset").status, "warn");
});

test("detecta enlaces con texto genérico", () => {
  const ctx = context({
    page: result('<html><body><h1>Taller</h1><a href="/servicios">clic aquí</a></body></html>'),
  });
  assert.equal(check(ctx, "on_anchor_text").status, "warn");
});

test("NAP coherente cuando la ficha coincide con la página", () => {
  const ctx = context({
    business: {
      name: "Taller Reyes",
      address: "Calle 10 #5-20, Bogotá",
      phone: "3001234567",
    },
  });
  assert.equal(check(ctx, "loc_nap_consistency").status, "pass");
  assert.equal(check(ctx, "loc_city_content").status, "pass");
});

test("NAP en warn cuando no se encuentra en la página", () => {
  const ctx = context({
    page: result("<html><body><h1>Otra cosa</h1></body></html>"),
    business: { name: "Taller Reyes", address: "Calle 99 #1-2", phone: "3009999999" },
  });
  assert.equal(check(ctx, "loc_nap_consistency").status, "warn");
});

test("estructura de URL con mayúsculas, guiones y parámetros falla", () => {
  const ctx = context({ page: result("<html><body><h1>Taller</h1></body></html>", "https://example.com/Mi_Pagina?x=1") });
  assert.equal(check(ctx, "tech_url_structure").status, "fail");
});

test("soft 404 se detecta por 200 con texto de no encontrado", () => {
  const ctx = context({
    notFound: result("Página no encontrada", "https://example.com/radar-404", 200),
  });
  assert.equal(check(ctx, "idx_soft_404").status, "fail");
});

test("cadena de redirecciones y enlaces roto", () => {
  const ctx = context({
    redirectChain: {
      chain: [
        { url: "http://example.com/", status: 301, location: "https://example.com/" },
        { url: "https://example.com/", status: 301, location: "https://example.com/inicio" },
        { url: "https://example.com/inicio", status: 200, location: null },
      ],
      finalUrl: "https://example.com/inicio",
      loop: false,
      exceeded: false,
    },
    brokenLinks: [
      { url: "https://example.com/a", status: 404, ok: false, unknown: false },
      { url: "https://example.com/b", status: 200, ok: true, unknown: false },
    ],
  });
  assert.equal(check(ctx, "tech_redirect_chain").status, "warn");
  assert.equal(check(ctx, "on_broken_links").status, "warn");
});
