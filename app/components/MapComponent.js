"use client";

import React, { useState, useCallback, useEffect } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  AttributionControl,
  Marker,
  Popup,
} from "react-map-gl/maplibre";
import { FaMapPin, FaCopy } from "react-icons/fa";
import SelectedMarker from "./map/SelectedMarker";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "../context/ThemeContext";
import MapSearchBar from "./ui/MapSearchBar";
import { FcOk } from "react-icons/fc";

const MapComponent = ({
  imageData,
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
  const [showPoints, setShowPoints] = useState(true); // State to control points layer visibility

  // State for search pin location
  const [searchPinLocation, setSearchPinLocation] = useState(null);
  const [showSearchPopup, setShowSearchPopup] = useState(false);

  // State to track the selected feature from vector tiles
  const [selectedFeature, setSelectedFeature] = useState(null);

  // State for coordinate type toggle (snapped vs original)
  const [useSnappedCoordinates, setUseSnappedCoordinates] = useState(true);

  // State for right-click coordinates popup
  const [rightClickCoords, setRightClickCoords] = useState(null);
  const [showCoordsPopup, setShowCoordsPopup] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Vector tile source loaded state
  const [vectorTilesLoaded, setVectorTilesLoaded] = useState(false);

  // State to store track groups
  const [trackGroups, setTrackGroups] = useState({});

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

  // Get all layer IDs for interactive layers - including the mbtiles layer
  const interactiveLayerIds = [
    "Images", // Add the vector tile layer as interactive
    ...Object.keys(trackGroups).flatMap((trackName) => [
      `${trackName}-points`,
      `${trackName}-clusters`,
      `${trackName}-cluster-count`,
      `${trackName}-path-line`,
    ]),
  ];

  // Function to toggle between coordinate types
  const toggleCoordinateType = () => {
    setUseSnappedCoordinates((prev) => !prev);
  };

  // Function to toggle points layer visibility
  const togglePointsVisibility = () => {
    setShowPoints((prev) => !prev);
  };

  // Handle refresh click
  const handleRefresh = () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    if (refreshData) {
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
      setIsRefreshing(false);
    }
  };

  // Dynamically set map style based on theme
  const mapStyle =
    customMapStyle ||
    (darkMode
      ? "https://map.barikoi.com/styles/barikoi-dark-mode/style.json?key=NDE2NzpVNzkyTE5UMUoy"
      : "https://map.barikoi.com/styles/osm_barikoi_v2/style.json?key=NDE2NzpVNzkyTE5UMUoy");

  // Initialize view state from initialViewState (if provided) or from the first feature in the data
  const [viewState, setViewState] = useState(
    initialViewState || {
      longitude:
        imageData?.features?.[0]?.geometry.coordinates[0] || 90.3938010872331,
      latitude:
        imageData?.features?.[0]?.geometry.coordinates[1] || 23.821600011863,
      zoom: 14,
      pitch: 0,
      bearing: 0,
    }
  );

  // Update the view state when the image data changes
  useEffect(() => {
    if (imageData?.features && imageData.features.length > 0) {
      setViewState((prev) => ({
        ...prev,
        longitude:
          imageData.features[0]?.geometry.coordinates[0] || prev.longitude,
        latitude:
          imageData.features[0]?.geometry.coordinates[1] || prev.latitude,
      }));
    }
  }, [imageData]);

  // Update selectedFeature when selectedImageId changes (for marker visibility)
  useEffect(() => {
    // If no selectedImageId, clear the selectedFeature
    if (!selectedImageId) {
      setSelectedFeature(null);
      return;
    }

    // If we have a selected image ID but no existing selectedFeature, or the ID has changed
    if (!selectedFeature || selectedFeature.properties.id !== selectedImageId) {
      // First check if it's in the imageData.features array (old approach)
      const foundInFeatures = imageData?.features?.find(
        (feature) =>
          feature.properties.id === selectedImageId ||
          feature.properties.id === selectedImageId
      );

      if (foundInFeatures) {
        setSelectedFeature(foundInFeatures);
      }
    }
  }, [selectedImageId, imageData, selectedFeature]);

  const onMapClick = useCallback(
    (event) => {
      // Get the map instance from the event
      const map = event.target;

      try {
        // Use queryRenderedFeatures to get all features at the click point
        const features = map.queryRenderedFeatures(event.point);

        if (features.length > 0) {
          const feature = features[0];
          const featureId = feature.layer.id;

          // Check if user clicked on vector tile layer point (from thirdEye source)
          if (featureId === "Images") {
            if (feature.properties && feature.properties.id) {
              // Update viewport to center on clicked point
              const [lng, lat] = feature.geometry.coordinates;
              setViewState((prev) => ({
                ...prev,
                longitude: lng,
                latitude: lat,
                // Keep current zoom level
                transitionDuration: 500, // smooth animation in ms
              }));

              // Save the selected feature for marker display
              setSelectedFeature({
                properties: feature.properties,
                geometry: feature.geometry,
              });

              // Pass the entire feature properties instead of just the ID
              onImageSelect(feature.properties);
            }
            return;
          }
        }
      } catch (error) {
        console.error("Error handling map click:", error);
      }
    },
    [onImageSelect, trackGroups]
  );

  // Handle copying coordinates to clipboard
  const handleCopyCoords = useCallback(() => {
    if (rightClickCoords) {
      const coordsText = `${rightClickCoords.lat.toFixed(
        6
      )}, ${rightClickCoords.lng.toFixed(6)}`;
      navigator.clipboard
        .writeText(coordsText)
        .then(() => {
          setCopySuccess(true);
          // Reset the "Copied!" message after 2 seconds
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy coordinates: ", err);
        });
    }
  }, [rightClickCoords]);

  const onMapRightClick = useCallback((event) => {
    // Prevent default context menu
    event.preventDefault();

    // Get the coordinates where the user right-clicked
    const { lngLat } = event;

    // Update state to show the coordinates popup
    setRightClickCoords(lngLat);
    setShowCoordsPopup(true);
    // Reset copy success state
    setCopySuccess(false);
  }, []);

  // Handle location selection from search bar
  const handleLocationSelect = (location) => {
    if (location && location.longitude && location.latitude) {
      // Fly to the selected location with animation
      setViewState((prev) => ({
        ...prev,
        longitude: parseFloat(location.longitude),
        latitude: parseFloat(location.latitude),
        zoom: 16, // Zoom in to a good level to see details
        transitionDuration: 1000, // 1 second animation
        transitionEasing: (t) => t * (2 - t), // Ease out effect
      }));

      // Set search pin location and show popup
      setSearchPinLocation(location);
      setShowSearchPopup(true);
    }
  };

  return (
    <div className='relative rounded-xl overflow-hidden shadow-lg'>
      {/* Add Search Bar - only on full map, not in compact mode */}
      {!isCompact && (
        <div className='absolute left-1/2 transform -translate-x-1/2 top-4 z-10 w-full max-w-xl px-4'>
          <MapSearchBar onLocationSelect={handleLocationSelect} className='' />
        </div>
      )}

      <Map
        {...viewState}
        style={{ width: "100%", height: isCompact ? "300px" : "75vh" }}
        mapStyle={mapStyle}
        onMove={(evt) => setViewState(evt.viewState)}
        interactiveLayerIds={interactiveLayerIds}
        onClick={onMapClick}
        onContextMenu={onMapRightClick}
        dragRotate={!isCompact}
        pitchWithRotate={!isCompact}
        attributionControl={false}
        onLoad={(map) => {
          // Check if the thirdEye source already exists to avoid duplicates
          if (!map.target.getSource("thirdEye")) {
            // Add the ThirdEye vector tile source
            map.target.addSource("thirdEye", {
              url: "https://tiles.barikoimaps.dev/data/third_eye.json",
              type: "vector",
            });

            // Set the vector tiles as loaded
            setVectorTilesLoaded(true);
          }
        }}
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
        {/* Add the vector tile layer from the ThirdEye source */}
        {vectorTilesLoaded && showPoints && (
          <Layer
            id='Images'
            type='circle'
            source='thirdEye'
            source-layer='images'
            paint={{
              "circle-color": "hsl(128, 74%, 50%)",
              "circle-stroke-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                0,
                12,
                0,
                22,
                0.1,
              ],
              "circle-stroke-color": "hsl(0, 0%, 0%)",
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                0,
                8,
                3,
                14,
                3,
                18,
                9,
                20,
                15,
              ],
            }}
            filter={["==", ["geometry-type"], "Point"]}
          />
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

        {/* Selected Image Marker - Now support both sources: imageData.features and selectedFeature from MBTiles click */}
        {selectedImageId && (
          <>
            {/* Try to find the feature in imageData.features (old approach) */}
            {imageData.features
              .filter(
                (feature) =>
                  feature.properties.id === selectedImageId ||
                  feature.properties.id === selectedImageId
              )
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
                    key={feature.properties.id || feature.properties.id}
                    feature={markerFeature}
                    images={imageData.features}
                  />
                );
              })}

            {/* If we have a selectedFeature from MBTiles, render it */}
            {selectedFeature &&
              selectedImageId ===
                (selectedFeature.properties.id ||
                  selectedFeature.properties.id) &&
              !imageData.features.find(
                (f) =>
                  f.properties.id === selectedImageId ||
                  f.properties.id === selectedImageId
              ) && (
                <SelectedMarker
                  key={`selected-${selectedFeature.properties.id}`}
                  feature={selectedFeature}
                  images={[]}
                />
              )}
          </>
        )}

        {/* Track-specific points layers - also respect showPoints state */}
        {showPoints &&
          Object.keys(trackGroups).map((trackName) => (
            <React.Fragment key={`${trackName}-points`}>
              {/* Points layer for track */}
              <Source
                id={`${trackName}-points-source`}
                type='geojson'
                data={getPointsFeatureCollection(
                  trackGroups[trackName].features
                )}
              >
                <Layer
                  id={`${trackName}-points`}
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
                    "circle-color": "#FF0000", // Red color for all points
                    "circle-opacity": 0.8,
                    "circle-stroke-width": 0.5,
                    "circle-stroke-color": "#fff",
                  }}
                />
              </Source>
            </React.Fragment>
          ))}
        {/* Popup for searched locations */}
        {searchPinLocation && (
          <Marker
            longitude={parseFloat(searchPinLocation.longitude)}
            latitude={parseFloat(searchPinLocation.latitude)}
            anchor='bottom'
            onClick={() => setShowSearchPopup(true)}
          >
            <FaMapPin
              className={`text-3xl ${
                darkMode ? "text-purple-200" : "text-purple-700"
              } drop-shadow-lg`}
            />
          </Marker>
        )}
        {showSearchPopup && searchPinLocation && (
          <Popup
            longitude={parseFloat(searchPinLocation.longitude)}
            latitude={parseFloat(searchPinLocation.latitude)}
            closeButton={true}
            closeOnClick={false}
            onClose={() => setShowSearchPopup(false)}
            anchor='top'
            offsetTop={10}
            className='z-20'
          >
            <div className='p-2'>
              <div className='font-medium text-gray-900 mb-1'>
                {searchPinLocation.address || "Searched Location"}
              </div>
              <div className='flex flex-col text-sm space-y-1'>
                <div className='flex items-center space-x-2'>
                  <span className='font-semibold text-blue-600'>Lat:</span>
                  <span className='font-mono text-black bg-gray-100 px-1 rounded'>
                    {parseFloat(searchPinLocation.latitude).toFixed(6)}
                  </span>
                </div>
                <div className='flex items-center space-x-2'>
                  <span className='font-semibold text-blue-600'>Lng:</span>
                  <span className='font-mono text-black bg-gray-100 px-1 rounded'>
                    {parseFloat(searchPinLocation.longitude).toFixed(6)}
                  </span>
                </div>
                {searchPinLocation.area && (
                  <div className='mt-1 text-gray-600'>
                    {searchPinLocation.area}, {searchPinLocation.city}
                  </div>
                )}
              </div>
            </div>
          </Popup>
        )}
        {/* Popup for right-click coordinates */}
        {showCoordsPopup && rightClickCoords && (
          <Popup
            longitude={rightClickCoords.lng}
            latitude={rightClickCoords.lat}
            closeButton={true}
            closeOnClick={false}
            onClose={() => setShowCoordsPopup(false)}
            anchor='top'
            offsetTop={10}
            className='z-20'
          >
            <div className='p-2'>
              <div className='font-medium text-gray-900 mb-1'>Coordinates</div>
              <div className='flex flex-col text-xs space-y-1'>
                <div className='flex items-center space-x-2'>
                  <span className='font-mono text-black bg-gray-100 px-1 rounded'>
                    {rightClickCoords.lat.toFixed(8)}
                  </span>
                  <span className='font-mono text-black bg-gray-100 px-1 rounded'>
                    {rightClickCoords.lng.toFixed(8)}
                  </span>
                  <button
                    onClick={handleCopyCoords}
                    className='flex items-center px-1 py-1 rounded-lg text-gray-300 text-sm font-medium transition-all'
                    title='Copy coordinates'
                  >
                    {copySuccess ? (
                      <FcOk className='mr-1' />
                    ) : (
                      <FaCopy className='mr-1' />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Refresh button in the top-left corner */}
      {!isCompact && refreshData && (
        <div className='absolute top-28 right-1 z-10'>
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className='glass p-2.5 rounded-xl shadow-md hover:shadow-lg transition-all border border-white/30 flex items-center justify-center'
            title='Refresh data'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='20'
              height='20'
              viewBox='0 0 24 24'
              className={`${
                isRefreshing || isLoading
                  ? "animate-spin text-blue-500"
                  : "text-gray-700"
              }`}
              fill='currentColor'
            >
              <path d='M12 22c5.421 0 10-4.579 10-10h-2c0 4.337-3.663 8-8 8s-8-3.663-8-8c0-4.336 3.663-8 8-8V2C6.579 2 2 6.58 2 12c0 5.421 4.579 10 10 10z'></path>
            </svg>
          </button>
        </div>
      )}

      {/* Toggle button in the top-right corner - with compact version for mini-map */}
      <div className={`absolute top-3 right-${isCompact ? "3" : "16"} z-10`}>
        {isCompact ? (
          /* Compact toggle for mini-map */
          <div className='flex flex-col gap-1'>
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

            <button
              onClick={togglePointsVisibility}
              className='bg-white bg-opacity-70 p-1 rounded shadow-sm flex items-center text-xs border border-gray-200'
              title={showPoints ? "Hide Map Points" : "Show Map Points"}
            >
              <div
                className={`w-6 h-3 rounded-full relative ${
                  showPoints ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute w-2.5 h-2.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                    showPoints ? "translate-x-3" : "translate-x-0.5"
                  } top-[1px]`}
                ></div>
              </div>
              <span className='ml-1 text-[10px] font-medium'>
                {showPoints ? "P" : "P"}
              </span>
            </button>
          </div>
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

      {/* Toggle buttons container */}
      {!isCompact && (
        <div className='absolute top-14 right-16 z-10'>
          <button
            onClick={togglePointsVisibility}
            className='glass px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center space-x-2 transition-all hover:shadow-xl border border-white/30 mb-2'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              stroke-width='1.5'
              stroke='currentColor'
              className={`w-5 h-5 ${
                showPoints ? "text-green-600" : "text-gray-600"
              }`}
            >
              <path
                stroke-linecap='round'
                stroke-linejoin='round'
                d='M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'
              />
              <path
                stroke-linecap='round'
                stroke-linejoin='round'
                d='M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z'
              />
            </svg>
            <span
              className={
                showPoints ? "text-green-600 font-bold" : "text-gray-600"
              }
            >
              {showPoints ? "Points Visible" : "Points Hidden"}
            </span>
            <div
              className={`w-10 h-5 rounded-full p-0.5 ml-1 transition-colors duration-300 ${
                showPoints ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transform duration-300 ease-in-out shadow-md ${
                  showPoints ? "translate-x-5" : "translate-x-0"
                }`}
              ></div>
            </div>
          </button>
        </div>
      )}

      {/* Instructions overlay - only on main map */}
      {!isCompact && (
        <div className='absolute left-4 bottom-16 glass p-3 rounded-lg shadow-lg max-w-xs text-sm opacity-80 hover:opacity-100 transition-opacity duration-300'>
          <p className='font-medium'>
            Click on any green point to view the street image at that location.
          </p>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
