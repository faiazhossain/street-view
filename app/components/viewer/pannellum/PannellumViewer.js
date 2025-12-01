"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { useDispatch, useSelector } from "react-redux";
import {
  saveViewPosition,
  selectViewPosition,
} from "@/app/redux/slices/panoramaSlice";
import { selectShowControls } from "@/app/redux/slices/uiControlsSlice";
import { MdHd, MdOutlineHd, MdAddLocation, MdInfo } from "react-icons/md";
import { FaStoreAlt } from "react-icons/fa";
import toast from "react-hot-toast";

// Create a ref that persists across component mounts to track script loading
let scriptLoadedGlobal = false;

// Helper function to proxy Google Drive URLs through our API
const processImageUrl = (url) => {
  if (!url) return "";

  // Check if it's a Google Drive URL
  if (url.includes("drive.usercontent.google.com/download?id=")) {
    // Extract the file ID from the URL
    const match = url.match(/[?&]id=([^&]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      // Return proxied URL through our API
      return `/api/drive-proxy?id=${fileId}`;
    }
  }

  // Return the URL as-is for other cases
  return url;
};

const PannellumViewer = ({
  selectedImage,
  images,
  onPrevImage,
  onNextImage,
}) => {
  const [scriptLoaded, setScriptLoaded] = useState(scriptLoadedGlobal);
  const viewerRef = useRef(null);
  const [pannellumInstance, setPannellumInstance] = useState(null);
  const viewerId = useRef(`panorama-viewer-${Date.now()}`);
  const [isHDMode, setIsHDMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPoi, setIsGeneratingPoi] = useState(false);
  const [isPoiDrawerOpen, setIsPoiDrawerOpen] = useState(false);
  const [poiData, setPoiData] = useState([]);
  const [isFetchingPoi, setIsFetchingPoi] = useState(false);
  console.log("selectedImage", selectedImage);
  // Redux
  const dispatch = useDispatch();
  const savedViewPosition = useSelector((state) =>
    selectViewPosition(state, selectedImage?.properties?.id)
  );
  const showControls = useSelector(selectShowControls);

  // Handle script loading
  const handleScriptLoad = () => {
    scriptLoadedGlobal = true;
    setScriptLoaded(true);
  };

  // Function to toggle HD mode
  const toggleHDMode = () => {
    if (pannellumInstance && selectedImage) {
      saveCurrentViewPosition();
      setIsHDMode((prev) => !prev);
      cleanupPannellum();
    }
  };

  // Function to generate POI using the feature_id from selected image
  const generatePoi = async () => {
    if (
      !selectedImage ||
      !selectedImage.properties.latitude_snapped ||
      !selectedImage.properties.longitude_snapped
    ) {
      toast.error("No image selected or missing required coordinates");
      return;
    }

    // Determine the image URL (prioritize HD, fallback to comp, then default)
    let imageUrl;
    if (
      selectedImage.properties.driveUrl_High &&
      selectedImage.properties.driveUrl_Comp
    ) {
      imageUrl = isHDMode
        ? selectedImage.properties.driveUrl_High
        : selectedImage.properties.driveUrl_Comp;
    } else {
      imageUrl = isHDMode
        ? selectedImage.properties.driveUrl_High ||
          selectedImage.properties.imageUrl
        : selectedImage.properties.driveUrl_Comp ||
          selectedImage.properties.imageUrl;
    }

    if (!imageUrl) {
      toast.error("Image URL is not available");
      return;
    }

    setIsGeneratingPoi(true);

    try {
      const requestBody = {
        image_url: imageUrl,
        latitude: selectedImage.properties.latitude_snapped,
        longitude: selectedImage.properties.longitude_snapped,
      };

      // Add feature_id if available
      if (selectedImage.properties.id) {
        requestBody.feature_id = selectedImage.properties.id;
      }

      const response = await fetch(
        "https://streetview.bmapsbd.com/api/api/generate-poi",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("POI generated successfully!");
        if (data.message) {
          toast.success(data.message);
        }
      } else {
        toast.error(`Error: ${data.message || "Failed to generate POI"}`);
      }
    } catch (error) {
      console.error("Error generating POI:", error);
      toast.error(
        `Failed to generate POI: ${error.message || "Network error"}`
      );
    } finally {
      setIsGeneratingPoi(false);
    }
  };

  // Function to fetch POI data based on lat and lon
  const fetchPoiData = async () => {
    if (
      !selectedImage ||
      !selectedImage.properties.latitude_snapped ||
      !selectedImage.properties.longitude_snapped
    ) {
      toast.error("No image selected or missing coordinates");
      setPoiData([]);
      return;
    }

    setIsFetchingPoi(true);
    try {
      const response = await fetch(
        `https://streetview.bmapsbd.com/api/api/point-of-interest?lat=${selectedImage.properties.latitude_snapped}&lon=${selectedImage.properties.longitude_snapped}&rad=5`
      );
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setPoiData(data.pois || []);
      } else {
        setPoiData([]);
        toast.error(data.message || "Failed to fetch POI data");
      }
    } catch (error) {
      console.error("Error fetching POI data:", error);
      setPoiData([]);
      toast.error("Failed to fetch POI data: Network error");
    } finally {
      setIsFetchingPoi(false);
    }
  };

  // Function to toggle POI drawer
  const togglePoiDrawer = () => {
    setIsPoiDrawerOpen((prev) => !prev);
    if (!isPoiDrawerOpen && poiData.length === 0) {
      fetchPoiData();
    }
  };

  // Function to save the current view position to Redux
  const saveCurrentViewPosition = () => {
    if (pannellumInstance && selectedImage) {
      try {
        const position = {
          yaw: pannellumInstance.getYaw(),
          pitch: pannellumInstance.getPitch(),
          hfov: pannellumInstance.getHfov(),
        };

        if (
          !savedViewPosition ||
          Math.abs(savedViewPosition.yaw - position.yaw) > 1 ||
          Math.abs(savedViewPosition.pitch - position.pitch) > 1 ||
          Math.abs(savedViewPosition.hfov - position.hfov) > 1
        ) {
          dispatch(
            saveViewPosition({
              imageId: selectedImage.properties.id,
              position,
            })
          );
        }
      } catch (error) {
        console.error("Error saving view position:", error);
      }
    }
  };

  // Proper cleanup function to fully destroy Pannellum
  const cleanupPannellum = () => {
    saveCurrentViewPosition();
    if (pannellumInstance) {
      try {
        if (typeof pannellumInstance.destroy === "function") {
          pannellumInstance.destroy();
        }
      } catch (error) {
        console.error("Error destroying pannellum instance:", error);
      }
      if (viewerRef.current) {
        viewerRef.current.innerHTML = "";
      }
      setPannellumInstance(null);
    }
  };

  // Initialize Pannellum when scripts are loaded and image changes
  useEffect(() => {
    if (!scriptLoaded || !selectedImage || !viewerRef.current) return;

    const currentImageId = selectedImage.properties.id;
    const hasExistingInstanceForImage =
      pannellumInstance && viewerRef.current._currentImageId === currentImageId;

    if (hasExistingInstanceForImage) return;

    cleanupPannellum();

    const initTimer = setTimeout(() => {
      if (window.pannellum) {
        try {
          if (viewerRef.current) {
            viewerRef.current.innerHTML = "";
            viewerRef.current._currentImageId = currentImageId;
          }

          const currentIndex = images.findIndex(
            (img) => img.properties.id === selectedImage?.properties.id
          );

          const hotSpots = [];

          if (showControls) {
            const nextYaw = 0;
            const prevYaw = 180;

            const parseImageId = (id) => {
              if (!id) return { trackNumber: 0, imageNumber: 0 };
              const match = String(id).match(/^(\d+)_(\d+)/);
              return match
                ? {
                    trackNumber: parseInt(match[1], 10),
                    imageNumber: parseInt(match[2], 10),
                  }
                : { trackNumber: 0, imageNumber: 0 };
            };

            const { imageNumber } = parseImageId(currentImageId);

            hotSpots.push({
              pitch: 0,
              yaw: nextYaw,
              type: "custom",
              cssClass: "custom-hotspot next-hotspot",
              createTooltipFunc: (hotSpotDiv) => {
                hotSpotDiv.classList.add("custom-tooltip");
                const nextIcon = document.createElement("div");
                nextIcon.innerHTML = `<svg fill="#fff" height="200px" width="200px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 330 330" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path id="XMLID_224_" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394 l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393 C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z" /> </g></svg>`;
                nextIcon.classList.add("hotspot-icon", "fixed-icon");
                hotSpotDiv.appendChild(nextIcon);
                const nextText = document.createElement("span");
                nextText.textContent = "NEXT";
                nextText.classList.add("hotspot-text");
                hotSpotDiv.appendChild(nextText);
                hotSpotDiv.addEventListener("click", () => {
                  saveCurrentViewPosition();
                  onNextImage();
                });
              },
            });

            if (imageNumber > 0) {
              hotSpots.push({
                pitch: 0,
                yaw: prevYaw,
                type: "custom",
                cssClass: "custom-hotspot prev-hotspot",
                createTooltipFunc: (hotSpotDiv) => {
                  hotSpotDiv.classList.add("custom-tooltip");
                  const prevIcon = document.createElement("div");
                  prevIcon.innerHTML = `<svg fill="#fff" width="800px" height="800px" viewBox="0 -6 524 524" xmlns="http://www.w3.org/2000/svg" ><title>down</title><path d="M64 191L98 157 262 320 426 157 460 191 262 387 64 191Z" /></svg>`;
                  prevIcon.classList.add(
                    "hotspot-icon",
                    "fixed-icon",
                    "down-icon"
                  );
                  hotSpotDiv.appendChild(prevIcon);
                  const prevText = document.createElement("span");
                  prevText.textContent = "PREV";
                  prevText.classList.add("hotspot-text");
                  hotSpotDiv.appendChild(prevText);
                  hotSpotDiv.addEventListener("click", () => {
                    saveCurrentViewPosition();
                    onPrevImage();
                  });
                },
              });
            }
          }

          const initialYaw = savedViewPosition
            ? savedViewPosition.yaw
            : selectedImage.properties.initialYaw || 0;
          const initialPitch = savedViewPosition
            ? savedViewPosition.pitch
            : selectedImage.properties.initialPitch || 0;
          const initialHfov = savedViewPosition
            ? savedViewPosition.hfov
            : selectedImage.properties.initialHfov || 100;

          let imageUrl;
          if (
            selectedImage.properties.driveUrl_High &&
            selectedImage.properties.driveUrl_Comp
          ) {
            imageUrl = isHDMode
              ? selectedImage.properties.driveUrl_High
              : selectedImage.properties.driveUrl_Comp;
          } else {
            imageUrl = isHDMode
              ? selectedImage.properties.driveUrl_High ||
                selectedImage.properties.imageUrl
              : selectedImage.properties.driveUrl_Comp ||
                selectedImage.properties.imageUrl;
          }

          const viewer = window.pannellum.viewer(viewerRef.current.id, {
            type: "equirectangular",
            panorama: processImageUrl(imageUrl),
            autoLoad: true,
            showControls: true,
            compass: selectedImage.properties.showCompass || true,
            northOffset: 247.5,
            yaw: initialYaw,
            pitch: initialPitch,
            hfov: initialHfov,
            minHfov: 50,
            maxHfov: 120,
            mouseZoom: true,
            friction: 0.15,
            showFullscreenCtrl: true,
            showZoomCtrl: true,
            keyboardZoom: true,
            hotSpots: hotSpots,
            onLoad: () => {
              setIsLoading(false);
            },
            onError: (err) => {
              console.error("Pannellum Error:", err);
              setIsLoading(false);
            },
          });

          setPannellumInstance(viewer);
        } catch (err) {
          console.error("Error initializing Pannellum:", err);
          setIsLoading(false);
        }
      } else {
        console.error("Pannellum not available on window object");
        setIsLoading(false);
      }
    }, 50);

    return () => {
      clearTimeout(initTimer);
      cleanupPannellum();
    };
  }, [
    selectedImage,
    scriptLoaded,
    images,
    onNextImage,
    onPrevImage,
    savedViewPosition,
    dispatch,
    isHDMode,
    showControls,
  ]);

  // Effect to handle visibility changes for existing hotspots
  useEffect(() => {
    if (viewerRef.current) {
      const hotspots = viewerRef.current.querySelectorAll(".custom-hotspot");
      hotspots.forEach((hotspot) => {
        hotspot.style.display = showControls ? "flex" : "none";
      });
    }
  }, [showControls]);

  // Save the current view position periodically while user is interacting with the panorama
  useEffect(() => {
    if (!pannellumInstance || !selectedImage) return;

    const saveInterval = setInterval(saveCurrentViewPosition, 5000);
    const handleInteraction = () => {
      clearTimeout(viewerRef.current.saveTimeout);
      viewerRef.current.saveTimeout = setTimeout(saveCurrentViewPosition, 500);
    };

    if (viewerRef.current) {
      viewerRef.current.addEventListener("mousedown", handleInteraction);
      viewerRef.current.addEventListener("wheel", handleInteraction);
      viewerRef.current.addEventListener("touchstart", handleInteraction);
    }

    return () => {
      clearInterval(saveInterval);
      if (viewerRef.current) {
        viewerRef.current.removeEventListener("mousedown", handleInteraction);
        viewerRef.current.removeEventListener("wheel", handleInteraction);
        viewerRef.current.removeEventListener("touchstart", handleInteraction);
        clearTimeout(viewerRef.current.saveTimeout);
      }
    };
  }, [pannellumInstance, selectedImage?.properties?.id]);

  // Update navigation buttons based on viewer orientation
  useEffect(() => {
    if (!pannellumInstance || !selectedImage) return;
    return () => {};
  }, [pannellumInstance, selectedImage]);

  // Fetch POI data when selectedImage changes
  useEffect(() => {
    setPoiData([]);
    setIsPoiDrawerOpen(false);
    if (isPoiDrawerOpen) {
      fetchPoiData();
    }
  }, [selectedImage]);

  // Final cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupPannellum();
    };
  }, []);

  return (
    <>
      <Script
        src='https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js'
        onLoad={handleScriptLoad}
        strategy='afterInteractive'
      />
      <link
        rel='stylesheet'
        href='https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css'
      />

      <div id={viewerId.current} ref={viewerRef} className='w-full h-full' />

      {isLoading && (
        <div className='absolute inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
        </div>
      )}

      {pannellumInstance && selectedImage && showControls && (
        <>
          <div className='fixed-nav-controls'>
            <div className='vertical-nav-buttons'>
              {(selectedImage.properties.driveUrl_Comp ||
                images.findIndex(
                  (img) => img.properties.id === selectedImage?.properties.id
                ) <
                  images.length - 1) && (
                <button
                  className='nav-btn next-btn'
                  onClick={() => {
                    saveCurrentViewPosition();
                    onNextImage();
                  }}
                  aria-label='Next image'
                >
                  <div className='nav-content'>
                    <svg
                      className='nav-arrow'
                      fill='#fff'
                      height='24px'
                      width='24px'
                      viewBox='0 0 330 330'
                    >
                      <path d='M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394 l-149.996,150c-5.858,5.858,-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393 C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z' />
                    </svg>
                    <span className='nav-text'>NEXT</span>
                  </div>
                </button>
              )}

              {((selectedImage.properties.driveUrl_Comp &&
                selectedImage.properties.id &&
                String(
                  selectedImage.properties.id || selectedImage.properties.id
                ).match(/\d+_(\d+)/)?.[1] > 0) ||
                images.findIndex(
                  (img) => img.properties.id === selectedImage?.properties.id
                ) > 0) && (
                <button
                  className='nav-btn prev-btn'
                  onClick={() => {
                    saveCurrentViewPosition();
                    onPrevImage();
                  }}
                  aria-label='Previous image'
                >
                  <div className='nav-content'>
                    <svg
                      className='nav-arrow down-arrow'
                      fill='#fff'
                      height='24px'
                      width='24px'
                      viewBox='0 0 330 330'
                    >
                      <path d='M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394 l-149.996,150c-5.858,5.858,-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393 C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z' />
                    </svg>
                    <span className='nav-text'>PREV</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className='absolute bottom-[8.5%] right-2 z-10'>
            <button
              className={`p-2 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out
    ${
      isLoading
        ? "opacity-60 cursor-not-allowed"
        : "hover:scale-105 hover:shadow-lg"
    }
  `}
              onClick={toggleHDMode}
              aria-label='Toggle HD mode'
              disabled={isLoading}
            >
              {isLoading ? (
                <span className='flex items-center'>
                  <svg
                    className='animate-spin h-5 w-5 text-gray-600'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 
          5.373 0 12h4zm2 5.291A7.962 7.962 0 
          014 12H0c0 3.042 1.135 5.824 
          3 7.938l3-2.647z'
                    ></path>
                  </svg>
                </span>
              ) : isHDMode ? (
                <MdHd className='text-3xl text-green-500 transition-colors duration-300' />
              ) : (
                <MdOutlineHd className='text-3xl text-gray-700 hover:text-green-500 transition-colors duration-300' />
              )}
            </button>
          </div>

          <div className='absolute bottom-[16%] right-2 z-10'>
            <button
              className={`p-2 bg-white rounded-full shadow-lg hover:bg-green-200 transition-all duration-300 ${
                isGeneratingPoi ? "opacity-70" : "hover:scale-110"
              }`}
              onClick={generatePoi}
              aria-label='Generate POI'
              disabled={isGeneratingPoi}
              title='Generate POI for this location'
            >
              {isGeneratingPoi ? (
                <span className='flex items-center'>
                  <svg
                    className='animate-spin h-8 w-8 text-gray-800'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                </span>
              ) : (
                <MdAddLocation className='text-black text-3xl' />
              )}
            </button>
          </div>

          {/* POI Drawer Toggle Button */}
          <div className='absolute bottom-[23.5%] right-2 z-10'>
            <button
              className={`p-3 bg-gradient-to-br from-white to-gray-100 rounded-full shadow-md hover:shadow-lg transition-all duration-200 ease-in-out ${
                isFetchingPoi
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:scale-105 hover:bg-blue-50"
              }`}
              onClick={togglePoiDrawer}
              aria-label='Toggle Points of Interest Drawer'
              disabled={isFetchingPoi}
              title='View Points of Interest'
            >
              {isFetchingPoi ? (
                <span className='flex items-center justify-center'>
                  <svg
                    className='animate-spin h-5 w-5 text-gray-600'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                </span>
              ) : (
                <FaStoreAlt className='text-gray-800 text-2xl' />
              )}
            </button>
          </div>

          {/* POI Drawer */}
          {isPoiDrawerOpen && (
            <div className='absolute z-50 top-24 left-1  bg-white rounded-xl shadow-xl p-3 max-w-xs w-full max-h-[50vh] overflow-y-auto transition-all duration-300 ease-out'>
              <h3 className='text-base font-semibold text-gray-800 mb-2'>
                Points of Interest
              </h3>
              {isFetchingPoi ? (
                <div className='flex items-center justify-center py-4'>
                  <svg
                    className='animate-spin h-5 w-5 text-blue-500'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                </div>
              ) : poiData.length > 0 ? (
                <ul className='space-y-4'>
                  {poiData.map((poi) => (
                    <li
                      key={poi.id}
                      className='bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-4 border border-gray-100'
                    >
                      {/* Title */}
                      <div className='font-semibold text-gray-800 text-base flex items-center gap-2'>
                        <span className='w-2 h-2 rounded-full bg-indigo-500'></span>
                        {poi.text}
                      </div>

                      {/* Meta Info */}
                      <div className='mt-3 text-xs text-gray-600 space-y-1'>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium text-gray-700'>
                            Type:
                          </span>
                          <span className='px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium'>
                            {poi.type}
                          </span>
                        </div>

                        <div className='flex items-center gap-2'>
                          <span className='font-medium text-gray-700'>
                            Location:
                          </span>
                          <span className='truncate'>{poi.location}</span>
                        </div>

                        <div className='flex items-center gap-2'>
                          <span className='font-medium text-gray-700'>
                            Confidence:
                          </span>
                          <span className='px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium'>
                            {(poi.confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className='flex items-center gap-2'>
                          <span className='font-medium text-gray-700'>
                            Language:
                          </span>
                          <span className='px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 font-medium'>
                            {poi.language}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className='text-gray-500 text-sm py-2'>
                  No data available
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default PannellumViewer;
