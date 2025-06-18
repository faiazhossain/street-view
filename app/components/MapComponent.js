"use client";

import React, { useState, useCallback, useEffect } from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import SelectedMarker from "./map/SelectedMarker";
import "maplibre-gl/dist/maplibre-gl.css";

const MapComponent = ({
  imageData,
  pathData,
  selectedImageId,
  onImageSelect,
  mapStyle = "https://map.barikoi.com/styles/barikoi-light/style.json?key=NDE2NzpVNzkyTE5UMUoy",
}) => {
  const [viewState, setViewState] = useState({
    longitude: imageData.features[0]?.geometry.coordinates[0] || 0,
    latitude: imageData.features[0]?.geometry.coordinates[1] || 0,
    zoom: 14,
  });

  // State to store track groups
  const [trackGroups, setTrackGroups] = useState({});

  // Calculate circle radius based on zoom level
  const getCircleRadius = () => {
    // Base radius at zoom level 14
    const baseRadius = 1.5;

    // More pronounced zoom scaling
    const zoomFactor = Math.pow(1.75, viewState.zoom - 14);

    // Limit the minimum and maximum size
    // Smaller minimum size (1.5) for low zoom levels
    return Math.max(2, Math.min(baseRadius * zoomFactor, 12));
  };

  // Group images by their track ID
  useEffect(() => {
    if (!imageData.features || imageData.features.length === 0) return;

    const groups = {};

    // Process each image
    imageData.features.forEach((feature) => {
      const id = feature.properties.id;

      // Determine track name:
      // 1. For format like "img_track0_265" - extract "track0"
      // 2. For format like "0_1" - convert to "track0"
      // 3. Fallback to default
      let trackName;

      // Extract track name using regex (e.g., "track0" from "img_track0_265")
      const trackMatch = id?.match(/img_([^_]+)/);

      // New format handling for IDs like "0_1" - extract the first part as track
      const newFormatMatch = id?.match(/^(\d+)_\d+$/);

      if (trackMatch) {
        trackName = trackMatch[1]; // This will be "track0", "track1", etc.
      } else if (newFormatMatch) {
        trackName = "track" + newFormatMatch[1]; // Convert "0_1" to "track0"
      } else {
        trackName = "default"; // Fallback name
      }

      // Initialize track group if first time seeing this track
      if (!groups[trackName]) {
        groups[trackName] = {
          features: [],
          color: getTrackColor(trackName), // Get a unique color for each track
          path: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [],
            },
          },
        };
      }

      // Add feature to track group
      groups[trackName].features.push(feature);
    });

    // Create path LineString for each track
    Object.keys(groups).forEach((trackName) => {
      // Sort features by ID if needed for proper path order
      const sortedFeatures = [...groups[trackName].features].sort((a, b) => {
        let numA, numB;
        const id_a = a.properties.id;
        const id_b = b.properties.id;

        if (id_a?.includes("_")) {
          // Handle both formats: img_track0_265 or 0_1
          numA = parseInt(
            id_a.match(/_(\d+)$/)?.[1] || id_a.split("_")[1] || 0
          );
        } else {
          numA = parseInt(id_a?.replace(/\D/g, "") || 0);
        }

        if (id_b?.includes("_")) {
          numB = parseInt(
            id_b.match(/_(\d+)$/)?.[1] || id_b.split("_")[1] || 0
          );
        } else {
          numB = parseInt(id_b?.replace(/\D/g, "") || 0);
        }

        return numA - numB;
      });

      // Create path coordinates from sorted features
      groups[trackName].path.geometry.coordinates = sortedFeatures.map(
        (feature) => feature.geometry.coordinates
      );
    });

    setTrackGroups(groups);
  }, [imageData]);

  // Generate different colors for different tracks
  const getTrackColor = () => {
    // Return static blue color for all tracks
    return "#0080ff";
  };

  const onMapClick = useCallback(
    (event) => {
      // Handle when the user clicks on the map but not on a marker
      const features = event.features || [];

      if (features.length > 0) {
        const feature = features[0];
        if (feature.properties && feature.properties.id) {
          onImageSelect(feature.properties.id);
        }
      }
    },
    [onImageSelect]
  );

  // Get all layer IDs for interactive layers
  const interactiveLayerIds = Object.keys(trackGroups).map(
    (trackName) => `${trackName}-points`
  );

  return (
    <Map
      {...viewState}
      style={{ width: "100%", height: "500px" }}
      mapStyle={mapStyle}
      onMove={(evt) => setViewState(evt.viewState)}
      interactiveLayerIds={interactiveLayerIds}
      onClick={onMapClick}
    >
      {/* Track-specific Layers */}
      {Object.keys(trackGroups).map((trackName) => (
        <React.Fragment key={trackName}>
          {/* First render the track path layer (lines below) */}
          <Source
            id={`${trackName}-path-source`}
            type='geojson'
            data={trackGroups[trackName].path}
          >
            <Layer
              id={`${trackName}-path-line`}
              type='line'
              paint={{
                "line-color": trackGroups[trackName].color,
                "line-width": 4,
                "line-opacity": 0.8,
              }}
            />
          </Source>

          {/* Then render the track points layer (points on top) */}
          <Source
            id={`${trackName}-points-source`}
            type='geojson'
            data={{
              type: "FeatureCollection",
              features: trackGroups[trackName].features,
            }}
          >
            <Layer
              id={`${trackName}-points`}
              type='circle'
              paint={{
                "circle-radius": getCircleRadius(),
                "circle-color": "#FF0000", // Red color for all points
                "circle-opacity": 0.8,
                "circle-stroke-width": 0.5,
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
        </React.Fragment>
      ))}

      {/* Selected Image Marker */}
      {selectedImageId &&
        imageData.features
          .filter((feature) => feature.properties.id === selectedImageId)
          .map((feature) => (
            <SelectedMarker key={feature.properties.id} feature={feature} />
          ))}
    </Map>
  );
};

export default MapComponent;
