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
  const [showMiniMap, setShowMiniMap] = useState(true);
  const timerRef = useRef(null);

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
      timerRef.current = setInterval(() => {
        onNextImage();
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    // Clean up on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isAutoPlaying, onNextImage]);

  // Use keyboard navigation hook
  useKeyboardNavigation({
    onPrev: onPrevImage,
    onNext: onNextImage,
    onClose: onClose,
    isActive: !!selectedImage,
  });

  if (!selectedImage) return null;

  return (
    <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-95'>
      <div className='relative max-w-7xl w-full h-full flex flex-col'>
        <ViewerHeader
          title={`Image: ${selectedImage.properties.id}`}
          onClose={onClose}
        />

        <div className='relative flex-grow overflow-hidden'>
          <PannellumViewer
            selectedImage={selectedImage}
            images={images}
            onPrevImage={onPrevImage}
            onNextImage={onNextImage}
          />

          {/* Mini Map in bottom-left corner */}
          {showMiniMap && (
            <div className='absolute bottom-4 left-4 w-64 h-48 z-10 rounded-lg overflow-hidden shadow-lg border-2 border-black'>
              <MapComponent
                imageData={{ features: images }}
                pathData={pathData}
                selectedImageId={selectedImage.properties.id}
                onImageSelect={onImageSelect}
              />
              <button
                onClick={toggleMiniMap}
                className='absolute top-2 right-2 bg-black bg-opacity-80 rounded-full p-1 w-6 h-6 flex items-center justify-center text-sm font-bold'
                title='Hide mini map'
              >
                ×
              </button>
            </div>
          )}

          {/* Show mini-map toggle button when map is hidden */}
          {!showMiniMap && (
            <button
              onClick={toggleMiniMap}
              className='absolute bottom-4 left-4 bg-black bg-opacity-80 rounded-md px-2 py-1 text-sm shadow-lg'
              title='Show mini map'
            >
              Show Map
            </button>
          )}
        </div>

        <ViewerFooter
          isAutoPlaying={isAutoPlaying}
          toggleAutoPlay={toggleAutoPlay}
        />
      </div>
    </div>
  );
};

export default ImageViewer;
