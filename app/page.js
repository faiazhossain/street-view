"use client";

import { useState, useCallback } from "react";
import PageLayout from "./components/layout/PageLayout";
import MapComponent from "./components/MapComponent";
import ImageViewer from "./components/viewer/ImageViewer";
import { useImageData } from "./data/imageData";

export default function Home() {
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [selectedImageData, setSelectedImageData] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [isLoadingFeature, setIsLoadingFeature] = useState(false);
  const { isLoading, error, refreshData } = useImageData();

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
      const response = await fetch(
        `http://202.72.236.166:8001/api/features/${featureId}`
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
      const baseUrl = `http://202.72.236.166:8001/track${trackNumber}/`;

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
      const baseUrl = `http://202.72.236.166:8001/track${trackNumber}/`;

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
        />
      )}
    </PageLayout>
  );
}
