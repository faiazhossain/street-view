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
import {
  FaMapPin,
  FaCopy,
  FaStreetView,
  FaMapMarkedAlt,
  FaTrashAlt,
} from "react-icons/fa";
import SelectedMarker from "./map/SelectedMarker";
import PoiMarkers from "./map/PoiMarkers"; // Import the PoiMarkers component
import PoiSidebar from "./map/PoiSidebar"; // Import the PoiSidebar component
import DeletePointsModal from "./map/DeletePointsModal"; // Import the new delete modal
import DeleteMarkers from "./map/DeleteMarkers"; // Import the delete markers component
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "../context/ThemeContext";
import MapSearchBar from "./ui/MapSearchBar";
import { FcOk } from "react-icons/fc";
import { fetchPointsOfInterest } from "../utils/poiService"; // Import the POI service
import { TiMediaPlayOutline } from "react-icons/ti";

const MapComponent = ({
  imageData,
  selectedImageId,
  onImageSelect,
  isCompact = false,
  customMapStyle = null,
  refreshData,
  isLoading,
  initialViewState = null, // Add initialViewState prop with default value of null
  selectedImage,
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

  // State for POI mode
  const [poiMode, setPoiMode] = useState(false);
  const [pois, setPois] = useState(null);
  const [isLoadingPois, setIsLoadingPois] = useState(false);
  const [poiSearchRadius, setPoiSearchRadius] = useState(5); // Default radius in meters

  // State for POI hover and sidebar
  const [hoveredPoiId, setHoveredPoiId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // State for delete mode
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedPointsForDeletion, setSelectedPointsForDeletion] = useState(
    []
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingPoints, setIsDeletingPoints] = useState(false);

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
    "ThirdEye360", // Add the vector tile layer as interactive
    ...Object.keys(trackGroups).flatMap((trackName) => [
      `${trackName}-points`,
      `${trackName}-clusters`,
      `${trackName}-cluster-count`,
      `${trackName}-path-line`,
    ]),
  ];

  // Toggle delete mode
  const toggleDeleteMode = () => {
    setDeleteMode((prev) => {
      // If turning off delete mode, clear selected points
      if (prev) {
        setSelectedPointsForDeletion([]);
      }
      // If turning on delete mode, turn off POI mode
      if (!prev && poiMode) {
        setPoiMode(false);
        setPois(null);
      }
      return !prev;
    });
  };

  // Add point to deletion selection
  const addPointForDeletion = (feature) => {
    const point = {
      id: feature.properties.id,
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
      // Store additional properties for display
      imageUrl_High: feature.properties.imageUrl_High,
      imageUrl_Comp: feature.properties.imageUrl_Comp,
      capture_date: feature.properties.capture_date,
    };

    setSelectedPointsForDeletion((prev) => {
      // Check if point is already selected
      const exists = prev.find((p) => p.id === point.id);
      if (!exists) {
        return [...prev, point];
      }
      return prev;
    });
  };

  // Remove point from deletion selection
  const removePointFromDeletion = (pointId) => {
    setSelectedPointsForDeletion((prev) =>
      prev.filter((p) => p.id !== pointId)
    );
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async (pointIds) => {
    setIsDeletingPoints(true);
    try {
      const response = await fetch(
        "https://streetview.bmapsbd.com/api/api/features/delete-batch",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feature_ids: pointIds,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Delete request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Delete result:", result);

      // Clear selected points and turn off delete mode
      setSelectedPointsForDeletion([]);
      setDeleteMode(false);

      // Refresh data if available
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error("Error deleting points:", error);
      alert(`Failed to delete points: ${error.message}`);
    } finally {
      setIsDeletingPoints(false);
    }
  };

  // Toggle POI mode
  const togglePoiMode = () => {
    setPoiMode((prev) => {
      // If turning on POI mode, automatically expand the sidebar and turn off delete mode
      if (!prev) {
        setSidebarCollapsed(false);
        if (deleteMode) {
          setDeleteMode(false);
          setSelectedPointsForDeletion([]);
        }
      }
      return !prev;
    });

    // Clear POIs when turning off POI mode
    if (poiMode) {
      setPois(null);
    }
  };

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

  // Add a useEffect to update selectedFeature when selectedImage prop changes
  useEffect(() => {
    if (
      selectedImage &&
      selectedImage.properties &&
      selectedImage.properties.id
    ) {
      // Update the selectedFeature with the latest selectedImage data
      // Create a new object to ensure React detects the change
      setSelectedFeature({
        ...selectedImage,
        properties: { ...selectedImage.properties },
        geometry: { ...selectedImage.geometry },
      });
    }
  }, [selectedImage]);

  // Handle hovering POI in the sidebar
  const handlePoiHover = (poiId) => {
    setHoveredPoiId(poiId);
  };

  // Handle fetching POIs when in POI mode and user clicks on the map
  const fetchPois = async (lat, lon) => {
    setIsLoadingPois(true);
    try {
      const data = await fetchPointsOfInterest(lat, lon, poiSearchRadius);
      setPois(data.pois);

      // Auto-expand sidebar when POIs are found
      if (data.pois && data.pois.length > 0) {
        setSidebarCollapsed(false);
      }
    } catch (error) {
      console.error("Error fetching POIs:", error);
    } finally {
      setIsLoadingPois(false);
    }
  };

  const onMapClick = useCallback(
    (event) => {
      // Get the map instance from the event
      const map = event.target;

      try {
        // If in POI mode, fetch POIs near the clicked point
        if (poiMode) {
          const { lngLat } = event;
          fetchPois(lngLat.lat, lngLat.lng);
          return;
        }

        // Use queryRenderedFeatures to get all features at the click point
        const features = map.queryRenderedFeatures(event.point);

        if (features.length > 0) {
          const feature = features[0];
          const featureId = feature.layer.id;

          // Check if user clicked on vector tile layer point (from thirdEye source)
          if (featureId === "ThirdEye360") {
            if (feature.properties && feature.properties.id) {
              // If in delete mode, add point to selection
              if (deleteMode) {
                addPointForDeletion(feature);
                return;
              }

              // Normal mode - update viewport to center on clicked point
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
    [onImageSelect, trackGroups, poiMode, poiSearchRadius, deleteMode]
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

      {/* POI Sidebar - only when not in compact mode */}
      {!isCompact && poiMode && (
        <PoiSidebar
          pois={pois}
          onHover={handlePoiHover}
          activePoiId={hoveredPoiId}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      )}

      {/* Collapsed sidebar indicator */}
      {!isCompact && poiMode && sidebarCollapsed && pois && pois.length > 0 && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className='fixed left-0 top-1/2 transform -translate-y-1/2 z-20 bg-purple-600 text-white py-4 px-2 rounded-r-md shadow-md hover:bg-purple-700 transition-colors'
        >
          <TiMediaPlayOutline></TiMediaPlayOutline>
        </button>
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
              url: "https://tiles.bmapsbd.com/ThirdEye360",
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
            id='ThirdEye360'
            type='circle'
            source='thirdEye'
            source-layer='ThirdEye360'
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
        {selectedImageId && !poiMode && (
          <>
            {/* Try to find the feature in imageData.features */}
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
                    key={feature.properties.id}
                    feature={markerFeature}
                    isCompact={isCompact}
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
                  isCompact={isCompact}
                />
              )}
          </>
        )}

        {/* Show POI markers when in POI mode and we have POI data */}
        {poiMode && pois && (
          <PoiMarkers pois={pois} hoveredPoiId={hoveredPoiId} />
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

        {/* Show delete markers when in delete mode */}
        {deleteMode && selectedPointsForDeletion.length > 0 && (
          <DeleteMarkers
            selectedPoints={selectedPointsForDeletion}
            onRemovePoint={removePointFromDeletion}
          />
        )}

        {/* POI Loading Indicator */}
        {isLoadingPois && (
          <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-20'>
            <div className='bg-white p-3 rounded-lg shadow-lg flex items-center space-x-3'>
              <div className='animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500'></div>
              <span>Loading nearby POIs...</span>
            </div>
          </div>
        )}
      </Map>

      {/* Delete mode controls */}
      {!isCompact && deleteMode && (
        <div className='absolute top-20 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm'>
          <div className='flex items-center space-x-2 mb-3'>
            <FaTrashAlt className='text-red-500' />
            <h3 className='font-semibold text-gray-800 dark:text-gray-200'>
              Delete Mode Active
            </h3>
          </div>
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
            Click on green points to select them for deletion. Selected:{" "}
            {selectedPointsForDeletion.length}
          </p>
          <div className='flex space-x-2'>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={selectedPointsForDeletion.length === 0}
              className='px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center text-sm'
            >
              <FaTrashAlt className='mr-1' />
              Delete ({selectedPointsForDeletion.length})
            </button>
            <button
              onClick={() => setSelectedPointsForDeletion([])}
              disabled={selectedPointsForDeletion.length === 0}
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm'
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Delete Points Modal */}
      <DeletePointsModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        selectedPoints={selectedPointsForDeletion}
        onDeleteConfirm={handleDeleteConfirm}
        isDeleting={isDeletingPoints}
      />

      {/* Refresh button in the top-left corner */}

      {/* Toggle button in the top-right corner - with compact version for mini-map */}
      <div className={`absolute bottom-[16%] right-1 z-10`}>
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
            className={`relative px-3 py-2 rounded-full shadow-sm flex items-center space-x-2 transition-all duration-300 
            bg-white/80 backdrop-blur-md border border-gray-200 
            hover:shadow-md hover:scale-105`}
          >
            {/* Icon */}
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 20 20'
              fill='currentColor'
              className={`w-4 h-4 transition-colors duration-300 ${
                useSnappedCoordinates ? "text-blue-600" : "text-gray-500"
              }`}
            >
              <path
                fillRule='evenodd'
                d='M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z'
                clipRule='evenodd'
              />
            </svg>

            {/* Label */}
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                useSnappedCoordinates ? "text-blue-600" : "text-gray-700"
              }`}
            >
              {useSnappedCoordinates ? "Snapped" : "Original"}
            </span>

            {/* Toggle Switch */}
            <div
              className={`w-8 h-4 rounded-full p-0.5 ml-1 flex items-center transition-colors duration-300 
              ${useSnappedCoordinates ? "bg-blue-500" : "bg-gray-300"}`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform duration-300 ease-in-out 
                ${useSnappedCoordinates ? "translate-x-4" : "translate-x-0"}`}
              ></div>
            </div>
          </button>
        )}
      </div>

      {/* Toggle buttons container */}
      {!isCompact && (
        <div className='absolute bottom-[22%] right-1 z-10 flex flex-col space-y-2'>
          {/* Points Visibility Toggle */}
          <button
            onClick={togglePointsVisibility}
            className={`relative px-3 py-2 rounded-full shadow-sm flex items-center space-x-2 transition-all duration-300
        bg-white/80 backdrop-blur-md border border-gray-200
        hover:shadow-md hover:scale-105`}
          >
            {/* Icon */}
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth='1.5'
              stroke='currentColor'
              className={`w-4 h-4 transition-colors duration-300 ${
                showPoints ? "text-green-600" : "text-gray-500"
              }`}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z'
              />
            </svg>

            {/* Label */}
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                showPoints ? "text-green-600" : "text-gray-700"
              }`}
            >
              {showPoints ? "Visible" : "Hidden"}
            </span>

            {/* Toggle Switch */}
            <div
              className={`w-8 h-4 rounded-full p-0.5 ml-1 flex items-center transition-colors duration-300
          ${showPoints ? "bg-green-500" : "bg-gray-300"}`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform duration-300 ease-in-out
            ${showPoints ? "translate-x-4" : "translate-x-0"}`}
              ></div>
            </div>
          </button>
        </div>
      )}
      {!isCompact && (
        <div className='absolute bottom-[4%] right-1 z-10 flex flex-col space-y-2'>
          {/* Delete Mode Toggle */}
          <button
            onClick={toggleDeleteMode}
            className={`relative px-3 py-2 rounded-full shadow-sm flex items-center space-x-2 transition-all duration-300
        bg-white/80 backdrop-blur-md border border-gray-200
        hover:shadow-md hover:scale-105 ${
          deleteMode ? "ring-2 ring-red-500" : ""
        }`}
          >
            {/* Icon */}
            <FaTrashAlt
              className={`w-4 h-4 transition-colors duration-300 ${
                deleteMode ? "text-red-600" : "text-gray-500"
              }`}
            />

            {/* Label */}
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                deleteMode ? "text-red-600" : "text-gray-700"
              }`}
            >
              {deleteMode ? "Delete Mode" : "Delete Mode"}
            </span>

            {/* Toggle Switch */}
            <div
              className={`w-8 h-4 rounded-full p-0.5 ml-1 flex items-center transition-colors duration-300
          ${deleteMode ? "bg-red-500" : "bg-gray-300"}`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform duration-300 ease-in-out
            ${deleteMode ? "translate-x-4" : "translate-x-0"}`}
              ></div>
            </div>
          </button>

          {/* POI Mode Toggle */}
          <button
            onClick={togglePoiMode}
            className={`relative px-3 py-2 rounded-full shadow-sm flex items-center space-x-2 transition-all duration-300
        bg-white/80 backdrop-blur-md border border-gray-200
        hover:shadow-md hover:scale-105`}
          >
            {/* Icon */}
            {poiMode ? (
              <FaStreetView className='text-purple-600 w-4 h-4' />
            ) : (
              <FaMapMarkedAlt className='text-gray-500 w-4 h-4' />
            )}

            {/* Label */}
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                poiMode ? "text-purple-600" : "text-gray-700"
              }`}
            >
              {poiMode ? "POI Mode" : "POI Mode"}
            </span>

            {/* Toggle Switch */}
            <div
              className={`w-8 h-4 rounded-full p-0.5 ml-1 flex items-center transition-colors duration-300
          ${poiMode ? "bg-purple-500" : "bg-gray-300"}`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform duration-300 ease-in-out
            ${poiMode ? "translate-x-4" : "translate-x-0"}`}
              ></div>
            </div>
          </button>
        </div>
      )}

      {/* Instructions overlay - only on main map */}
      {!isCompact && (
        <div className='absolute left-4 bottom-16 glass p-3 rounded-lg shadow-lg max-w-xs text-sm opacity-80 hover:opacity-100 transition-opacity duration-300'>
          <p className='font-medium'>
            {deleteMode
              ? "Delete Mode: Click on green points to select them for deletion. Use PIN 2017 to confirm."
              : poiMode
              ? "POI Mode: Click anywhere on the map to find nearby points of interest."
              : "Click on any green point to view the street image at that location."}
          </p>
          {deleteMode && selectedPointsForDeletion.length > 0 && (
            <p className='text-xs mt-1 text-red-600'>
              {selectedPointsForDeletion.length} point
              {selectedPointsForDeletion.length > 1 ? "s" : ""} selected for
              deletion.
            </p>
          )}
          {poiMode && pois && (
            <p className='text-xs mt-1 text-purple-600'>
              Found {pois.length} points of interest.{" "}
              {sidebarCollapsed ? "Open sidebar to view list." : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MapComponent;
