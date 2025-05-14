"use client";

import { useRef, useState, useEffect } from "react";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import PannellumViewer from "./pannellum/PannellumViewer";
import ViewerHeader from "./ViewerHeader";
import ViewerFooter from "./ViewerFooter";
import "../../styles/pannellum-hotspots.css";

const ImageViewer = ({
  selectedImage,
  images,
  onPrevImage,
  onNextImage,
  onClose,
}) => {
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const timerRef = useRef(null);

  // Toggle auto-play functionality
  const toggleAutoPlay = () => {
    setIsAutoPlaying((prev) => !prev);
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
