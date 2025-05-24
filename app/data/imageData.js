// This file fetches data from the API instead of using local JSON
"use client";

import { useState, useEffect } from "react";

// Default empty data structure to use while loading
const emptyGeoJSON = {
  type: "FeatureCollection",
  features: [],
};

// Custom hook to fetch and format image data
export function useImageData() {
  const [imageData, setImageData] = useState(emptyGeoJSON);
  const [imagePath, setImagePath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        // Use the Next.js API route instead of direct API calls
        // This solves CORS issues by proxying the request through our own domain
        const response = await fetch("/api/features");

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const result = await response.json();

        // Handle error response
        if (result.status === "error") {
          throw new Error(result.message || "Unknown API error");
        }

        // Check if the response is already a properly formatted GeoJSON FeatureCollection
        if (
          result.type === "FeatureCollection" &&
          Array.isArray(result.features)
        ) {
          // The API route is already returning properly formatted GeoJSON
          setImageData(result);

          // Generate path from the points
          if (result.features.length > 0) {
            // Check if we need to group by track
            const trackGroups = {};

            // Group features by track ID
            result.features.forEach((feature) => {
              const id = feature.properties.id;
              // Extract track name using regex (e.g., "track0" from "img_track0_265")
              const trackMatch = id.match(/img_([^_]+)/);

              if (trackMatch) {
                const trackName = trackMatch[1]; // This will be "track0", "track1", etc.
                if (!trackGroups[trackName]) {
                  trackGroups[trackName] = [];
                }
                trackGroups[trackName].push(feature);
              } else {
                // If no track match, put in default group
                if (!trackGroups["default"]) {
                  trackGroups["default"] = [];
                }
                trackGroups[trackName].push(feature);
              }
            });

            // Create path GeoJSON with multiple LineStrings (one per track)
            const paths = {
              type: "FeatureCollection",
              features: Object.keys(trackGroups).map((trackName) => {
                // Sort features by ID before creating the path
                const sortedFeatures = [...trackGroups[trackName]].sort(
                  (a, b) => {
                    // Extract the numeric part from id (img_track0_265, etc.)
                    const numA = parseInt(
                      a.properties.id.match(/_(\d+)$/)?.[1] || 0
                    );
                    const numB = parseInt(
                      b.properties.id.match(/_(\d+)$/)?.[1] || 0
                    );
                    return numA - numB;
                  }
                );

                return {
                  type: "Feature",
                  properties: { trackName },
                  geometry: {
                    type: "LineString",
                    coordinates: sortedFeatures.map(
                      (feature) => feature.geometry.coordinates
                    ),
                  },
                };
              }),
            };

            setImagePath(paths);
          }

          setIsLoading(false);
          return;
        }

        // Handle old API format
        if (result.status === "success" && Array.isArray(result.data)) {
          // Sort the data by numerical ID first
          const sortedData = [...result.data].sort((a, b) => {
            // Extract the numeric part from feature_id (img1, img2, etc.)
            const numA = parseInt(a.feature_id?.replace(/\D/g, "") || 0);
            const numB = parseInt(b.feature_id?.replace(/\D/g, "") || 0);
            return numA - numB;
          });

          // Transform API data into GeoJSON format
          const features = sortedData.map((item) => {
            // Handle different image URL formats
            const imageUrl =
              item.image_url_high || item.imageUrl_High || item.image_url || "";

            return {
              type: "Feature",
              properties: {
                id: item.feature_id || item.id,
                imageUrl: imageUrl.replace(
                  "http://192.168.68.112:8000/",
                  "/api/proxy/"
                ),
                imageUrl_High: (
                  item.image_url_high ||
                  item.imageUrl_High ||
                  ""
                ).replace("http://192.168.68.112:8000/", "/api/proxy/"),
                imageUrl_Comp: (
                  item.image_url_comp ||
                  item.imageUrl_Comp ||
                  ""
                ).replace("http://192.168.68.112:8000/", "/api/proxy/"),
                initialYaw: item.initial_yaw || item.initialYaw || 0,
                initialPitch: item.initial_pitch || item.initialPitch || 0,
                initialHfov: item.initial_hfov || item.initialHfov || 100,
                showCompass: item.show_compass || item.showCompass || true,
              },
              geometry: {
                type: "Point",
                coordinates: [
                  parseFloat(item.longitude || 0),
                  parseFloat(item.latitude || 0),
                ],
              },
            };
          });

          const geoJSON = {
            type: "FeatureCollection",
            features,
          };

          setImageData(geoJSON);

          // Group by tracks (for line segments)
          const trackGroups = {};

          // Group features by track ID
          features.forEach((feature) => {
            const id = feature.properties.id;
            // Extract track name using regex (e.g., "track0" from "img_track0_265")
            const trackMatch = id.match(/img_([^_]+)/);

            if (trackMatch) {
              const trackName = trackMatch[1]; // This will be "track0", "track1", etc.
              if (!trackGroups[trackName]) {
                trackGroups[trackName] = [];
              }
              trackGroups[trackName].push(feature);
            } else {
              // If no track match, put in default group
              if (!trackGroups["default"]) {
                trackGroups["default"] = [];
              }
              trackGroups["default"].push(feature);
            }
          });

          // Create path GeoJSON with multiple LineStrings (one per track)
          const paths = {
            type: "FeatureCollection",
            features: Object.keys(trackGroups).map((trackName) => {
              // Sort features by ID before creating the path
              const sortedFeatures = [...trackGroups[trackName]].sort(
                (a, b) => {
                  // Extract numeric part from id
                  const numA = parseInt(
                    a.properties.id.match(/_(\d+)$/)?.[1] || 0
                  );
                  const numB = parseInt(
                    b.properties.id.match(/_(\d+)$/)?.[1] || 0
                  );
                  return numA - numB;
                }
              );

              return {
                type: "Feature",
                properties: { trackName },
                geometry: {
                  type: "LineString",
                  coordinates: sortedFeatures.map(
                    (feature) => feature.geometry.coordinates
                  ),
                },
              };
            }),
          };

          setImagePath(paths);
        } else {
          throw new Error("Invalid data format received from API");
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching image data:", err);
        setError(err.message);
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return { imageData, imagePath, isLoading, error };
}

// For backward compatibility with existing code that imports directly
// We provide these default exports, but they will be empty initially
export const imageData = emptyGeoJSON;

// Generated path from the points
export const imagePath = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: [],
  },
};
