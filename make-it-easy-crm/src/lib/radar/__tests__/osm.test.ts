import test from "node:test";
import assert from "node:assert/strict";
import {
  expandTinyZone,
  mapZoneSuggestions,
  needsOverpassFallback,
  pickZoneResult,
  searchOsm,
  zoneFromSelection,
  type NominatimZoneResult,
} from "../osm";
import type { RadarZone } from "../types";

const BUS_STOP: NominatimZoneResult = {
  display_name: "Mazurén, Calle 152, Bogotá",
  lat: "4.7357792",
  lon: "-74.0559824",
  boundingbox: ["4.7357292", "4.7358292", "-74.0560324", "-74.0559324"],
  type: "bus_stop",
  addresstype: "highway",
};

const RESIDENTIAL: NominatimZoneResult = {
  display_name: "Mazuren II, Suba, Bogotá",
  lat: "4.7365531",
  lon: "-74.0506289",
  boundingbox: ["4.7358647", "4.7370775", "-74.0513211", "-74.0501017"],
  type: "residential",
  addresstype: "residential",
};

const CITY: NominatimZoneResult = {
  display_name: "Bogotá, Colombia",
  lat: "4.6533326",
  lon: "-74.083652",
  boundingbox: ["3.7288874", "4.8370295", "-74.4369562", "-73.9913854"],
  type: "city",
  addresstype: "city",
};

test("pickZoneResult prefiere el barrio residencial sobre la parada de bus", () => {
  const picked = pickZoneResult([BUS_STOP, RESIDENTIAL]);
  assert.equal(picked?.type, "residential");
});

test("pickZoneResult prefiere un área grande sobre un bloque residencial", () => {
  const picked = pickZoneResult([BUS_STOP, RESIDENTIAL, CITY]);
  assert.equal(picked?.type, "city");
});

test("expandTinyZone convierte una parada de bus en un radio de 2.5 km", () => {
  const zone: RadarZone = {
    displayName: "Mazurén, Calle 152",
    lat: 4.7357792,
    lng: -74.0559824,
    bbox: [4.7357292, -74.0560324, 4.7358292, -74.0559324],
  };
  const expanded = expandTinyZone(zone, "Mazurén");
  assert.ok(expanded.note?.includes("radio"));
  assert.ok(expanded.displayName.includes("radio"));
  assert.equal(expanded.polygons, undefined);
  assert.ok(Math.abs(expanded.bbox[3] - expanded.bbox[1]) > 0.03);
});

test("expandTinyZone deja intacta una ciudad con bbox grande", () => {
  const zone: RadarZone = {
    displayName: "Bogotá",
    lat: 4.6533326,
    lng: -74.083652,
    bbox: [3.7288874, -74.4369562, 4.8370295, -73.9913854],
  };
  const expanded = expandTinyZone(zone, "Bogotá");
  assert.equal(expanded.note, undefined);
  assert.deepEqual(expanded.bbox, zone.bbox);
});

test("zoneFromSelection usa el bbox de un area grande y expande un punto", () => {
  const city = zoneFromSelection({
    displayName: "Bogotá, Colombia",
    label: "Bogotá",
    lat: 4.6533326,
    lng: -74.083652,
    bbox: [3.7288874, -74.4369562, 4.8370295, -73.9913854],
  });
  assert.equal(city.note, undefined);

  const poi = zoneFromSelection({
    displayName: "Mazurén, Avenida Carrera 45, Bogotá",
    label: "Mazurén · Suba, Bogotá",
    lat: 4.7329371,
    lng: -74.0494827,
    bbox: [4.7327086, -74.0495371, 4.7365939, -74.048863],
  });
  assert.ok(poi.note?.includes("radio"));
  assert.ok(poi.displayName.includes("radio"));
});

test("mapZoneSuggestions prioriza areas y arma etiquetas cortas", () => {
  const suggestions = mapZoneSuggestions([
    {
      ...BUS_STOP,
      osm_type: "node",
      osm_id: 1,
      name: "Mazurén",
      address: { city: "Bogotá", suburb: "Suba" },
    },
    {
      ...RESIDENTIAL,
      osm_type: "way",
      osm_id: 2,
      name: "Mazuren II",
      address: { city: "Bogotá", suburb: "Suba" },
    },
  ]);
  assert.equal(suggestions[0].kind, "area");
  assert.equal(suggestions[0].label, "Mazuren II · Suba, Bogotá");
  assert.equal(suggestions[1].kind, "poi");
  assert.equal(suggestions[1].label, "Mazurén · Suba, Bogotá");
});

test("needsOverpassFallback se activa con pocos resultados", () => {
  assert.equal(needsOverpassFallback(0), true);
  assert.equal(needsOverpassFallback(2), true);
  assert.equal(needsOverpassFallback(3), false);
});

test("searchOsm expande la zona y cae a Overpass si Photon devuelve cero", async () => {
  const originalFetch = globalThis.fetch;
  const zoneName = "Mazurén test";

  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    if (url.includes("nominatim.openstreetmap.org")) {
      return new Response(JSON.stringify([BUS_STOP, RESIDENTIAL]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("photon.komoot.io")) {
      return new Response(JSON.stringify({ features: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("overpass")) {
      return new Response(
        JSON.stringify({
          elements: [
            {
              type: "node",
              id: 1,
              lat: 4.7358,
              lon: -74.056,
              tags: { name: "Gym Test", leisure: "fitness_centre", phone: "3001234567" },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    throw new Error(`URL inesperada: ${url}`);
  };

  try {
    const result = await searchOsm(zoneName, "gimnasios", "", "fast");
    assert.equal(result.businesses.length, 1);
    assert.equal(result.businesses[0].name, "Gym Test");
    assert.equal(result.provider, "overpass");
    assert.equal(result.zone.polygons, undefined);
    assert.ok(result.zone.note?.includes("radio"));
    assert.ok(result.note?.includes("Overpass"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
