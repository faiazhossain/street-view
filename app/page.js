"use client";

import { useState, useCallback } from "react";
import PageLayout from "./components/layout/PageLayout";
import MapComponent from "./components/MapComponent";
import ImageViewer from "./components/viewer/ImageViewer";
import { useImageData } from "./data/imageData";

export default function Home() {
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const { imageData, imagePath, isLoading, error } = useImageData();

  const handleImageSelect = useCallback((imageId) => {
    setSelectedImageId(imageId);
    setShowViewer(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setShowViewer(false);
  }, []);

  const handleNextImage = useCallback(() => {
    const currentIndex = imageData.features.findIndex(
      (feature) => feature.properties.id === selectedImageId
    );

    if (currentIndex < imageData.features.length - 1) {
      setSelectedImageId(imageData.features[currentIndex + 1].properties.id);
    }
  }, [selectedImageId, imageData.features]);

  const handlePrevImage = useCallback(() => {
    const currentIndex = imageData.features.findIndex(
      (feature) => feature.properties.id === selectedImageId
    );

    if (currentIndex > 0) {
      setSelectedImageId(imageData.features[currentIndex - 1].properties.id);
    }
  }, [selectedImageId, imageData.features]);

  // Find the selected image object
  const selectedImage = selectedImageId
    ? imageData.features.find(
        (feature) => feature.properties.id === selectedImageId
      )
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
      {imageData.features.length > 0 ? (
        <>
          <div className='border rounded-lg overflow-hidden shadow-lg'>
            <MapComponent
              imageData={imageData}
              pathData={imagePath}
              selectedImageId={selectedImageId}
              onImageSelect={handleImageSelect}
            />
          </div>

          {showViewer && selectedImage && (
            <ImageViewer
              selectedImage={selectedImage}
              images={imageData.features}
              onPrevImage={handlePrevImage}
              onNextImage={handleNextImage}
              onClose={handleCloseViewer}
            />
          )}
        </>
      ) : (
        <div className='p-4 border border-yellow-300 bg-yellow-50 rounded-md'>
          <p>No image data available. Please check your API connection.</p>
        </div>
      )}
    </PageLayout>
  );
}
