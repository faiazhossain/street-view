'use client';

import { useState, useEffect, useRef } from 'react';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import Script from 'next/script';

// Create a ref that persists across component mounts to track script loading
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
        console.log('Safety timeout reached - forcing loading state to false');
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
        if (typeof pannellumInstance.destroy === 'function') {
          pannellumInstance.destroy();
        }
      } catch (error) {
        console.error('Error destroying pannellum instance:', error);
      }

      // Fallback cleanup - clear the HTML
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
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
            viewerRef.current.innerHTML = '';
          }

          const viewer = window.pannellum.viewer(viewerRef.current.id, {
            type: 'equirectangular',
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
            onLoad: () => {
              console.log('Pannellum onLoad callback fired');
              // Clear any safety timeout
              if (loadTimeoutRef.current) {
                clearTimeout(loadTimeoutRef.current);
              }
              setLoading(false);
            },
            onError: (err) => {
              console.error('Pannellum Error:', err);
              setLoading(false);
            },
          });

          // Add a manual check for when the image is loaded
          // Sometimes the onLoad callback isn't triggered correctly
          const panoramaImage =
            viewerRef.current.querySelector('.pnlm-dragfix');
          if (panoramaImage) {
            const checkImage = () => {
              if (panoramaImage.classList.contains('pnlm-grab')) {
                console.log('Detected loaded panorama via class check');
                setLoading(false);
              }
            };

            // Check after a short delay
            setTimeout(checkImage, 1000);
          }

          setPannellumInstance(viewer);
        } catch (err) {
          console.error('Error initializing Pannellum:', err);
          setLoading(false);
        }
      } else {
        console.error('Pannellum not available on window object');
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
  }, [selectedImage, scriptLoaded]);

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
        </div>

        <div className='flex justify-between items-center p-4 bg-gray-900 controls-container'>
          <button
            onClick={onPrevImage}
            disabled={currentIndex <= 0}
            className={`px-4 py-2 bg-blue-600 rounded ${
              currentIndex <= 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-700'
            }`}
          >
            Previous
          </button>

          <button
            onClick={onNextImage}
            disabled={currentIndex >= images.length - 1}
            className={`px-4 py-2 bg-blue-600 rounded ${
              currentIndex >= images.length - 1
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-700'
            }`}
          >
            Next
          </button>
        </div>

        <div className='p-2 text-center text-white text-sm bg-gray-800'>
          Use arrow keys to navigate between images (← →) | Press ESC to close |
          Drag to look around | Scroll to zoom
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;
