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
import {
  loadGeoJsonFromLocal,
  saveGeoJsonToLocal,
  isGeoJsonStale,
} from "../utils/localStorageUtils";

const MapComponent = ({
  imageData,
  pathData,
  selectedImageId,
  onImageSelect,
  isCompact = false,
  customMapStyle = null,
  refreshData,
  isLoading,
  initialViewState = null, // Add initialViewState prop with default value of null
}) => {
  const { darkMode } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [isHoveringPath, setIsHoveringPath] = useState(false);
  const [nearbyPoints, setNearbyPoints] = useState([]); // State for nearby points
  const [hoverRadius, setHoverRadius] = useState(0.001); // Configurable hover radius (in degrees)
  const [geoJsonData, setGeoJsonData] = useState(null); // State for the GeoJSON data from API

  // State for coordinate type toggle (snapped vs original)
  const [useSnappedCoordinates, setUseSnappedCoordinates] = useState(true);

  // Instead of hover points, we'll create a GeoJSON layer for all points
  const [pointsGeoJSON, setPointsGeoJSON] = useState({
    type: "FeatureCollection",
    features: [],
  });

  // Function to toggle between coordinate types
  const toggleCoordinateType = () => {
    setUseSnappedCoordinates((prev) => !prev);
  };

  // Fetch GeoJSON data from API when component mounts or refreshData is called
  useEffect(() => {
    const fetchGeoJsonData = async (forceRefresh = false) => {
      try {
        setIsRefreshing(true);

        // If we're not forcing a refresh, try to get data from local storage first
        if (!forceRefresh) {
          const localData = await loadGeoJsonFromLocal();
          if (localData && !isGeoJsonStale()) {
            console.log(
              "Using cached GeoJSON data from IndexedDB/local storage"
            );
            setGeoJsonData(localData);
            setIsRefreshing(false);
            return;
          }
        }

        // Add timestamp to prevent caching issues
        const timestamp = new Date().getTime();
        // Add refresh parameter if we're forcing refresh
        const apiUrl = `/api/features/merge-all?_t=${timestamp}${
          forceRefresh ? "&refresh=true" : ""
        }`;

        console.log("Fetching GeoJSON data from API");
        const response = await fetch(apiUrl, {
          cache: "no-store",
          // Set longer timeout as we're handling fallbacks properly now
          signal: AbortSignal.timeout(15000), // 15 seconds timeout
        });

        if (!response.ok) {
          // If status is 504 (Gateway Timeout), throw a specific error
          if (response.status === 504) {
            throw new Error(
              "API Gateway Timeout (504). Using cached data instead."
            );
          }
          throw new Error(`Network response error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          console.warn("API returned error:", data.error, data.message);
          throw new Error(data.message || "Error in API response");
        }

        // Save data to IndexedDB/local storage
        try {
          await saveGeoJsonToLocal(data);
          console.log("Saved GeoJSON data to IndexedDB/local storage");
        } catch (storageError) {
          console.error("Failed to save GeoJSON data locally:", storageError);
          // Continue with the data even if storage fails
        }

        setGeoJsonData(data);
      } catch (error) {
        console.error("Error fetching GeoJSON data:", error);

        // If API fetch failed, try local storage as a fallback
        try {
          const localData = await loadGeoJsonFromLocal();
          if (localData) {
            console.log(
              "API fetch failed. Using IndexedDB/local storage as fallback."
            );
            setGeoJsonData(localData);

            // Show non-blocking notification
            if (!forceRefresh) {
              // Only show alert if user explicitly requested a refresh
              if (forceRefresh) {
                alert(
                  `Could not refresh data: ${error.message}\nUsing cached data instead.`
                );
              }
            }
          } else {
            // Critical error - no data available
            alert(
              `Failed to load map data: ${error.message}\nPlease check your connection and try again.`
            );
          }
        } catch (localStorageError) {
          console.error(
            "Failed to load from IndexedDB/local storage:",
            localStorageError
          );
          alert(
            `Failed to load map data from any source. Please check your connection and try again.`
          );
        }
      } finally {
        setIsRefreshing(false);
      }
    };

    fetchGeoJsonData();

    // Make the fetchGeoJsonData function available to the component
    window.fetchGeoJsonData = fetchGeoJsonData;
  }, [refreshData]);

  // Use the GeoJSON data if available, otherwise fall back to the imageData prop
  const displayData = geoJsonData || imageData;

  // Populate pointsGeoJSON whenever the display data changes
  useEffect(() => {
    if (displayData?.features && displayData.features.length > 0) {
      // Create a proper GeoJSON structure for all points
      const features = displayData.features.map((feature) => {
        const [lon, lat] = getCoordinates(feature);
        return {
          type: "Feature",
          properties: {
            ...feature.properties,
            id: feature.properties.id,
          },
          geometry: {
            type: "Point",
            coordinates: [lon, lat],
          },
        };
      });

      setPointsGeoJSON({
        type: "FeatureCollection",
        features,
      });
    }
  }, [displayData, useSnappedCoordinates]);

  // Handle refresh click
  const handleRefresh = () => {
    // Prevent starting a new refresh if already refreshing
    if (isRefreshing) return;

    setIsRefreshing(true);

    if (refreshData) {
      // If using parent component's refresh function
      const refreshPromise = refreshData();

      // Handle both Promise and non-Promise return values
      if (refreshPromise && typeof refreshPromise.then === "function") {
        refreshPromise
          .catch((err) => console.error("Error during refresh:", err))
          .finally(() => setIsRefreshing(false));
      } else {
        // If refreshData doesn't return a promise, use a timeout to prevent UI locking
        setTimeout(() => setIsRefreshing(false), 2000);
      }
    } else {
      // Force refresh from API with window.fetchGeoJsonData
      // The fetchGeoJsonData function will handle setting isRefreshing to false in its finally block
      if (window.fetchGeoJsonData) {
        window.fetchGeoJsonData(true);
      } else {
        // Fallback in case fetchGeoJsonData isn't available
        console.error("fetchGeoJsonData function not available");
        setIsRefreshing(false);
      }
    }
  };

  // Dynamically set map style based on theme
  const mapStyle =
    customMapStyle ||
    (darkMode
      ? "https://map.barikoi.com/styles/barikoi-dark-mode/style.json?key=NDE2NzpVNzkyTE5UMUoy"
      : "https://map.barikoi.com/styles/barikoi-light/style.json?key=NDE2NzpVNzkyTE5UMUoy");

  // Initialize view state from initialViewState (if provided) or from the first feature in the data
  const [viewState, setViewState] = useState(
    initialViewState || {
      longitude: displayData?.features?.[0]?.geometry.coordinates[0] || 0,
      latitude: displayData?.features?.[0]?.geometry.coordinates[1] || 0,
      zoom: 14,
      pitch: 0,
      bearing: 0,
    }
  );

  // Update the view state when the GeoJSON data changes
  useEffect(() => {
    if (displayData?.features && displayData.features.length > 0) {
      setViewState((prev) => ({
        ...prev,
        longitude:
          displayData.features[0]?.geometry.coordinates[0] || prev.longitude,
        latitude:
          displayData.features[0]?.geometry.coordinates[1] || prev.latitude,
      }));
    }
  }, [displayData]);

  // Fly to the selected point when selectedImageId changes
  useEffect(() => {
    if (selectedImageId && displayData?.features) {
      const selectedFeature = displayData.features.find(
        (feature) => feature.properties.id === selectedImageId
      );

      if (selectedFeature) {
        // Get coordinates based on toggle state (snapped or original)
        const [lng, lat] = getCoordinates(selectedFeature);

        // Smoothly fly to the selected point
        setViewState((prev) => ({
          ...prev,
          longitude: lng,
          latitude: lat,
          transitionDuration: 500, // animation duration in ms
          zoom: Math.max(prev.zoom, 14), // Ensure we're zoomed in enough to see points
        }));
      }
    }
  }, [selectedImageId, displayData, useSnappedCoordinates]);

  // State to store track groups
  const [trackGroups, setTrackGroups] = useState({});

  // Generate different colors for different tracks
  const getTrackColor = () => {
    // Return a beautiful blue gradient color
    return "rgba(0, 128, 255, 0.8)";
  };

  // Helper function to get coordinates based on toggle state
  const getCoordinates = (feature) => {
    if (!feature?.properties) return [0, 0];

    // Use snapped coordinates if available and toggle is on
    if (
      useSnappedCoordinates &&
      feature.properties.longitude_snapped !== undefined &&
      feature.properties.latitude_snapped !== undefined
    ) {
      return [
        feature.properties.longitude_snapped,
        feature.properties.latitude_snapped,
      ];
    }

    // Fall back to original coordinates
    return feature.geometry.coordinates;
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

        // Check if user clicked on all-points layer
        if (featureId === "all-points") {
          if (feature.properties && feature.properties.id) {
            console.log("Selected point:", feature.properties.id);

            // Update viewport to center on clicked point
            const [lng, lat] = feature.geometry.coordinates;
            setViewState((prev) => ({
              ...prev,
              longitude: lng,
              latitude: lat,
              // Keep current zoom level
              transitionDuration: 500, // smooth animation in ms
            }));

            onImageSelect(feature.properties.id);
          }
          return;
        }

        // Check if user clicked on all-points-line layer (when zoomed out)
        if (featureId === "all-points-line") {
          const clickPoint = [event.lngLat.lng, event.lngLat.lat];

          // Find the closest point in the pointsGeoJSON
          let closestFeature = null;
          let minDistance = Infinity;

          pointsGeoJSON.features.forEach((pointFeature) => {
            const pointCoords = pointFeature.geometry.coordinates;
            // Calculate distance between click and point
            const distance =
              Math.sqrt(
                Math.pow(clickPoint[0] - pointCoords[0], 2) +
                  Math.pow(clickPoint[1] - pointCoords[1], 2)
              ) || 0;

            if (distance < minDistance) {
              minDistance = distance;
              closestFeature = pointFeature;
            }
          });

          if (closestFeature && closestFeature.properties.id) {
            console.log(
              "Selected nearest point from line:",
              closestFeature.properties.id
            );

            // Update viewport to center on closest point
            const [lng, lat] = closestFeature.geometry.coordinates;
            setViewState((prev) => ({
              ...prev,
              longitude: lng,
              latitude: lat,
              // Keep current zoom level
              transitionDuration: 500, // smooth animation in ms
            }));

            onImageSelect(closestFeature.properties.id);
          }
          return;
        }

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
          // Update viewport to center on clicked point
          const [lng, lat] = feature.geometry.coordinates;
          setViewState((prev) => ({
            ...prev,
            longitude: lng,
            latitude: lat,
            transitionDuration: 500, // smooth animation in ms
          }));

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
              // Update viewport to center on closest feature
              const [lon, lat] = getCoordinates(closestFeature);
              setViewState((prev) => ({
                ...prev,
                longitude: lon,
                latitude: lat,
                transitionDuration: 500, // smooth animation in ms
              }));

              onImageSelect(closestFeature.properties.id);
            }
          }
        }
      }
    },
    [onImageSelect, trackGroups, pointsGeoJSON]
  );

  // Get all layer IDs for interactive layers - including clusters and path lines
  const interactiveLayerIds = [
    "all-points", // Add the all-points layer as interactive
    ...Object.keys(trackGroups).flatMap((trackName) => [
      `${trackName}-points`,
      `${trackName}-clusters`,
      `${trackName}-cluster-count`,
      `${trackName}-path-line`,
    ]),
  ];

  return (
    <div className='relative rounded-xl overflow-hidden shadow-lg'>
      <Map
        {...viewState}
        style={{ width: "100%", height: isCompact ? "300px" : "75vh" }}
        mapStyle={mapStyle}
        onMove={(evt) => setViewState(evt.viewState)}
        interactiveLayerIds={interactiveLayerIds}
        onClick={onMapClick}
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

        {/* All Points - GeoJSON layer for performance */}
        <Source id='all-points-source' type='geojson' data={pointsGeoJSON}>
          <Layer
            id='all-points'
            type='circle'
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                3,
                14,
                5,
                18,
                8,
              ],
              "circle-color": darkMode ? "#ff6677" : "#ff1177",
              "circle-stroke-width": 0.2,
              "circle-stroke-color": darkMode ? "#ffffff" : "#ffffff",
              "circle-opacity": 0.8,
              // Add circle pitch alignment for 3D effect
              "circle-pitch-alignment": "map",
            }}
          />
        </Source>
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
