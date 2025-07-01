// Simplified data fetching hook
'use client';

import { useState, useEffect } from 'react';

// Default empty data structure
const emptyGeoJSON = {
  type: 'FeatureCollection',
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
        setError(null);

        // Fetch data from our simplified API route
        const response = await fetch('/api/features');

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const result = await response.json();

        // Handle error response
        if (result.status === 'error') {
          throw new Error(result.message || 'Unknown API error');
        }

        // Set the image data
        setImageData(result);

        // Generate path data from the features for map display
        if (result.features && result.features.length > 0) {
          const pathCoordinates = result.features.map(
            (feature) => feature.geometry.coordinates
          );

          const pathData = {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: pathCoordinates,
            },
            properties: {
              name: 'Street View Path',
            },
          };

          setImagePath(pathData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
        setImageData(emptyGeoJSON);
        setImagePath(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return {
    imageData,
    imagePath,
    isLoading,
    error,
  };
}
