"use client";

import React, { useState, useCallback, useEffect } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  AttributionControl,
  Marker,
} from "react-map-gl/maplibre";
import SelectedMarker from "./map/SelectedMarker";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "../context/ThemeContext";
import { IoRefreshOutline } from "react-icons/io5";

const MapComponent = ({
  imageData,
  pathData,
  selectedImageId,
  onImageSelect,
  isCompact = false,
  customMapStyle = null,
  refreshData,
  isLoading,
}) => {
  const { darkMode } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [isHoveringPath, setIsHoveringPath] = useState(false);
  const [nearbyPoints, setNearbyPoints] = useState([]); // New state for nearby points
  const [hoverRadius, setHoverRadius] = useState(0.001); // Configurable hover radius (in degrees)

  // Handle refresh click
  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshData();
    // Add a small timeout to show the spinning animation
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Dynamically set map style based on theme
  const mapStyle =
    customMapStyle ||
    (darkMode
      ? "https://map.barikoi.com/styles/barikoi-dark-mode/style.json?key=NDE2NzpVNzkyTE5UMUoy"
      : "https://map.barikoi.com/styles/barikoi-light/style.json?key=NDE2NzpVNzkyTE5UMUoy");

  const [viewState, setViewState] = useState({
    longitude: imageData.features[0]?.geometry.coordinates[0] || 0,
    latitude: imageData.features[0]?.geometry.coordinates[1] || 0,
    zoom: 14,
    pitch: 0,
    bearing: 0,
  });

  // State to store track groups
  const [trackGroups, setTrackGroups] = useState({});

  // State for coordinate type toggle (snapped vs original)
  const [useSnappedCoordinates, setUseSnappedCoordinates] = useState(true);

  // Function to toggle between coordinate types
  const toggleCoordinateType = () => {
    setUseSnappedCoordinates((prev) => !prev);
  };

  // Effect to update map view when selected image changes
  useEffect(() => {
    if (
      selectedImageId &&
      imageData.features &&
      imageData.features.length > 0
    ) {
      const selectedFeature = imageData.features.find(
        (feature) => feature.properties.id === selectedImageId
      );

      if (selectedFeature) {
        const [lon, lat] = getCoordinates(selectedFeature);

        // Update the map view to center on the selected image
        setViewState((prev) => ({
          ...prev,
          longitude: lon,
          latitude: lat,
          // We maintain the current zoom level or set it to a reasonable level if needed
          zoom: prev.zoom < 13 ? 15 : prev.zoom,
          // Optional: animate transition with a slight duration
          transitionDuration: 500,
          padding: [50, 50, 50, 50], // Add padding around the view
        }));
      }
    }
  }, [selectedImageId, imageData.features, useSnappedCoordinates]);

  // Calculate circle radius based on zoom level
  const getCircleRadius = () => {
    // Base radius at zoom level 14
    const baseRadius = 2.5;

    // More pronounced zoom scaling
    const zoomFactor = Math.pow(1.8, viewState.zoom - 14);

    // Limit the minimum and maximum size
    return Math.max(2, Math.min(baseRadius * zoomFactor, 14));
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
    // Return a beautiful blue gradient color
    return "rgba(0, 128, 255, 0.8)";
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
      // Get features at click point
      const features = event.features || [];

      if (features.length > 0) {
        const feature = features[0];
        const featureId = feature.layer.id;
        const featureProps = feature.properties;

        // Check if the user clicked on a cluster
        if (
          featureId &&
          (featureId.endsWith("-clusters") ||
            featureId.endsWith("-cluster-count"))
        ) {
          // Get the cluster source
          const trackName = featureId.split("-")[0];
          const mapInstance = event.target;
          const source = mapInstance.getSource(`${trackName}-points-source`);

          // Zoom in on cluster when clicked
          const clusterId = featureProps.cluster_id;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;

            // Zoom in to the cluster
            mapInstance.easeTo({
              center: feature.geometry.coordinates,
              zoom: zoom + 0.5, // Add a bit of extra zoom for better visibility
              duration: 500,
            });
          });
        }
        // Handle clicks on individual unclustered points
        else if (
          featureId &&
          featureId.endsWith("-points") &&
          feature.properties &&
          feature.properties.id
        ) {
          onImageSelect(feature.properties.id);
        }
        // Handle clicks on path lines
        else if (featureId && featureId.endsWith("-path-line")) {
          const trackName = featureId.replace("-path-line", "");
          const trackFeatures = trackGroups[trackName]?.features;

          if (trackFeatures && trackFeatures.length > 0) {
            // Get click coordinates
            const clickPoint = [event.lngLat.lng, event.lngLat.lat];

            // Find the closest point in this track
            let closestFeature = null;
            let minDistance = Infinity;

            trackFeatures.forEach((feature) => {
              const [lon, lat] = getCoordinates(feature);
              // Simple Euclidean distance - sufficient for small distances
              const distance =
                Math.sqrt(
                  Math.pow(clickPoint[0] - lon, 2) +
                    Math.pow(clickPoint[1] - lat, 2)
                ) || 0;

              if (distance < minDistance) {
                minDistance = distance;
                closestFeature = feature;
              }
            });

            // Select the closest image
            if (closestFeature) {
              onImageSelect(closestFeature.properties.id);
            }
          }
        }
      }
    },
    [onImageSelect, trackGroups]
  );

  // Get all layer IDs for interactive layers - including clusters and path lines
  const interactiveLayerIds = Object.keys(trackGroups).flatMap((trackName) => [
    `${trackName}-points`,
    `${trackName}-clusters`,
    `${trackName}-cluster-count`,
    `${trackName}-path-line`,
  ]);

  // Find the nearest point to the cursor when hovering on a path
  const findNearestPointOnPath = useCallback(
    (cursorPosition, trackName) => {
      const trackFeatures = trackGroups[trackName]?.features;

      if (!trackFeatures || trackFeatures.length === 0) {
        return null;
      }

      // Extract cursor coordinates
      const [cursorLng, cursorLat] = cursorPosition;

      // Find the closest point in this track
      let closestFeature = null;
      let minDistance = Infinity;

      trackFeatures.forEach((feature) => {
        const [lon, lat] = getCoordinates(feature);

        // Simple Euclidean distance - sufficient for small distances
        const distance =
          Math.sqrt(
            Math.pow(cursorLng - lon, 2) + Math.pow(cursorLat - lat, 2)
          ) || 0;

        if (distance < minDistance) {
          minDistance = distance;
          closestFeature = feature;
        }
      });

      // Return coordinates of the closest feature
      if (closestFeature) {
        const [lon, lat] = getCoordinates(closestFeature);
        return {
          coordinates: [lon, lat],
          feature: closestFeature,
        };
      }

      return null;
    },
    [trackGroups]
  );

  // Find nearby points within a certain radius of the cursor when hovering on a path
  const findNearbyPointsOnPath = useCallback(
    (cursorPosition, trackName) => {
      const trackFeatures = trackGroups[trackName]?.features;

      if (!trackFeatures || trackFeatures.length === 0) {
        return [];
      }

      // Extract cursor coordinates
      const [cursorLng, cursorLat] = cursorPosition;

      // Find points within the hover radius
      const nearby = [];

      trackFeatures.forEach((feature) => {
        const [lon, lat] = getCoordinates(feature);

        // Simple Euclidean distance - sufficient for small distances
        const distance =
          Math.sqrt(
            Math.pow(cursorLng - lon, 2) + Math.pow(cursorLat - lat, 2)
          ) || 0;

        // If within radius, add to nearby points
        if (distance < hoverRadius) {
          nearby.push({
            coordinates: [lon, lat],
            feature: feature,
            distance: distance,
          });
        }
      });

      // Sort by distance (closest first)
      nearby.sort((a, b) => a.distance - b.distance);

      // Return all nearby points
      return nearby;
    },
    [trackGroups, hoverRadius]
  );

  // Handle mouse move over path lines
  const onMouseMove = useCallback(
    (event) => {
      // Only process if we have features and they're from a path line layer
      if (event.features && event.features.length > 0) {
        const feature = event.features[0];
        const featureId = feature.layer.id;

        // Check if we're hovering over a path line
        if (featureId && featureId.endsWith("-path-line")) {
          setIsHoveringPath(true);

          // Extract track name from the layer ID
          const trackName = featureId.replace("-path-line", "");

          // Get cursor position
          const cursorPosition = [event.lngLat.lng, event.lngLat.lat];

          // Find nearest point for the main hover marker
          const nearestPoint = findNearestPointOnPath(
            cursorPosition,
            trackName
          );

          if (nearestPoint) {
            setHoveredPoint(nearestPoint.coordinates);
          }

          // Find nearby points for additional reddish markers
          const nearby = findNearbyPointsOnPath(cursorPosition, trackName);
          setNearbyPoints(nearby);
        }
      } else {
        // When not hovering over any path, clear the hover state after a brief delay
        // This creates a smoother experience as the marker doesn't disappear immediately
        // when moving slightly off the path
        if (isHoveringPath) {
          setTimeout(() => {
            if (!isHoveringPath) {
              setHoveredPoint(null);
              setNearbyPoints([]);
            }
          }, 300);
          setIsHoveringPath(false);
        }
      }
    },
    [findNearestPointOnPath, findNearbyPointsOnPath, isHoveringPath]
  );

  // Clear hovered point when mouse leaves the map
  const onMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setNearbyPoints([]);
    setIsHoveringPath(false);
  }, []);

  return (
    <div className='relative rounded-xl overflow-hidden shadow-lg'>
      <Map
        {...viewState}
        style={{ width: "100%", height: isCompact ? "300px" : "75vh" }}
        mapStyle={mapStyle}
        onMove={(evt) => setViewState(evt.viewState)}
        interactiveLayerIds={interactiveLayerIds}
        onClick={onMapClick}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        dragRotate={!isCompact}
        pitchWithRotate={!isCompact}
        attributionControl={false}
      >
        {/* Map Controls - Don't show in compact mode */}
        {!isCompact && (
          <>
            <NavigationControl position='top-right' visualizePitch={true} />
            <ScaleControl position='bottom-right' />
            <AttributionControl
              position='bottom-left'
              customAttribution='ThirdEye360'
            />
          </>
        )}

        {/* Track-specific Layers */}
        {Object.keys(trackGroups).map((trackName) => (
          <React.Fragment key={trackName}>
            {/* Path outline/glow effect - render this first for proper layering */}
            <Source
              id={`${trackName}-path-outline-source`}
              type='geojson'
              data={trackGroups[trackName].path}
            >
              <Layer
                id={`${trackName}-path-outline`}
                type='line'
                paint={{
                  "line-color": darkMode
                    ? "rgba(0, 128, 255, 0.4)"
                    : "rgba(0, 92, 230, 0.5)",
                  "line-width": 9,
                  "line-blur": 8,
                  "line-opacity": 0.6,
                }}
              />
            </Source>

            {/* Main path line */}
            <Source
              id={`${trackName}-path-source`}
              type='geojson'
              data={trackGroups[trackName].path}
            >
              <Layer
                id={`${trackName}-path-line`}
                type='line'
                paint={{
                  "line-color": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    "#0080ff",
                    16,
                    "#0099ff",
                    20,
                    "#00bbff",
                  ],
                  "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    2,
                    14,
                    4,
                    18,
                    6,
                  ],
                  "line-opacity": 0.85,
                }}
              />
            </Source>

            {/* Add directional arrows to show path direction */}
            <Source
              id={`${trackName}-arrows-source`}
              type='geojson'
              data={trackGroups[trackName].path}
            >
              <Layer
                id={`${trackName}-arrows`}
                type='symbol'
                paint={{}}
                layout={{
                  "symbol-placement": "line",
                  "symbol-spacing": 100,
                  "icon-image": "arrow",
                  "icon-size": 0.5,
                  visibility: isCompact ? "none" : "visible",
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

        {/* Hover effect - show a marker or highlight for the hovered point */}
        {hoveredPoint && (
          <Marker
            longitude={hoveredPoint[0]}
            latitude={hoveredPoint[1]}
            anchor='center'
            color={darkMode ? "#ff6677" : "#ff1177"}
            radius={getCircleRadius()}
            strokeWidth={2}
            strokeColor={darkMode ? "#000" : "#fff"}
            style={{ transition: "transform 0.2s" }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: darkMode ? "#ff6677" : "#ff1177",
                transform: "scale(1.2)",
              }}
            />
          </Marker>
        )}

        {/* Nearby points rendering - shows available points within hover radius */}
        {nearbyPoints.map((point, index) => {
          // Skip the first one if it's the same as the hovered point (to avoid duplicate markers)
          if (
            index === 0 &&
            hoveredPoint &&
            hoveredPoint[0] === point.coordinates[0] &&
            hoveredPoint[1] === point.coordinates[1]
          ) {
            return null;
          }

          // Limit the number of nearby points shown
          if (index > 15) return null;

          return (
            <Marker
              key={`nearby-${index}`}
              longitude={point.coordinates[0]}
              latitude={point.coordinates[1]}
              anchor='center'
            >
              <div
                className='nearby-point'
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: darkMode ? "#ff3344" : "#ff2244",
                  border: `2px solid ${darkMode ? "#000000" : "#ffffff"}`,
                  opacity: 1 - (point.distance / hoverRadius) * 0.7, // Fade based on distance
                  boxShadow: "0 0 8px rgba(255, 0, 0, 0.6)",
                  transform: `scale(${
                    1.2 - (point.distance / hoverRadius) * 0.4
                  })`, // Scale based on distance
                }}
              />
            </Marker>
          );
        })}
      </Map>

      {/* Refresh button in the top-left corner */}
      {!isCompact && (
        <div className='absolute top-28 right-1 z-10'>
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className='glass p-2.5 rounded-xl shadow-md hover:shadow-lg transition-all border border-white/30 flex items-center justify-center'
            title='Refresh data'
          >
            <IoRefreshOutline
              className={`w-5 h-5 ${
                isRefreshing || isLoading
                  ? "animate-spin text-blue-500"
                  : "text-gray-700"
              }`}
            />
          </button>
        </div>
      )}

      {/* Hover marker - this will appear when hovering over a path
      {hoveredPoint && !isCompact && (
        <div
          className='absolute z-30 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none'
          style={{
            left: "50%",
            top: "50%",
            transition: "opacity 0.2s ease-in-out",
          }}
        >
          <div className='flex flex-col items-center'>
            <div className='glass px-3 py-1.5 rounded-lg shadow-lg mb-2 text-sm border border-blue-400/30'>
              <span className='text-blue-500 font-medium'>Click to view</span>
            </div>
            <div className='w-4 h-4 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50 border-2 border-white'></div>
          </div>
        </div>
      )} */}

      {/* Toggle button in the top-right corner - with compact version for mini-map */}
      <div className={`absolute top-3 right-${isCompact ? "3" : "16"} z-10`}>
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
            className='glass px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center space-x-2 transition-all hover:shadow-xl border border-white/30'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 20 20'
              fill='currentColor'
              className={`w-5 h-5 ${
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
                useSnappedCoordinates
                  ? "text-blue-600 font-bold"
                  : "text-gray-600"
              }
            >
              {useSnappedCoordinates ? "Snapped Path" : "Original Path"}
            </span>
            <div
              className={`w-10 h-5 rounded-full p-0.5 ml-1 transition-colors duration-300 ${
                useSnappedCoordinates ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transform duration-300 ease-in-out shadow-md ${
                  useSnappedCoordinates ? "translate-x-5" : "translate-x-0"
                }`}
              ></div>
            </div>
          </button>
        )}
      </div>

      {/* Instructions overlay - only on main map */}
      {!isCompact && (
        <div className='absolute left-4 bottom-16 glass p-3 rounded-lg shadow-lg max-w-xs text-sm opacity-80 hover:opacity-100 transition-opacity duration-300'>
          <p className='font-medium'>
            Click on any red point to view the street image at that location.
          </p>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
