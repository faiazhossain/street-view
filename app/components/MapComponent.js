"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  FaCrosshairs,
  FaDrawPolygon,
} from "react-icons/fa";
import SelectedMarker from "./map/SelectedMarker";
import PoiMarkers from "./map/PoiMarkers"; // Import the PoiMarkers component
import PoiSidebar from "./map/PoiSidebar"; // Import the PoiSidebar component
import DeletePointsModal from "./map/DeletePointsModal"; // Import the new delete modal
import DeleteMarkers from "./map/DeleteMarkers"; // Import the delete markers component
import PolygonDeletePanel from "./map/PolygonDeletePanel"; // Import the polygon delete panel
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import MapSearchBar from "./ui/MapSearchBar";
import toast from "react-hot-toast";
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
  const { isAuthenticated, user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPoints, setShowPoints] = useState(true); // State to control points layer visibility

  // State for edit coordinates mode (only for logged in users)
  const [editMode, setEditMode] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [isUpdatingCoordinates, setIsUpdatingCoordinates] = useState(false);

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
    [],
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingPoints, setIsDeletingPoints] = useState(false);

  // State for polygon delete mode
  const [polygonDeleteMode, setPolygonDeleteMode] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [showPolygonPanel, setShowPolygonPanel] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);

  // Helper function to get coordinates based on toggle state
  const getCoordinates = useCallback(
    (feature) => {
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
    },
    [useSnappedCoordinates],
  );

  // Memoized feature collections for each track to avoid expensive recalculation
  const memoizedFeatureCollections = useMemo(() => {
    const collections = {};

    Object.entries(trackGroups).forEach(([trackName, trackData]) => {
      collections[trackName] = {
        type: "FeatureCollection",
        features: trackData.features.map((feature) => ({
          type: "Feature",
          properties: feature.properties,
          geometry: {
            type: "Point",
            coordinates: getCoordinates(feature),
          },
        })),
      };
    });

    return collections;
  }, [trackGroups, getCoordinates]);

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
      // If turning on delete mode, turn off POI mode and polygon delete mode
      if (!prev) {
        if (poiMode) {
          setPoiMode(false);
          setPois(null);
        }
        if (polygonDeleteMode) {
          setPolygonDeleteMode(false);
          setPolygonPoints([]);
          setShowPolygonPanel(false);
        }
      }
      return !prev;
    });
  };

  // Toggle edit coordinates mode
  const toggleEditMode = () => {
    setEditMode((prev) => {
      // If turning off edit mode, clear editing point
      if (prev) {
        setEditingPoint(null);
      }
      // If turning on edit mode, turn off POI mode and delete mode
      if (!prev) {
        if (poiMode) {
          setPoiMode(false);
          setPois(null);
        }
        if (deleteMode) {
          setDeleteMode(false);
          setSelectedPointsForDeletion([]);
        }
        if (polygonDeleteMode) {
          setPolygonDeleteMode(false);
          setPolygonPoints([]);
          setShowPolygonPanel(false);
        }
      }
      return !prev;
    });
  };

  // Toggle polygon delete mode
  const togglePolygonDeleteMode = () => {
    setPolygonDeleteMode((prev) => {
      if (prev) {
        // Turning off polygon delete mode
        setPolygonPoints([]);
        setShowPolygonPanel(false);
      } else {
        // Turning on polygon delete mode
        setShowPolygonPanel(true);
        // Turn off other modes
        if (poiMode) {
          setPoiMode(false);
          setPois(null);
        }
        if (deleteMode) {
          setDeleteMode(false);
          setSelectedPointsForDeletion([]);
        }
        if (editMode) {
          setEditMode(false);
          setEditingPoint(null);
        }
      }
      return !prev;
    });
  };

  // Handle polygon point addition
  const addPolygonPoint = useCallback((lngLat) => {
    setPolygonPoints((prev) => [...prev, [lngLat.lng, lngLat.lat]]);
  }, []);

  // Clear polygon
  const clearPolygon = useCallback(() => {
    setPolygonPoints([]);
  }, []);

  // Undo last polygon point
  const undoLastPolygonPoint = useCallback(() => {
    setPolygonPoints((prev) => prev.slice(0, -1));
  }, []);

  // Close polygon delete panel
  const closePolygonPanel = useCallback(() => {
    setShowPolygonPanel(false);
    setPolygonDeleteMode(false);
    setPolygonPoints([]);
  }, []);

  // Update coordinates via API
  const updateCoordinates = async (featureId, latitude, longitude) => {
    setIsUpdatingCoordinates(true);
    try {
      const payload = {
        feature_id: String(featureId),
        latitude: latitude,
        longitude: longitude,
        user_id: user?.name || user?.email || String(user?.id) || "unknown",
      };

      console.log("Updating coordinates with payload:", payload);

      const response = await fetch(
        "https://streetview.bmapsbd.com/api/api/update-snapped-coordinates",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(
          errorText || `Update failed with status ${response.status}`,
        );
      }

      const result = await response.json();
      console.log("Coordinates updated:", result);

      // Show success toast
      toast.success(
        `Coordinates updated for Feature ${featureId}\nLat: ${latitude.toFixed(
          6,
        )}, Lng: ${longitude.toFixed(6)}`,
        { duration: 4000 },
      );

      // Refresh data if available
      if (refreshData) {
        refreshData();
      }

      return result;
    } catch (error) {
      console.error("Error updating coordinates:", error);

      // Show error toast
      toast.error(`Failed to update Feature ${featureId}: ${error.message}`, {
        duration: 5000,
      });

      throw error;
    } finally {
      setIsUpdatingCoordinates(false);
    }
  };

  // Add point to deletion selection
  const addPointForDeletion = (feature) => {
    const point = {
      id: feature.properties.id,
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
      // Store additional properties for display
      imageUrl_High: feature.properties.imageUrl_High,
      driveUrl_Comp: feature.properties.imageUrl_Comp,
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
      prev.filter((p) => p.id !== pointId),
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
        },
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
        if (polygonDeleteMode) {
          setPolygonDeleteMode(false);
          setPolygonPoints([]);
          setShowPolygonPanel(false);
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
      ? "https://map.barikoi.com/styles/barikoi-dark-mode/style.json?key=bkoi_ed6171d88adc261e0a937a5649999a16fcbd8808c16f7fa08a9634cb6c41b944"
      : "https://map.barikoi.com/styles/osm_barikoi_v2/style.json?key=bkoi_ed6171d88adc261e0a937a5649999a16fcbd8808c16f7fa08a9634cb6c41b944");

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
    },
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
          feature.properties.id === selectedImageId,
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
        // If in polygon delete mode, add point to polygon
        if (polygonDeleteMode) {
          const { lngLat } = event;
          addPolygonPoint(lngLat);
          return;
        }

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
              // If in edit mode, select point for dragging
              if (editMode) {
                console.log(
                  "Selected feature for editing:",
                  feature.properties,
                );
                setEditingPoint({
                  properties: feature.properties,
                  geometry: feature.geometry,
                });
                return;
              }

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
    [
      onImageSelect,
      trackGroups,
      poiMode,
      poiSearchRadius,
      deleteMode,
      editMode,
      polygonDeleteMode,
      addPolygonPoint,
    ],
  );

  // Handle copying coordinates to clipboard
  const handleCopyCoords = useCallback(() => {
    if (rightClickCoords) {
      const coordsText = `${rightClickCoords.lat.toFixed(
        6,
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
          // Store the map instance
          setMapInstance(map.target);

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

        {/* Polygon Delete Visualization */}
        {polygonDeleteMode && polygonPoints && polygonPoints.length > 0 && (
          <>
            {/* Polygon fill */}
            <Source
              id='polygon-delete-fill'
              type='geojson'
              data={{
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    polygonPoints.length >= 3
                      ? [...polygonPoints, polygonPoints[0]]
                      : polygonPoints,
                  ],
                },
              }}
            >
              <Layer
                id='polygon-fill-layer'
                type='fill'
                paint={{
                  "fill-color": "#ef4444",
                  "fill-opacity": 0.15,
                }}
              />
            </Source>

            {/* Polygon outline */}
            <Source
              id='polygon-delete-outline'
              type='geojson'
              data={{
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates:
                    polygonPoints.length >= 3
                      ? [...polygonPoints, polygonPoints[0]]
                      : polygonPoints,
                },
              }}
            >
              <Layer
                id='polygon-outline-layer'
                type='line'
                paint={{
                  "line-color": "#ef4444",
                  "line-width": 2,
                  "line-dasharray": [2, 2],
                }}
              />
            </Source>

            {/* Polygon vertices */}
            <Source
              id='polygon-vertices'
              type='geojson'
              data={{
                type: "FeatureCollection",
                features: polygonPoints.map((coord, idx) => ({
                  type: "Feature",
                  properties: { index: idx + 1 },
                  geometry: {
                    type: "Point",
                    coordinates: coord,
                  },
                })),
              }}
            >
              <Layer
                id='polygon-vertices-layer'
                type='circle'
                paint={{
                  "circle-radius": 6,
                  "circle-color": "#ef4444",
                  "circle-stroke-width": 2,
                  "circle-stroke-color": "#ffffff",
                }}
              />
              {polygonPoints.length >= 1 && (
                <Layer
                  id='polygon-vertices-labels'
                  type='symbol'
                  layout={{
                    "text-field": ["get", "index"],
                    "text-offset": [0, 0],
                    "text-anchor": "center",
                    "text-size": 10,
                  }}
                  paint={{
                    "text-color": "#ffffff",
                  }}
                />
              )}
            </Source>
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

        {/* Selected Image Marker - Now support both sources: imageData.features and selectedFeature from MBTiles click */}
        {selectedImageId && !poiMode && (
          <>
            {/* Try to find the feature in imageData.features */}
            {imageData.features
              .filter(
                (feature) =>
                  feature.properties.id === selectedImageId ||
                  feature.properties.id === selectedImageId,
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
                  f.properties.id === selectedImageId,
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
                data={memoizedFeatureCollections[trackName]}
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

        {/* Draggable marker for editing coordinates */}
        {editMode && editingPoint && (
          <Marker
            longitude={editingPoint.geometry.coordinates[0]}
            latitude={editingPoint.geometry.coordinates[1]}
            anchor='bottom'
            draggable={true}
            onDragEnd={(event) => {
              const { lngLat } = event;
              const newCoordinates = [lngLat.lng, lngLat.lat];

              // Update the editing point with new coordinates
              setEditingPoint((prev) => ({
                ...prev,
                geometry: {
                  ...prev.geometry,
                  coordinates: newCoordinates,
                },
              }));

              // Call API to update coordinates
              updateCoordinates(
                editingPoint.properties.id,
                lngLat.lat,
                lngLat.lng,
              );
            }}
          >
            <div className='relative'>
              <FaCrosshairs className='text-3xl text-orange-500 drop-shadow-lg animate-pulse' />
              {/* <div className='absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap'>
                Drag to move
              </div> */}
            </div>
          </Marker>
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

      {/* Edit coordinates mode controls */}
      {!isCompact && editMode && (
        <div className='absolute top-20 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm'>
          <div className='flex items-center space-x-2 mb-3'>
            <FaCrosshairs className='text-orange-500' />
            <h3 className='font-semibold text-gray-800 dark:text-gray-200'>
              Edit Coordinates Mode
            </h3>
          </div>
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
            Click on a green point to select it, then drag the marker to update
            its coordinates.
          </p>
          {editingPoint && (
            <div className='mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800'>
              <p className='text-xs font-medium text-orange-800 dark:text-orange-200'>
                Selected Point: {editingPoint.properties.id}
              </p>
              <p className='text-xs text-orange-600 dark:text-orange-300'>
                Lat: {editingPoint.geometry.coordinates[1].toFixed(6)}, Lng:{" "}
                {editingPoint.geometry.coordinates[0].toFixed(6)}
              </p>
            </div>
          )}
          {isUpdatingCoordinates && (
            <div className='flex items-center space-x-2 text-sm text-blue-600'>
              <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500'></div>
              <span>Updating coordinates...</span>
            </div>
          )}
          {editingPoint && (
            <button
              onClick={() => setEditingPoint(null)}
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm'
            >
              Deselect Point
            </button>
          )}
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

      {/* Polygon Delete Panel */}
      {!isCompact && (
        <PolygonDeletePanel
          isOpen={showPolygonPanel}
          onClose={closePolygonPanel}
          polygonPoints={polygonPoints}
          onClearPolygon={clearPolygon}
          onUndoLastPoint={undoLastPolygonPoint}
          map={mapInstance}
        />
      )}

      {/* Refresh button in the top-left corner */}

      {/* Toggle buttons container */}
      {!isCompact && (
        <div className='absolute bottom-4 right-1 z-10 flex flex-col space-y-2'>
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

          {/* Polygon Delete Mode Toggle */}
          <button
            onClick={togglePolygonDeleteMode}
            className={`relative px-3 py-2 rounded-full shadow-sm flex items-center space-x-2 transition-all duration-300
        bg-white/80 backdrop-blur-md border border-gray-200
        hover:shadow-md hover:scale-105 ${
          polygonDeleteMode ? "ring-2 ring-rose-500" : ""
        }`}
          >
            {/* Icon */}
            <FaDrawPolygon
              className={`w-4 h-4 transition-colors duration-300 ${
                polygonDeleteMode ? "text-rose-600" : "text-gray-500"
              }`}
            />

            {/* Label */}
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                polygonDeleteMode ? "text-rose-600" : "text-gray-700"
              }`}
            >
              {polygonDeleteMode ? "Polygon Del" : "Polygon Del"}
            </span>

            {/* Toggle Switch */}
            <div
              className={`w-8 h-4 rounded-full p-0.5 ml-1 flex items-center transition-colors duration-300
          ${polygonDeleteMode ? "bg-rose-500" : "bg-gray-300"}`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform duration-300 ease-in-out
            ${polygonDeleteMode ? "translate-x-4" : "translate-x-0"}`}
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

          {/* Edit Coordinates Toggle - Only visible when logged in */}
          {isAuthenticated && (
            <button
              onClick={toggleEditMode}
              className={`relative px-3 py-2 rounded-full shadow-sm flex items-center space-x-2 transition-all duration-300
        bg-white/80 backdrop-blur-md border border-gray-200
        hover:shadow-md hover:scale-105 ${
          editMode ? "ring-2 ring-orange-500" : ""
        }`}
            >
              {/* Icon */}
              <FaCrosshairs
                className={`w-4 h-4 transition-colors duration-300 ${
                  editMode ? "text-orange-600" : "text-gray-500"
                }`}
              />

              {/* Label */}
              <span
                className={`text-xs font-medium transition-colors duration-300 ${
                  editMode ? "text-orange-600" : "text-gray-700"
                }`}
              >
                {editMode ? "Edit Coords" : "Edit Coords"}
              </span>

              {/* Toggle Switch */}
              <div
                className={`w-8 h-4 rounded-full p-0.5 ml-1 flex items-center transition-colors duration-300
          ${editMode ? "bg-orange-500" : "bg-gray-300"}`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform duration-300 ease-in-out
            ${editMode ? "translate-x-4" : "translate-x-0"}`}
                ></div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Instructions overlay - only on main map */}
      {!isCompact && (
        <div className='absolute left-4 bottom-16 glass p-3 rounded-lg shadow-lg max-w-xs text-sm opacity-80 hover:opacity-100 transition-opacity duration-300'>
          <p className='font-medium'>
            {polygonDeleteMode
              ? "Polygon Delete Mode: Click on the map to draw a polygon area. At least 3 points needed."
              : editMode
                ? "Edit Mode: Click on a green point to select it, then drag the marker to update its coordinates."
                : deleteMode
                  ? "Delete Mode: Click on green points to select them for deletion. Use PIN 2017 to confirm."
                  : poiMode
                    ? "POI Mode: Click anywhere on the map to find nearby points of interest."
                    : "Click on any green point to view the street image at that location."}
          </p>
          {polygonDeleteMode && polygonPoints.length > 0 && (
            <p className='text-xs mt-1 text-rose-600'>
              {polygonPoints.length} point{polygonPoints.length > 1 ? "s" : ""}{" "}
              drawn.
              {polygonPoints.length >= 3
                ? " Ready to preview."
                : ` Need ${3 - polygonPoints.length} more.`}
            </p>
          )}
          {editMode && editingPoint && (
            <p className='text-xs mt-1 text-orange-600'>
              Point {editingPoint.properties.id} selected. Drag to move.
            </p>
          )}
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

export default React.memo(MapComponent, (prevProps, nextProps) => {
  return (
    prevProps.selectedImageId === nextProps.selectedImageId &&
    prevProps.selectedImage === nextProps.selectedImage &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isCompact === nextProps.isCompact
  );
});
