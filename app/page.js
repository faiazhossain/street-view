"use client";

import { useState, useCallback } from "react";
import PageLayout from "./components/layout/PageLayout";
import MapComponent from "./components/MapComponent";
import ImageViewer from "./components/viewer/ImageViewer";
import { imageData, imagePath } from "./data/imageData";

export default function Home() {
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

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
  }, [selectedImageId]);

  const handlePrevImage = useCallback(() => {
    const currentIndex = imageData.features.findIndex(
      (feature) => feature.properties.id === selectedImageId
    );

    if (currentIndex > 0) {
      setSelectedImageId(imageData.features[currentIndex - 1].properties.id);
    }
  }, [selectedImageId]);

  // Find the selected image object
  const selectedImage = selectedImageId
    ? imageData.features.find(
        (feature) => feature.properties.id === selectedImageId
      )
    : null;

  return (
    <PageLayout
      title='Personal Street View'
      description='Click on any point along the path to view the 360° image at that location. Navigate between images using the previous and next buttons.'
    >
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
    </PageLayout>
  );
}
