// This file uses data from Extracted Frames Data.json
import extractedData from "./images_Data.json";

export const imageData = {
  type: "FeatureCollection",
  features: extractedData.features,
};

// Generated path from the points
export const imagePath = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: extractedData.features.map(
      (feature) => feature.geometry.coordinates
    ),
  },
};
