export interface RadarCategory {
  id: string;
  label: string;
  /** Filtros Overpass: [clave, valor] */
  osm: Array<[string, string]>;
}

export const RADAR_CATEGORIES: RadarCategory[] = [
  { id: "talleres", label: "Talleres mecánicos", osm: [["shop", "car_repair"], ["shop", "tyres"]] },
  { id: "dentales", label: "Clínicas dentales", osm: [["amenity", "dentist"], ["healthcare", "dentist"]] },
  { id: "fisios", label: "Fisioterapeutas", osm: [["healthcare", "physiotherapist"], ["amenity", "physiotherapist"]] },
  { id: "peluquerias", label: "Peluquerías", osm: [["shop", "hairdresser"]] },
  { id: "estetica", label: "Centros de estética", osm: [["shop", "beauty"], ["leisure", "spa"]] },
  { id: "restaurantes", label: "Restaurantes", osm: [["amenity", "restaurant"]] },
  { id: "gimnasios", label: "Gimnasios", osm: [["leisure", "fitness_centre"]] },
  { id: "academias", label: "Academias", osm: [["office", "educational_institution"], ["amenity", "language_school"], ["amenity", "prep_school"]] },
  { id: "inmobiliarias", label: "Inmobiliarias", osm: [["office", "estate_agent"]] },
  { id: "reformas", label: "Reformas", osm: [["craft", "builder"], ["craft", "carpenter"], ["shop", "doityourself"]] },
  { id: "veterinarios", label: "Veterinarios", osm: [["amenity", "veterinary"]] },
  { id: "autoescuelas", label: "Autoescuelas", osm: [["amenity", "driving_school"]] },
  { id: "opticas", label: "Ópticas", osm: [["shop", "optician"]] },
  { id: "gestorias", label: "Gestorías", osm: [["office", "accountant"], ["office", "tax_advisor"]] },
];

export function findCategory(id: string): RadarCategory | undefined {
  return RADAR_CATEGORIES.find((c) => c.id === id);
}
