"use client";

import { useState, useEffect, useRef } from "react";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import Script from "next/script";
let scriptLoadedGlobal = false;

const ImageViewer = ({
  selectedImage,
  images,
  onPrevImage,
  onNextImage,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(scriptLoadedGlobal);
  const viewerRef = useRef(null);
  const [pannellumInstance, setPannellumInstance] = useState(null);
  const viewerId = useRef(`panorama-viewer-${Date.now()}`); // Generate unique ID for each instance
  const loadTimeoutRef = useRef(null);

  // Use keyboard navigation hook
  useKeyboardNavigation({
    onPrev: onPrevImage,
    onNext: onNextImage,
    onClose: onClose,
    isActive: !!selectedImage,
  });

  // Handle script loading
  const handleScriptLoad = () => {
    scriptLoadedGlobal = true;
    setScriptLoaded(true);
  };

  // Add a safety timeout to hide the loading indicator if onLoad isn't called
  useEffect(() => {
    if (loading) {
      // Set a safety timeout to hide loading indicator after 5 seconds
      loadTimeoutRef.current = setTimeout(() => {
        console.log("Safety timeout reached - forcing loading state to false");
        setLoading(false);
      }, 5000);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [loading]);

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

    // Set loading state and small delay to ensure DOM is ready
    setLoading(true);

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

                // Create SVG element for the icon (FaArrowCircleRight)
                const nextIcon = document.createElement("div");
                nextIcon.innerHTML = `<svg fill="#fff" height="200px" width="200px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 330 330" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path id="XMLID_224_" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394 l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393 C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z"></path> </g></svg>`;
                nextIcon.classList.add("hotspot-icon");
                hotSpotDiv.appendChild(nextIcon);

                const nextText = document.createElement("span");
                nextText.innerHTML = "Next";
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

                // Create SVG element for the icon (FaArrowCircleLeft)
                const prevIcon = document.createElement("div");
                prevIcon.innerHTML = `<svg fill="#fff" height="200px" width="200px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 330 330" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path id="XMLID_224_" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394 l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393 C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z"></path> </g></svg>`;
                prevIcon.classList.add("hotspot-icon");
                hotSpotDiv.appendChild(prevIcon);

                const prevText = document.createElement("span");
                prevText.innerHTML = "Previous";
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
              // Clear any safety timeout
              if (loadTimeoutRef.current) {
                clearTimeout(loadTimeoutRef.current);
              }
              setLoading(false);
            },
            onError: (err) => {
              console.error("Pannellum Error:", err);
              setLoading(false);
            },
          });

          // Add a manual check for when the image is loaded
          // Sometimes the onLoad callback isn't triggered correctly
          const panoramaImage =
            viewerRef.current.querySelector(".pnlm-dragfix");
          if (panoramaImage) {
            const checkImage = () => {
              if (panoramaImage.classList.contains("pnlm-grab")) {
                console.log("Detected loaded panorama via class check");
                setLoading(false);
              }
            };

            // Check after a short delay
            setTimeout(checkImage, 1000);
          }

          setPannellumInstance(viewer);
        } catch (err) {
          console.error("Error initializing Pannellum:", err);
          setLoading(false);
        }
      } else {
        console.error("Pannellum not available on window object");
        setLoading(false);
      }
    }, 50); // Small delay to ensure DOM is ready

    // Clean up on unmount or before re-initializing
    return () => {
      clearTimeout(initTimer);
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      cleanupPannellum();
    };
  }, [selectedImage, scriptLoaded, images, onNextImage, onPrevImage]);

  // Final cleanup on component unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      cleanupPannellum();
    };
  }, []);

  // Find the current index in the images array
  const currentIndex = images.findIndex(
    (img) => img.properties.id === selectedImage?.properties.id
  );

  if (!selectedImage) return null;

  return (
    <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-95'>
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

      {/* Add custom styles for hotspots */}
      <style jsx global>{`
        .custom-hotspot {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          cursor: pointer;
          position: absolute;
          margin-top: 160px;
        }

        .custom-hotspot:hover {
          background: rgba(0, 0, 0, 0.8);
          transform: scale(1.1);
        }

        .hotspot-icon {
          font-size: 32px;
          font-weight: bold;
        }

        .hotspot-icon svg {
          width: 32px;
          height: 32px;
        }

        .hotspot-text {
          position: absolute;
          bottom: -25px;
          white-space: nowrap;
          background: rgba(0, 0, 0, 0.7);
          padding: 3px 6px;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .custom-hotspot:hover .hotspot-text {
          opacity: 1;
        }

        /* Ensure pannellum positions the hotspots properly */
        .pnlm-hotspot {
          transition: none;
        }

        .next-hotspot {
          /* Additional styling for next button */
        }

        .prev-hotspot {
          /* Additional styling for prev button */
        }
      `}</style>

      <div className='relative max-w-7xl w-full h-full flex flex-col'>
        <div className='flex justify-between items-center p-4 text-white'>
          <h2 className='text-xl font-bold'>
            Image: {selectedImage.properties.id}
          </h2>
          <button
            onClick={() => {
              setLoading(false); // Ensure loading is hidden before closing
              onClose();
            }}
            className='rounded-full bg-red-600 p-2 hover:bg-red-700'
            aria-label='Close viewer'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-6 w-6'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        <div className='relative flex-grow overflow-hidden'>
          {/* Pannellum viewer container with dynamic ID */}
          <div
            id={viewerId.current}
            ref={viewerRef}
            className='w-full h-full'
          />

          {/* The navigation arrows are now replaced by hotspots */}
        </div>

        <div className='p-2 text-center text-white text-sm bg-gray-800'>
          Click hotspots to move | Press ESC to close | Drag to look around |
          Scroll to zoom
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;
