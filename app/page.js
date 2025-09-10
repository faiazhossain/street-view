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

  const handleNextImage = useCallback(() => {
    // If we have selectedImageData (direct URLs from map click), handle navigation differently
    if (selectedImageData) {
      // Extract the current track and image number from the ID
      const { trackNumber, imageNumber } = parseImageId(selectedImageData.id);

      // Create the next image data with updated URLs and ID
      const nextImageNumber = imageNumber + 1;
      const nextImageId = `${trackNumber}_${nextImageNumber}`;

      // Create the base URL based on the current track
      const baseUrl = `http://202.72.236.166:8001/track${trackNumber}/`;

      const nextImageData = {
        ...selectedImageData,
        id: nextImageId,
        imageUrl_Comp: `${baseUrl}${trackNumber}_${nextImageNumber}_comp.jpg`,
        imageUrl_High: `${baseUrl}${trackNumber}_${nextImageNumber}.jpg`,
        initialYaw: selectedImageData.initialYaw || 0,
        initialPitch: selectedImageData.initialPitch || 0,
        initialHfov: selectedImageData.initialHfov || 100,
        // Maintain the same coordinates or slightly offset them to simulate movement
        longitude_snapped: selectedImageData.longitude_snapped,
        latitude_snapped: selectedImageData.latitude_snapped,
      };

      // Update the state with the new image data
      setSelectedImageId(nextImageData.id);
      setSelectedImageData(nextImageData);
    }
  }, [selectedImageData]);

  const handlePrevImage = useCallback(() => {
    // If we have selectedImageData (direct URLs from map click), handle navigation differently
    if (selectedImageData) {
      // Extract the current track and image number from the ID
      const { trackNumber, imageNumber } = parseImageId(selectedImageData.id);

      // If we're at image 0, don't go backwards
      if (imageNumber <= 0) return;

      // Create the previous image data with updated URLs and ID
      const prevImageNumber = imageNumber - 1;
      const prevImageId = `${trackNumber}_${prevImageNumber}`;

      // Create the base URL based on the current track
      const baseUrl = `http://202.72.236.166:8001/track${trackNumber}/`;

      const prevImageData = {
        ...selectedImageData,
        id: prevImageId,
        imageUrl_Comp: `${baseUrl}${trackNumber}_${prevImageNumber}_comp.jpg`,
        imageUrl_High: `${baseUrl}${trackNumber}_${prevImageNumber}.jpg`,
        initialYaw: selectedImageData.initialYaw || 0,
        initialPitch: selectedImageData.initialPitch || 0,
        initialHfov: selectedImageData.initialHfov || 100,
        // Maintain the same coordinates or slightly offset them to simulate movement
        longitude_snapped: selectedImageData.longitude_snapped,
        latitude_snapped: selectedImageData.latitude_snapped,
      };

      // Update the state with the new image data
      setSelectedImageId(prevImageData.id);
      setSelectedImageData(prevImageData);
    }
  }, [selectedImageData]);

  // Create a selected image object in the format expected by ImageViewer
  // Now properly structured to work with data from MBTiles
  const selectedImage = selectedImageData
    ? {
        properties: selectedImageData,
        geometry: {
          coordinates: [
            selectedImageData.longitude_snapped || 0,
            selectedImageData.latitude_snapped || 0,
          ],
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
          onImageSelect={handleImageSelect}
          refreshData={refreshData}
          isLoading={isLoading}
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
        />
      )}
    </PageLayout>
  );
}
