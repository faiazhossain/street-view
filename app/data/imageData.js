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

        if (result.status !== "success" || !Array.isArray(result.data)) {
          throw new Error("Invalid data format received from API");
        }

        // Sort the data by numerical ID first
        const sortedData = [...result.data].sort((a, b) => {
          // Extract the numeric part from feature_id (img1, img2, etc.)
          const numA = parseInt(a.feature_id.replace(/\D/g, "")) || 0;
          const numB = parseInt(b.feature_id.replace(/\D/g, "")) || 0;
          return numA - numB;
        });

        // Transform API data into GeoJSON format
        const features = sortedData.map((item) => {
          // Convert image URL to relative path that will be served through Next.js
          const imageUrl = item.image_url
            ? // If the image URL is absolute with the IP, convert it to a relative path
              item.image_url.replace(
                "http://192.168.68.112:8000/",
                "/api/proxy/"
              )
            : item.image_url;

          return {
            type: "Feature",
            properties: {
              id: item.feature_id,
              imageUrl: imageUrl,
              initialYaw: item.initial_yaw,
              initialPitch: item.initial_pitch,
              initialHfov: item.initial_hfov,
              showCompass: item.show_compass,
            },
            geometry: {
              type: "Point",
              coordinates: [item.longitude, item.latitude],
            },
          };
        });

        const geoJSON = {
          type: "FeatureCollection",
          features,
        };

        setImageData(geoJSON);

        // Generate path from the points
        if (features.length > 0) {
          const pathGeoJSON = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: features.map(
                (feature) => feature.geometry.coordinates
              ),
            },
          };
          setImagePath(pathGeoJSON);
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
