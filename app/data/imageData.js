// Simplified data fetching hook
"use client";

import { useState, useEffect, useCallback } from "react";

// Default empty data structure
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
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  // Memoize fetchData to use in multiple places
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Add timestamp to URL to bypass any potential caching
      const timestamp = Date.now();
      // Use the new merge-all endpoint to get GeoJSON data in the optimized format
      const response = await fetch(`/api/features/merge-all?_t=${timestamp}`);

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const result = await response.json();

      // Handle error response
      if (result.status === "error") {
        throw new Error(result.message || "Unknown API error");
      }

      // Set the image data
      setImageData(result);
      setLastRefreshed(Date.now());

      // Generate path data from the features for map display
      if (result.features && result.features.length > 0) {
        // Group features by track for better path organization
        const trackGroups = {};

        result.features.forEach((feature) => {
          // Extract track identifier from the ID (format "XX_YY" where XX is track)
          const id = feature.properties.id;
          const trackMatch = id.match(/^(\d+)_/);
          const trackId = trackMatch ? trackMatch[1] : "default";

          if (!trackGroups[trackId]) {
            trackGroups[trackId] = [];
          }

          // Use snapped coordinates if available, otherwise use original
          const coordinates = feature.properties.longitude_snapped
            ? [
                feature.properties.longitude_snapped,
                feature.properties.latitude_snapped,
              ]
            : feature.geometry.coordinates;

          trackGroups[trackId].push(coordinates);
        });

        // Create a MultiLineString with separate path for each track
        const pathData = {
          type: "Feature",
          geometry: {
            type: "MultiLineString",
            coordinates: Object.values(trackGroups),
          },
          properties: {
            name: "Street View Paths",
          },
        };

        setImagePath(pathData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to manually refresh data
  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    imageData,
    imagePath,
    isLoading,
    error,
    refreshData,
    lastRefreshed,
  };
}
