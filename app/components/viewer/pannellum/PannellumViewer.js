"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";

// Create a ref that persists across component mounts to track script loading
let scriptLoadedGlobal = false;

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

  // Handle script loading
  const handleScriptLoad = () => {
    scriptLoadedGlobal = true;
    setScriptLoaded(true);
  };

  // Proper cleanup function to fully destroy Pannellum
  const cleanupPannellum = () => {
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
          }

          // Find the current index in the images array to determine if prev/next buttons should be shown
          const currentIndex = images.findIndex(
            (img) => img.properties.id === selectedImage?.properties.id
          );

          // Create hotspots for navigation
          const hotSpots = [];

          // Initial yaw from the selected image
          const initialYaw = selectedImage.properties.initialYaw || 0;

          // Add Next button hotspot if not the last image
          if (currentIndex < images.length - 1) {
            hotSpots.push({
              pitch: 0,
              yaw: 270, // 270 degrees to the right of initial view
              type: "custom",
              cssClass: "custom-hotspot next-hotspot",
              createTooltipFunc: (hotSpotDiv) => {
                hotSpotDiv.classList.add("custom-tooltip");

                // Create SVG element for the icon
                const nextIcon = document.createElement("div");
                nextIcon.innerHTML = `<svg fill="#fff" height="200px" width="200px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 330 330" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path id="XMLID_224_" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394 l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393 C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z"></path> </g></svg>`;
                nextIcon.classList.add("hotspot-icon");
                hotSpotDiv.appendChild(nextIcon);

                const nextText = document.createElement("span");
                nextText.classList.add("hotspot-text");
                hotSpotDiv.appendChild(nextText);

                hotSpotDiv.addEventListener("click", onNextImage);
              },
            });
          }

          // Add Previous button hotspot if not the first image
          if (currentIndex > 0) {
            hotSpots.push({
              pitch: 0,
              yaw: 90, // 90 degrees to the left of initial view
              type: "custom",
              cssClass: "custom-hotspot prev-hotspot",
              createTooltipFunc: (hotSpotDiv) => {
                hotSpotDiv.classList.add("custom-tooltip");

                // Create SVG element for the icon
                const prevIcon = document.createElement("div");
                prevIcon.innerHTML = `<svg fill="#fff" height="200px" width="200px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 330 330" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path id="XMLID_224_" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394 l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393 C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z"></path> </g></svg>`;
                prevIcon.classList.add("hotspot-icon");
                hotSpotDiv.appendChild(prevIcon);

                const prevText = document.createElement("span");
                prevText.classList.add("hotspot-text");
                hotSpotDiv.appendChild(prevText);

                hotSpotDiv.addEventListener("click", onPrevImage);
              },
            });
          }

          const viewer = window.pannellum.viewer(viewerRef.current.id, {
            type: "equirectangular",
            panorama: selectedImage.properties.imageUrl,
            autoLoad: true,
            showControls: true,
            compass: selectedImage.properties.showCompass || true,
            northOffset: 247.5,
            yaw: selectedImage.properties.initialYaw || 0,
            pitch: selectedImage.properties.initialPitch || 0,
            hfov: selectedImage.properties.initialHfov || 100,
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
  }, [selectedImage, scriptLoaded, images, onNextImage, onPrevImage]);

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
    </>
  );
};

export default PannellumViewer;
