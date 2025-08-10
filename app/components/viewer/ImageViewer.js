"use client";

import { useRef, useState, useEffect } from "react";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import { useSelector } from "react-redux";
import { selectShowControls } from "../../redux/slices/uiControlsSlice";
import PannellumViewer from "./pannellum/PannellumViewer";
import ViewerHeader from "./ViewerHeader";
import ViewerFooter from "./ViewerFooter";
import MapComponent from "../MapComponent";
import "../../styles/pannellum-hotspots.css";
import { FcCompactCamera } from "react-icons/fc";

const ImageViewer = ({
  selectedImage,
  images,
  onPrevImage,
  onNextImage,
  onClose,
  pathData,
  onImageSelect,
}) => {
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true); // Default to shown
  // Add state to track the minimap center position
  const [miniMapViewState, setMiniMapViewState] = useState({
    longitude: selectedImage?.geometry?.coordinates[0] || 0,
    latitude: selectedImage?.geometry?.coordinates[1] || 0,
    zoom: 14,
  });
  const timerRef = useRef(null);
  const [fadeIn, setFadeIn] = useState(true); // For transition animations
  const showControls = useSelector(selectShowControls); // Get UI controls visibility state from Redux

  // Toggle auto-play functionality
  const toggleAutoPlay = () => {
    setIsAutoPlaying((prev) => !prev);
  };

  // Toggle mini-map visibility
  const toggleMiniMap = () => {
    setShowMiniMap((prev) => !prev);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Format date in a more compact way for the floating info
  const formatCompactDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Start or stop the auto-play timer based on isAutoPlaying state
  useEffect(() => {
    if (isAutoPlaying) {
      // Set a timer with a longer delay (6 seconds) to allow users to view each panorama
      timerRef.current = setTimeout(() => {
        onNextImage();
        // After the first image change, set up the interval for subsequent changes
        timerRef.current = setInterval(() => {
          onNextImage();
        }, 6000); // 6 seconds between image changes
      }, 6000); // Wait 6 seconds before changing the first image
    } else {
      // Clear all timers when autoplay is stopped
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    // Clean up on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        clearInterval(timerRef.current);
      }
    };
  }, [isAutoPlaying, onNextImage]);

  // Animation effect when switching images
  useEffect(() => {
    setFadeIn(true);
    const timer = setTimeout(() => {
      setFadeIn(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedImage?.properties?.id]);

  // Update minimap position when selected image changes
  useEffect(() => {
    if (selectedImage) {
      // Get coordinates from selected image
      const useSnapped =
        selectedImage.properties.longitude_snapped !== undefined &&
        selectedImage.properties.latitude_snapped !== undefined;

      const longitude = useSnapped
        ? selectedImage.properties.longitude_snapped
        : selectedImage.geometry.coordinates[0];

      const latitude = useSnapped
        ? selectedImage.properties.latitude_snapped
        : selectedImage.geometry.coordinates[1];

      // Update the minimap view state to center on the selected image
      setMiniMapViewState({
        longitude,
        latitude,
        zoom: 15, // A good zoom level for the minimap
        transitionDuration: 500, // Smooth animation
        transitionInterpolator: {
          around: [longitude, latitude],
        },
      });
    }
  }, [selectedImage?.properties?.id]); // Using id to ensure we respond to all image changes

  // Use keyboard navigation hook
  useKeyboardNavigation({
    onPrev: onPrevImage,
    onNext: onNextImage,
    onClose: onClose,
    isActive: !!selectedImage,
  });

  // Function to get display caption for the current image
  const getImageCaption = () => {
    if (!selectedImage) return "";

    // Try to get feature_id (new format) or fallback to id (old format)
    const displayId =
      selectedImage.properties.feature_id || selectedImage.properties.id;

    // Show the image ID and date if available
    let caption = `Image: ${displayId}`;

    if (selectedImage.properties.capture_date) {
      // Format the date nicely if it exists
      const date = new Date(selectedImage.properties.capture_date);
      const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      caption += ` (${formattedDate})`;
    }

    return caption;
  };

  if (!selectedImage) return null;

  return (
    <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm'>
      <div
        className={`relative max-w-full w-full h-full flex flex-col ${
          fadeIn ? "fade-in" : ""
        }`}
      >
        <ViewerHeader title={`ThirdEye360`} onClose={onClose} />

        <div className='relative flex-grow overflow-hidden'>
          <PannellumViewer
            selectedImage={selectedImage}
            images={images}
            onPrevImage={onPrevImage}
            onNextImage={onNextImage}
          />

          {/* Floating Image Information - Always visible on top right */}
          {showControls && (
            <div className='absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-xl z-50 max-w-xs animate-fade-in border border-white/10'>
              <div className='space-y-2 text-sm'>
                {/* Location ID
                <div className='flex items-center space-x-2'>
                  <FaLocationArrow className='text-blue-400 shrink-0' />
                  <div className='truncate'>
                    <span className='text-gray-400 text-xs'>ID: </span>
                    <span className='text-white/90'>
                      {selectedImage.properties.id}
                    </span>
                  </div>
                </div> */}
                {/* Coordinates
                <div className='flex items-center space-x-2'>
                  <FaMapMarkerAlt className='text-red-400 shrink-0' />
                  <div className='grid grid-cols-1 gap-0'>
                    <div className='text-xs'>
                      <span className='text-white/90'>
                        {selectedImage.properties.latitude_snapped?.toFixed(
                          6
                        ) || "N/A"}
                      </span>
                      <span className='text-gray-400'> , </span>
                      <span className='text-white/90'>
                        {selectedImage.properties.longitude_snapped?.toFixed(
                          6
                        ) || "N/A"}
                      </span>
                    </div>
                    <div className='text-xs'></div>
                  </div>
                </div> */}
                {/* Created At */}
                <div className='flex items-center space-x-2'>
                  <FcCompactCamera className='text-xl' />
                  <div>
                    <span className='text-gray-400 text-xs'>Captured: </span>
                    <span className='text-white/90'>
                      {formatCompactDate(selectedImage.properties.capture_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mini Map in bottom-left corner with toggle button inside the top-right of map */}
          {showMiniMap && showControls && (
            <div className='absolute bottom-4 left-4 w-64 h-48 z-10 rounded-xl overflow-hidden shadow-xl border border-gray-800/30 glass scale-in'>
              <MapComponent
                imageData={{ features: images }}
                pathData={pathData}
                selectedImageId={selectedImage.properties.id}
                onImageSelect={onImageSelect}
                isCompact={true}
                initialViewState={miniMapViewState} // Pass our custom view state to center on selected point
              />
              <button
                onClick={toggleMiniMap}
                className='absolute top-2 right-2 bg-black/70 text-white hover:bg-black/90 rounded-full p-1.5 z-20 shadow-md transition-colors'
                title='Hide mini map'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 20 20'
                  fill='currentColor'
                  className='w-3.5 h-3.5'
                >
                  <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
                </svg>
              </button>
            </div>
          )}

          {/* Toggle button when map is hidden - positioned in bottom left */}
          {(!showMiniMap || !showControls) && showControls && (
            <button
              onClick={toggleMiniMap}
              className='absolute bottom-4 left-4 glass text-white hover:bg-black/75 rounded-full p-3 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110'
              title='Show mini map'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 20 20'
                fill='currentColor'
                className='w-5 h-5'
              >
                <path
                  fillRule='evenodd'
                  d='M8.157 2.175a1.5 1.5 0 00-1.147 0l-4.084 1.69A1.5 1.5 0 002 5.251v10.877a1.5 1.5 0 002.074 1.386l3.51-1.453 4.26 1.763a1.5 1.5 0 001.146 0l4.083-1.69A1.5 1.5 0 0018 14.748V3.873a1.5 1.5 0 00-2.073-1.386l-3.51 1.452-4.26-1.763zM7.58 5a.75.75 0 01.75.75v6.5a.75.75 0 01-1.5 0v-6.5A.75.75 0 017.58 5zm5.59 2.75a.75.75 0 00-1.5 0v6.5a.75.75 0 001.5 0v-6.5z'
                  clipRule='evenodd'
                />
              </svg>
            </button>
          )}
        </div>

        {showControls && (
          <ViewerFooter
            isAutoPlaying={isAutoPlaying}
            toggleAutoPlay={toggleAutoPlay}
          />
        )}

        {/* Floating image information badge */}
        {showControls && (
          <div className='absolute top-20 left-8 glass px-4 py-2 rounded-xl text-sm shadow-lg opacity-75 hover:opacity-100 transition-opacity z-50'>
            <div className='flex items-center space-x-2'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-4 w-4 text-blue-500'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              <span>Use your mouse to look around | Scroll to zoom</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageViewer;
