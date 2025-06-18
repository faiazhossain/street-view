"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { useDispatch, useSelector } from "react-redux";
import {
  saveViewPosition,
  selectViewPosition,
} from "@/app/redux/slices/panoramaSlice";

// Create a ref that persists across component mounts to track script loading
let scriptLoadedGlobal = false;

// Helper function to properly process image URLs
const processImageUrl = (url) => {
  if (!url) return "";

  // If the URL already starts with /api/proxy/, don't modify it
  if (url.startsWith("/api/proxy/")) {
    return url;
  }

  // For absolute URLs with the IP addresses, use the path-based proxy
  if (url.includes("192.168.68.112:8000") || url.includes("192.168.68.183:8001")) {
    // Extract path after the domain/port
    const urlParts = url.split("/");
    const pathParts = urlParts.slice(3); // Skip http:, '', and domain:port
    const path = pathParts.join("/");

    return `/api/proxy/${path}`;
  }

  // For other URLs, use as is
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
  const viewerId = useRef(`panorama-viewer-${Date.now()}`); // Generate unique ID for each instance

  // Redux
  const dispatch = useDispatch();
  const savedViewPosition = useSelector((state) =>
    selectViewPosition(state, selectedImage?.properties?.id)
  );

  // Handle script loading
  const handleScriptLoad = () => {
    scriptLoadedGlobal = true;
    setScriptLoaded(true);
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

        // Compare with existing position before dispatching
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

          // Only log when debugging is needed - comment out for production
          // console.log(`Saved position for ${selectedImage.properties.id}:`, position);
        }
      } catch (error) {
        console.error("Error saving view position:", error);
      }
    }
  };

  // Proper cleanup function to fully destroy Pannellum
  const cleanupPannellum = () => {
    // Save the current view position before cleanup
    saveCurrentViewPosition();

    if (pannellumInstance) {
      try {
        // Try to call the proper destroy method if available
        if (typeof pannellumInstance.destroy === "function") {
          pannellumInstance.destroy();
        }
      } catch (error) {
        console.error("Error destroying pannellum instance:", error);
      }

      // Fallback cleanup - clear the HTML
      if (viewerRef.current) {
        viewerRef.current.innerHTML = "";
      }

      setPannellumInstance(null);
    }
  };

  // Initialize Pannellum when scripts are loaded and image changes
  useEffect(() => {
    if (!scriptLoaded || !selectedImage || !viewerRef.current) return;

    // Create a flag to track if we already have an instance for this specific image
    const currentImageId = selectedImage.properties.id;
    const hasExistingInstanceForImage =
      pannellumInstance && viewerRef.current._currentImageId === currentImageId;

    // Skip initialization if we already have an instance for this image
    if (hasExistingInstanceForImage) return;

    // Clean up previous instance
    cleanupPannellum();

    // Initialize with a small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      // Use the global window.pannellum object
      if (window.pannellum) {
        try {
          // Make sure the element is empty
          if (viewerRef.current) {
            viewerRef.current.innerHTML = "";
            // Store the current image ID on the DOM element for reference
            viewerRef.current._currentImageId = currentImageId;
          }

          // Find the current index in the images array to determine if prev/next buttons should be shown
          const currentIndex = images.findIndex(
            (img) => img.properties.id === selectedImage?.properties.id
          );

          // Create hotspots for navigation
          const hotSpots = [];

          // Get initialYaw from the saved position or the default from data
          // Use saved view position if available, otherwise use the default from image data
          const initialYaw = savedViewPosition
            ? savedViewPosition.yaw
            : selectedImage.properties.initialYaw || 0;
          const initialPitch = savedViewPosition
            ? savedViewPosition.pitch
            : selectedImage.properties.initialPitch || 0;
          const initialHfov = savedViewPosition
            ? savedViewPosition.hfov
            : selectedImage.properties.initialHfov || 100;

          // Fixed positions for next and prev hotspots
          // Use constant positions instead of calculating based on initialYaw
          const nextYaw = 0; // Fixed position for next (forward/up direction)
          const prevYaw = 180; // Fixed position for prev (backward/down direction)

          // Add Next button hotspot if not the last image
          if (currentIndex < images.length - 1) {
            hotSpots.push({
              pitch: 0,
              yaw: nextYaw,
              type: "custom",
              cssClass: "custom-hotspot next-hotspot",
              createTooltipFunc: (hotSpotDiv) => {
                hotSpotDiv.classList.add("custom-tooltip");

                // Create SVG element for the icon (pointing up)
                const nextIcon = document.createElement("div");
                nextIcon.innerHTML = `<svg fill="#fff" height="200px" width="200px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 330 330" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path id="XMLID_224_" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394 l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393 C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z"></path> </g></svg>`;
                nextIcon.classList.add("hotspot-icon", "fixed-icon");
                hotSpotDiv.appendChild(nextIcon);

                const nextText = document.createElement("span");
                nextText.textContent = "NEXT";
                nextText.classList.add("hotspot-text");
                hotSpotDiv.appendChild(nextText);

                // Save current view position before navigating
                hotSpotDiv.addEventListener("click", () => {
                  saveCurrentViewPosition();
                  onNextImage();
                });
              },
            });
          }

          // Add Previous button hotspot if not the first image
          if (currentIndex > 0) {
            hotSpots.push({
              pitch: 0,
              yaw: prevYaw,
              type: "custom",
              cssClass: "custom-hotspot prev-hotspot",
              createTooltipFunc: (hotSpotDiv) => {
                hotSpotDiv.classList.add("custom-tooltip");

                // Create SVG element for the icon (pointing down)
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

                // Save current view position before navigating
                hotSpotDiv.addEventListener("click", () => {
                  saveCurrentViewPosition();
                  onPrevImage();
                });
              },
            });
          }

          // Log the view values for debugging only when needed
          if (process.env.NODE_ENV === "development" && false) {
            // Set to true when debugging is needed
            console.log(
              `Initial values - Yaw: ${initialYaw}, Pitch: ${initialPitch}, HFOV: ${initialHfov}, Next Yaw: ${nextYaw}, Prev Yaw: ${prevYaw}`
            );
          }

          const viewer = window.pannellum.viewer(viewerRef.current.id, {
            type: "equirectangular",
            panorama: processImageUrl(
              selectedImage.properties.imageUrl_High ||
                selectedImage.properties.imageUrl
            ),
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
              console.log("Pannellum onLoad callback fired");
            },
            onError: (err) => {
              console.error("Pannellum Error:", err);
            },
          });

          setPannellumInstance(viewer);
        } catch (err) {
          console.error("Error initializing Pannellum:", err);
        }
      } else {
        console.error("Pannellum not available on window object");
      }
    }, 50); // Small delay to ensure DOM is ready

    // Clean up on unmount or before re-initializing
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
  ]);

  // Save the current view position periodically while user is interacting with the panorama
  useEffect(() => {
    if (!pannellumInstance || !selectedImage) return;

    // Save view position less frequently (every 5 seconds instead of 2)
    // This reduces Redux state updates and potential re-renders
    const saveInterval = setInterval(saveCurrentViewPosition, 5000);

    // Save position on user interactions
    const handleInteraction = () => {
      // Use a debounced version of the save function to prevent excessive saves
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

    // No need to update arrow orientations since we want them fixed
    // Cleaning up the previous effect logic that was rotating the arrows

    return () => {
      // Clean up only needed for potential event listeners if added later
    };
  }, [pannellumInstance, selectedImage]);

  // Final cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupPannellum();
    };
  }, []);

  return (
    <>
      {/* Load Pannellum scripts */}
      <Script
        src='https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js'
        onLoad={handleScriptLoad}
        strategy='afterInteractive'
      />
      <link
        rel='stylesheet'
        href='https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css'
      />

      {/* Pannellum viewer container with dynamic ID */}
      <div id={viewerId.current} ref={viewerRef} className='w-full h-full' />

      {/* Fixed Navigation Controls */}
      {pannellumInstance && selectedImage && (
        <div className='fixed-nav-controls'>
          <div className='vertical-nav-buttons'>
            {images.findIndex(
              (img) => img.properties.id === selectedImage?.properties.id
            ) <
              images.length - 1 && (
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
                    <path d='M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394 l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393 C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z' />
                  </svg>
                  <span className='nav-text'>NEXT</span>
                </div>
              </button>
            )}

            {images.findIndex(
              (img) => img.properties.id === selectedImage?.properties.id
            ) > 0 && (
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
                    <path d='M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394 l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393 C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z' />
                  </svg>
                  <span className='nav-text'>PREV</span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PannellumViewer;
