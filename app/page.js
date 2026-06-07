"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import PageLayout from "./components/layout/PageLayout";
import MapComponent from "./components/MapComponent";
import ImageViewer from "./components/viewer/ImageViewer";
import { useImageData } from "./data/imageData";
import { useSearchParams, useRouter } from "next/navigation";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

// View state change thresholds (degrees/fov)
const VIEW_CHANGE_THRESHOLD = {
  yaw: 2, // Update only if yaw changes by more than 2 degrees
  pitch: 1, // Update only if pitch changes by more than 1 degree
  hfov: 3, // Update only if hfov changes by more than 3 degrees
};

function HomeContent() {
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [selectedImageData, setSelectedImageData] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [isLoadingFeature, setIsLoadingFeature] = useState(false);
  const { isLoading, error, refreshData } = useImageData();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pannellumInstanceRef = useRef(null);
  const [sharedViewState, setSharedViewState] = useState(null);
  const hasProcessedSharedLink = useRef(false);
  const viewerWasOpenRef = useRef(false); // Track if viewer was previously open
  const hasInitializedView = useRef(false); // Track if view has been initialized
  const lastUrlStateRef = useRef(null); // Track last URL state to avoid unnecessary updates
  const updateTimeoutRef = useRef(null); // Debounce timeout

  // Function to update browser URL with current view state
  const updateBrowserUrl = useCallback(
    (imageId, viewState = null) => {
      if (!imageId) return;

      const params = new URLSearchParams();
      console.log(params, "params");
      params.set("id", imageId);

      if (viewState) {
        if (viewState.yaw !== undefined)
          params.set("yaw", viewState.yaw.toFixed(2));
        if (viewState.pitch !== undefined)
          params.set("pitch", viewState.pitch.toFixed(2));
        if (viewState.hfov !== undefined)
          params.set("hfov", viewState.hfov.toFixed(2));
      }

      // Update URL without page reload
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  // Update URL when image changes (but not on initial shared link load)
  useEffect(() => {
    if (showViewer && selectedImageId) {
      // Skip updating URL if we're still processing a shared link with view state
      if (sharedViewState !== null) {
        return;
      }

      // Get current view state if pannellum is ready
      let viewState = null;
      if (pannellumInstanceRef?.current) {
        try {
          viewState = {
            yaw: pannellumInstanceRef.current.getYaw(),
            pitch: pannellumInstanceRef.current.getPitch(),
            hfov: pannellumInstanceRef.current.getHfov(),
          };
        } catch (error) {
          // Pannellum not ready yet, that's okay
        }
      }

      // Only update URL if pannellum is initialized or we're not from a shared link
      if (hasInitializedView.current || !searchParams.get("yaw")) {
        updateBrowserUrl(selectedImageId, viewState);
      }
    }
  }, [
    selectedImageId,
    showViewer,
    updateBrowserUrl,
    sharedViewState,
    searchParams,
  ]);

  // Update URL when camera view changes significantly (debounced, event-driven)
  useEffect(() => {
    if (!showViewer || !pannellumInstanceRef?.current || !selectedImageId)
      return;

    // Function to check if view state has changed significantly
    const hasSignificantChange = (currentState, newState) => {
      if (!currentState) return true;

      return (
        Math.abs(currentState.yaw - newState.yaw) > VIEW_CHANGE_THRESHOLD.yaw ||
        Math.abs(currentState.pitch - newState.pitch) >
          VIEW_CHANGE_THRESHOLD.pitch ||
        Math.abs(currentState.hfov - newState.hfov) > VIEW_CHANGE_THRESHOLD.hfov
      );
    };

    // Debounced URL update function
    const scheduleUrlUpdate = () => {
      // Clear any existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Schedule update after user stops interacting (500ms debounce)
      updateTimeoutRef.current = setTimeout(() => {
        if (!pannellumInstanceRef?.current || !selectedImageId) return;

        try {
          const newViewState = {
            yaw: pannellumInstanceRef.current.getYaw(),
            pitch: pannellumInstanceRef.current.getPitch(),
            hfov: pannellumInstanceRef.current.getHfov(),
          };

          // Only update if change is significant
          if (hasSignificantChange(lastUrlStateRef.current, newViewState)) {
            lastUrlStateRef.current = newViewState;
            updateBrowserUrl(selectedImageId, newViewState);
          }
        } catch (error) {
          // Ignore errors if pannellum is not ready
        }
      }, 500); // 500ms debounce - update after user stops interacting
    };

    // Event handlers for user interactions
    const handleInteraction = scheduleUrlUpdate;

    // Get the viewer container element
    const viewerElement = document.querySelector(".pnlm-container");

    if (viewerElement) {
      // Listen for interaction events
      viewerElement.addEventListener("mousedown", handleInteraction);
      viewerElement.addEventListener("mouseup", handleInteraction);
      viewerElement.addEventListener("wheel", handleInteraction);
      viewerElement.addEventListener("touchstart", handleInteraction);
      viewerElement.addEventListener("touchend", handleInteraction);
      // Listen for keyboard events
      viewerElement.addEventListener("keydown", handleInteraction);
    }

    // Cleanup
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      if (viewerElement) {
        viewerElement.removeEventListener("mousedown", handleInteraction);
        viewerElement.removeEventListener("mouseup", handleInteraction);
        viewerElement.removeEventListener("wheel", handleInteraction);
        viewerElement.removeEventListener("touchstart", handleInteraction);
        viewerElement.removeEventListener("touchend", handleInteraction);
        viewerElement.removeEventListener("keydown", handleInteraction);
      }

      // Reset last URL state when viewer closes
      lastUrlStateRef.current = null;
    };
  }, [showViewer, selectedImageId, updateBrowserUrl]);

  // Clear URL when viewer is closed (but not on initial mount)
  useEffect(() => {
    if (!showViewer && viewerWasOpenRef.current) {
      router.replace("/", { scroll: false });
      viewerWasOpenRef.current = false;
    } else if (showViewer) {
      viewerWasOpenRef.current = true;
    }
  }, [showViewer, router]);

  // Helper function to extract track and image numbers from image ID
  const parseImageId = (id) => {
    // If no id is provided, return default values
    if (!id) return { trackNumber: 0, imageNumber: 0 };

    // For backward compatibility, try to parse from the id directly
    const idMatch = String(id).match(/^(\d+)_(\d+)/);
    if (idMatch) {
      return {
        trackNumber: parseInt(idMatch[1], 10),
        imageNumber: parseInt(idMatch[2], 10),
      };
    }

    return { trackNumber: 0, imageNumber: 0 };
  };

  // Function to fetch feature by ID from API
  const fetchFeatureById = useCallback(async (featureId) => {
    if (!featureId) return null;

    setIsLoadingFeature(true);
    try {
      // Use environment variable for backend URL
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.10.105:8001';

      const response = await fetch(
        `${backendUrl}/api/features/${featureId}`
      );

      if (!response.ok) {
        throw new Error(`API response error: ${response.status}`);
      }

      const featureData = await response.json();
      return featureData;
    } catch (error) {
      console.error(`Failed to fetch feature ${featureId}:`, error);
      return null;
    } finally {
      setIsLoadingFeature(false);
    }
  }, []);

  const handleImageSelect = useCallback((imageData) => {
    console.log("🚀 ~ Home ~ imageData:", imageData);
    // Check if imageData is a string (old behavior - just ID) or an object (new behavior - full properties)
    if (typeof imageData === "string" || typeof imageData === "number") {
      // If it's just the ID (old behavior)
      setSelectedImageId(imageData);
      setSelectedImageData(null);
    } else {
      // If it's the complete image properties object (new behavior)
      setSelectedImageId(imageData.id);
      setSelectedImageData(imageData);
    }
    setShowViewer(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setShowViewer(false);
  }, []);

  const handleNextImage = useCallback(async () => {
    // Only proceed if we have current image data
    if (!selectedImageData || !selectedImageData.id) return;

    // Extract the current image ID to calculate next image ID
    const { trackNumber, imageNumber } = parseImageId(
      selectedImageData.id || selectedImageData.id
    );

    const nextImageNumber = imageNumber + 1;
    const nextImageId = `${trackNumber}_${nextImageNumber}`;

    // Fetch the next image data from API
    const nextImageData = await fetchFeatureById(
      selectedImageData.next_id || nextImageId
    );

    if (nextImageData) {
      // Update state with the fetched image data
      setSelectedImageId(selectedImageData.next_id || nextImageId);
      setSelectedImageData(nextImageData.properties);
    } else {
      // If API call failed, fall back to constructing URLs manually (as before)
      console.warn("Falling back to manual URL construction for next image");

      // Create the base URL based on the current track
      const baseUrl = `http://192.168.10.105:8001/api/r2-proxy/track${trackNumber}/`;

      const fallbackImageData = {
        ...selectedImageData,
        id: selectedImageData.next_id || nextImageId,
        imageUrl_Comp: `${baseUrl}${trackNumber}_${nextImageNumber}_comp.jpg`,
        imageUrl_High: `${baseUrl}${trackNumber}_${nextImageNumber}.jpg`,
        initialYaw: selectedImageData.initialYaw || 0,
        initialPitch: selectedImageData.initialPitch || 0,
        initialHfov: selectedImageData.initialHfov || 100,
        // Maintain the same coordinates for navigation
        longitude_snapped: selectedImageData.longitude_snapped,
        latitude_snapped: selectedImageData.latitude_snapped,
      };

      // Update the state with the constructed image data
      setSelectedImageId(selectedImageData.next_id || nextImageId);
      setSelectedImageData(fallbackImageData);
    }
  }, [selectedImageData, fetchFeatureById, parseImageId]);

  const handlePrevImage = useCallback(async () => {
    // Only proceed if we have current image data
    if (!selectedImageData || !selectedImageData.id) {
      return;
    }

    // Extract the current image number from the ID
    const { trackNumber, imageNumber } = parseImageId(
      selectedImageData.id || selectedImageData.id
    );
    // If we're at image 0, don't go backwards but show some feedback
    if (imageNumber <= 0) {
      // Consider adding a UI notification here
      return;
    }

    // Calculate previous image ID
    const prevImageNumber = imageNumber - 1;
    const prevImageId = `${trackNumber}_${prevImageNumber}`;
    console.log("🚀 ~ Home ~ selectedImageData:", selectedImageData);
    // Fetch the previous image data from API
    const prevImageData = await fetchFeatureById(
      selectedImageData.previous_id || prevImageId
    );

    if (prevImageData) {
      // Update state with the fetched image data
      setSelectedImageId(selectedImageData.previous_id || prevImageId);
      setSelectedImageData(prevImageData.properties);
    } else {
      // If API call failed, fall back to constructing URLs manually
      console.warn(
        "Falling back to manual URL construction for previous image"
      );

      // Create the base URL based on the current track
      const baseUrl = `http://192.168.10.105:8001/api/r2-proxy/track${trackNumber}/`;

      const fallbackImageData = {
        ...selectedImageData,
        id: selectedImageData.previous_id || prevImageId,
        imageUrl_Comp: `${baseUrl}${trackNumber}_${prevImageNumber}_comp.jpg`,
        imageUrl_High: `${baseUrl}${trackNumber}_${prevImageNumber}.jpg`,
        initialYaw: selectedImageData.initialYaw || 0,
        initialPitch: selectedImageData.initialPitch || 0,
        initialHfov: selectedImageData.initialHfov || 100,
        // Maintain the same coordinates for navigation
        longitude_snapped: selectedImageData.longitude_snapped,
        latitude_snapped: selectedImageData.latitude_snapped,
      };

      // Update the state with the constructed image data
      setSelectedImageId(selectedImageData.previous_id || prevImageId);
      setSelectedImageData(fallbackImageData);
    }
  }, [selectedImageData, fetchFeatureById, parseImageId]);

  // Process shared link from URL parameters on mount
  useEffect(() => {
    if (hasProcessedSharedLink.current) return;

    const imageId = searchParams.get("id");
    const yaw = searchParams.get("yaw");
    const pitch = searchParams.get("pitch");
    const hfov = searchParams.get("hfov");

    if (imageId) {
      hasProcessedSharedLink.current = true;

      // Store the view state to apply after image loads
      if (yaw !== null || pitch !== null || hfov !== null) {
        setSharedViewState({
          yaw: yaw ? parseFloat(yaw) : undefined,
          pitch: pitch ? parseFloat(pitch) : undefined,
          hfov: hfov ? parseFloat(hfov) : undefined,
        });
      }

      // Fetch and display the shared image
      fetchFeatureById(imageId).then((featureData) => {
        if (featureData) {
          setSelectedImageId(imageId);
          setSelectedImageData(featureData.properties);
          setShowViewer(true);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Apply shared view state to pannellum when it's ready
  useEffect(() => {
    if (sharedViewState && pannellumInstanceRef.current && showViewer) {
      const timer = setTimeout(() => {
        if (pannellumInstanceRef.current) {
          if (sharedViewState.yaw !== undefined) {
            pannellumInstanceRef.current.setYaw(sharedViewState.yaw);
          }
          if (sharedViewState.pitch !== undefined) {
            pannellumInstanceRef.current.setPitch(sharedViewState.pitch);
          }
          if (sharedViewState.hfov !== undefined) {
            pannellumInstanceRef.current.setHfov(sharedViewState.hfov);
          }
          // Mark that we've initialized the view
          hasInitializedView.current = true;
          // Clear the shared state after applying
          setSharedViewState(null);
        }
      }, 500); // Small delay to ensure pannellum is fully initialized

      return () => clearTimeout(timer);
    }
  }, [sharedViewState, showViewer]);

  // Create a selected image object in the format expected by ImageViewer
  // Now structured to work with both MBTiles data and API responses
  const selectedImage = selectedImageData
    ? {
        properties: selectedImageData,
        geometry: {
          // Use the API response geometry if available, otherwise construct from properties
          coordinates: selectedImageData.geometry?.coordinates || [
            selectedImageData.longitude_snapped ||
              selectedImageData.longitude_original ||
              0,
            selectedImageData.latitude_snapped ||
              selectedImageData.latitude_original ||
              0,
          ],
          type: "Point",
        },
      }
    : null;

  if (isLoading) {
    return (
      <PageLayout title='ThirdEye360' description='Loading ThirdEye360 data...'>
        <div className='flex items-center justify-center h-64'>
          <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title='ThirdEye360' description='Error loading data'>
        <div className='text-red-500 p-4 border border-red-300 rounded-md'>
          <h2 className='text-lg font-semibold mb-2'>Error loading data</h2>
          <p>{error}</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title='ThirdEye360'
      description='Click on any point along the path to view the 360° image at that location. Navigate between images using the previous and next buttons.'
    >
      <div className='border rounded-lg overflow-hidden shadow-lg'>
        <MapComponent
          imageData={{ features: [] }} // Empty features - data comes from MBTiles
          selectedImageId={selectedImageId}
          selectedImageData={selectedImageData} // Pass selectedImageData to MapComponent
          onImageSelect={handleImageSelect}
          refreshData={refreshData}
          isLoading={isLoading}
          selectedImage={selectedImage}
        />
      </div>

      {showViewer && selectedImage && (
        <ImageViewer
          selectedImage={selectedImage}
          images={[]} // No longer using array of images - navigation handled by direct track/image manipulation
          onPrevImage={handlePrevImage}
          onNextImage={handleNextImage}
          onClose={handleCloseViewer}
          onImageSelect={handleImageSelect}
          isLoadingFeature={isLoadingFeature}
          pannellumInstanceRef={pannellumInstanceRef}
          sharedViewState={sharedViewState} // Pass shared view state to ImageViewer
        />
      )}
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <PageLayout title='ThirdEye360' description='Loading...'>
          <div className='flex items-center justify-center h-64'>
            <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
          </div>
        </PageLayout>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
