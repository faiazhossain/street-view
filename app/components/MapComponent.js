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
  isCompact = false,
  mapStyle = "https://map.barikoi.com/styles/barikoi-light/style.json?key=NDE2NzpVNzkyTE5UMUoy",
}) => {
  const [viewState, setViewState] = useState({
    longitude: imageData.features[0]?.geometry.coordinates[0] || 0,
    latitude: imageData.features[0]?.geometry.coordinates[1] || 0,
    zoom: 14,
  });

  // State to store track groups
  const [trackGroups, setTrackGroups] = useState({});

  // State for coordinate type toggle (snapped vs original)
  const [useSnappedCoordinates, setUseSnappedCoordinates] = useState(true);

  // Function to toggle between coordinate types
  const toggleCoordinateType = () => {
    setUseSnappedCoordinates((prev) => !prev);
  };

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

  // Helper function to get coordinates based on toggle state
  const getCoordinates = (feature) => {
    if (useSnappedCoordinates) {
      // Use snapped coordinates when the toggle is for snapped
      const lon =
        feature.properties.longitude_snapped || feature.geometry.coordinates[0];
      const lat =
        feature.properties.latitude_snapped || feature.geometry.coordinates[1];
      return [lon, lat];
    } else {
      // Use original coordinates when toggle is for original
      const lon =
        feature.properties.longitude_original ||
        feature.geometry.coordinates[0];
      const lat =
        feature.properties.latitude_original || feature.geometry.coordinates[1];
      return [lon, lat];
    }
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
        (feature) => getCoordinates(feature)
      );
    });

    setTrackGroups(groups);
  }, [imageData, useSnappedCoordinates]); // Added useSnappedCoordinates as dependency

  // Generate different colors for different tracks
  const getTrackColor = () => {
    // Return static blue color for all tracks
    return "#0080ff";
  };

  // Create feature collection with appropriate coordinates based on toggle
  const getPointsFeatureCollection = (features) => {
    return {
      type: "FeatureCollection",
      features: features.map((feature) => {
        // Make a deep copy to avoid mutating the original
        const newFeature = JSON.parse(JSON.stringify(feature));

        // Update coordinates based on toggle selection
        newFeature.geometry.coordinates = getCoordinates(feature);

        return newFeature;
      }),
    };
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
    <div className='relative'>
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
              data={getPointsFeatureCollection(trackGroups[trackName].features)}
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
            .map((feature) => {
              // For selected marker, adjust coordinates based on toggle
              const markerFeature = { ...feature };
              const [lon, lat] = getCoordinates(feature);

              markerFeature.geometry = {
                ...markerFeature.geometry,
                coordinates: [lon, lat],
              };

              return (
                <SelectedMarker
                  key={feature.properties.id}
                  feature={markerFeature}
                />
              );
            })}
      </Map>

      {/* Toggle button in the top-right corner - with compact version for mini-map */}
      <div className={`absolute top-3 right-3 z-10`}>
        {isCompact ? (
          /* Compact toggle for mini-map */
          <button
            onClick={toggleCoordinateType}
            className='bg-white bg-opacity-70 p-1 rounded shadow-sm flex items-center text-xs border border-gray-200'
            title={
              useSnappedCoordinates
                ? "Using: Snapped Path"
                : "Using: Original Path"
            }
          >
            <div
              className={`w-6 h-3 rounded-full relative ${
                useSnappedCoordinates ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute w-2.5 h-2.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                  useSnappedCoordinates ? "translate-x-3" : "translate-x-0.5"
                } top-[1px]`}
              ></div>
            </div>
            <span className='ml-1 text-[10px] font-medium'>
              {useSnappedCoordinates ? "S" : "O"}
            </span>
          </button>
        ) : (
          /* Full-size toggle for main map */
          <button
            onClick={toggleCoordinateType}
            className='bg-white px-3 py-2 rounded-lg shadow-md text-sm font-semibold flex items-center space-x-1.5 transition-all hover:bg-gray-50 border border-gray-200'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 20 20'
              fill='currentColor'
              className={`w-4 h-4 ${
                useSnappedCoordinates ? "text-blue-600" : "text-gray-600"
              }`}
            >
              <path
                fillRule='evenodd'
                d='M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z'
                clipRule='evenodd'
              />
            </svg>
            <span
              className={
                useSnappedCoordinates ? "text-blue-600" : "text-gray-600"
              }
            >
              {useSnappedCoordinates ? "Snapped Path" : "Original Path"}
            </span>
            <div
              className={`w-8 h-4 rounded-full p-0.5 ml-1 ${
                useSnappedCoordinates ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transform duration-200 ease-in-out ${
                  useSnappedCoordinates ? "translate-x-4" : "translate-x-0"
                }`}
              ></div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default MapComponent;
