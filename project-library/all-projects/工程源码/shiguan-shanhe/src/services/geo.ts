import type { FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson";

type NamedGeometryCollection = FeatureCollection<Geometry, { name?: string }>;

function reversePolygonCoordinates(coordinates: Polygon["coordinates"]): Polygon["coordinates"] {
  return coordinates.map((ring) => [...ring].reverse());
}

function normalizeGeometry(geometry: Geometry): Geometry {
  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: reversePolygonCoordinates(geometry.coordinates)
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) =>
        reversePolygonCoordinates(polygon as Polygon["coordinates"])
      ) as MultiPolygon["coordinates"]
    };
  }

  return geometry;
}

/**
 * DataV 边界数据的环方向与 d3-geo 的球面填充约定相反。
 * 在适配层中返回新集合，避免修改原始数据并隔离第三方格式差异。
 */
export function normalizeMapCollection(collection: NamedGeometryCollection): NamedGeometryCollection {
  return {
    ...collection,
    features: collection.features.map((feature) => ({
      ...feature,
      geometry: feature.geometry ? normalizeGeometry(feature.geometry) : feature.geometry
    }))
  };
}
