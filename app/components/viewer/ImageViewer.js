"use client";

import { useRef, useState, useEffect } from "react";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import PannellumViewer from "./pannellum/PannellumViewer";
import ViewerHeader from "./ViewerHeader";
import ViewerFooter from "./ViewerFooter";
import MapComponent from "../MapComponent";
import "../../styles/pannellum-hotspots.css";

const ImageViewer = ({
  selectedImage,
  images,
  onPrevImage,
  onNextImage,
  onClose,
  imageData,
  pathData,
  onImageSelect,
}) => {
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true); // Default to shown
  const timerRef = useRef(null);
  const [fadeIn, setFadeIn] = useState(true); // For transition animations

  // Toggle auto-play functionality
  const toggleAutoPlay = () => {
    setIsAutoPlaying((prev) => !prev);
  };

  // Toggle mini-map visibility
  const toggleMiniMap = () => {
    setShowMiniMap((prev) => !prev);
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

  // Use keyboard navigation hook
  useKeyboardNavigation({
    onPrev: onPrevImage,
    onNext: onNextImage,
    onClose: onClose,
    isActive: !!selectedImage,
  });

  if (!selectedImage) return null;

  return (
    <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm'>
      <div
        className={`relative max-w-full w-full h-full flex flex-col ${
          fadeIn ? "fade-in" : ""
        }`}
      >
        <ViewerHeader
          title={`Location: ${selectedImage.properties.id}`}
          onClose={onClose}
        />

        <div className='relative flex-grow overflow-hidden'>
          <PannellumViewer
            selectedImage={selectedImage}
            images={images}
            onPrevImage={onPrevImage}
            onNextImage={onNextImage}
          />

          {/* Mini Map in bottom-left corner with toggle button inside the top-right of map */}
          {showMiniMap && (
            <div className='absolute bottom-4 left-4 w-64 h-48 z-10 rounded-xl overflow-hidden shadow-xl border border-gray-800/30 glass scale-in'>
              <MapComponent
                imageData={{ features: images }}
                pathData={pathData}
                selectedImageId={selectedImage.properties.id}
                onImageSelect={onImageSelect}
                isCompact={true}
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
          {!showMiniMap && (
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
                  d='M8.161 2.58a1.875 1.875 0 011.678 0l4.993 2.498c.106.052.23.052.336 0l3.869-1.935A.75.75 0 0120 3.75v12.5a.75.75 0 01-1.037.696l-3.868-1.935a.75.75 0 00-.337 0l-4.992 2.498a1.875 1.875 0 01-1.679 0L3.896 14.96a.75.75 0 00-.336 0l-2.523 1.261A.75.75 0 010 15.526V3.75a.75.75 0 011.038-.696l2.522 1.261a.75.75 0 00.337 0l4.264-2.132z'
                  clipRule='evenodd'
                />
              </svg>
            </button>
          )}
        </div>

        <ViewerFooter
          isAutoPlaying={isAutoPlaying}
          toggleAutoPlay={toggleAutoPlay}
        />

        {/* Floating image information badge */}
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
            <span>
              Image{" "}
              {images.findIndex(
                (img) => img.properties.id === selectedImage.properties.id
              ) + 1}{" "}
              of {images.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;
