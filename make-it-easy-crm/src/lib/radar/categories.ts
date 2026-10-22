export interface RadarCategory {
  id: string;
  label: string;
  /** Término de búsqueda para Photon */
  photonQuery: string;
  /** Filtros Overpass: [clave, valor] */
  osm: Array<[string, string]>;
}

export const RADAR_CATEGORIES: RadarCategory[] = [
  { id: "talleres", photonQuery: "taller", label: "Talleres mecánicos", osm: [["shop", "car_repair"], ["shop", "tyres"]] },
  { id: "dentales", photonQuery: "dental", label: "Clínicas dentales", osm: [["amenity", "dentist"], ["healthcare", "dentist"]] },
  { id: "fisios", photonQuery: "fisioterapia", label: "Fisioterapeutas", osm: [["healthcare", "physiotherapist"], ["amenity", "physiotherapist"]] },
  { id: "peluquerias", photonQuery: "peluquería", label: "Peluquerías", osm: [["shop", "hairdresser"]] },
  { id: "estetica", photonQuery: "estética", label: "Centros de estética", osm: [["shop", "beauty"], ["leisure", "spa"]] },
  { id: "restaurantes", photonQuery: "restaurante", label: "Restaurantes", osm: [["amenity", "restaurant"]] },
  { id: "gimnasios", photonQuery: "gimnasio", label: "Gimnasios", osm: [["leisure", "fitness_centre"]] },
  { id: "academias", photonQuery: "academia", label: "Academias", osm: [["office", "educational_institution"], ["amenity", "language_school"], ["amenity", "prep_school"]] },
  { id: "inmobiliarias", photonQuery: "inmobiliaria", label: "Inmobiliarias", osm: [["office", "estate_agent"]] },
  { id: "reformas", photonQuery: "reformas", label: "Reformas", osm: [["craft", "builder"], ["craft", "carpenter"], ["shop", "doityourself"]] },
  { id: "veterinarios", photonQuery: "veterinario", label: "Veterinarios", osm: [["amenity", "veterinary"]] },
  { id: "autoescuelas", photonQuery: "autoescuela", label: "Autoescuelas", osm: [["amenity", "driving_school"]] },
  { id: "opticas", photonQuery: "óptica", label: "Ópticas", osm: [["shop", "optician"]] },
  { id: "gestorias", photonQuery: "gestoría", label: "Gestorías", osm: [["office", "accountant"], ["office", "tax_advisor"]] },
];

export function findCategory(id: string): RadarCategory | undefined {
  return RADAR_CATEGORIES.find((c) => c.id === id);
}
