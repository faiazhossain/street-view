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
      const response = await fetch(`/api/features?_t=${timestamp}`);

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
        const pathCoordinates = result.features.map(
          (feature) => feature.geometry.coordinates
        );

        const pathData = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: pathCoordinates,
          },
          properties: {
            name: "Street View Path",
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
