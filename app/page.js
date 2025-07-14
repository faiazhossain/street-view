"use client";

import { useState, useCallback } from "react";
import PageLayout from "./components/layout/PageLayout";
import MapComponent from "./components/MapComponent";
import ImageViewer from "./components/viewer/ImageViewer";
import { useImageData } from "./data/imageData";

export default function Home() {
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const { imageData, imagePath, isLoading, error, refreshData } =
    useImageData();

  // Helper function to extract track and image numbers from image ID
  const parseImageId = (id) => {
    const match = id.match(/^(\d+)_(\d+)/);
    if (match) {
      return {
        trackNumber: parseInt(match[1], 10),
        imageNumber: parseInt(match[2], 10),
      };
    }
    return { trackNumber: 0, imageNumber: 0 };
  };

  // Helper function to find image by track and image number
  const findImageByTrackAndNumber = (trackNumber, imageNumber) => {
    return imageData.features.find((feature) => {
      const { trackNumber: t, imageNumber: i } = parseImageId(
        feature.properties.id
      );
      return t === trackNumber && i === imageNumber;
    });
  };

  const handleImageSelect = useCallback((imageId) => {
    setSelectedImageId(imageId);
    setShowViewer(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setShowViewer(false);
  }, []);

  const handleNextImage = useCallback(() => {
    if (!selectedImageId || imageData.features.length === 0) return;

    // Parse current image's track and image numbers
    const { trackNumber, imageNumber } = parseImageId(selectedImageId);

    // Try to find the next sequential image number in the same track
    let nextImage = findImageByTrackAndNumber(trackNumber, imageNumber + 1);

    // If no next image in current track, try to find the first image in the next track
    if (!nextImage) {
      // Find all tracks and sort them
      const tracks = Array.from(
        new Set(
          imageData.features.map(
            (feature) => parseImageId(feature.properties.id).trackNumber
          )
        )
      ).sort((a, b) => a - b);

      const currentTrackIndex = tracks.indexOf(trackNumber);

      // If there's a next track
      if (currentTrackIndex < tracks.length - 1) {
        const nextTrackNumber = tracks[currentTrackIndex + 1];

        // Find all images in the next track
        const nextTrackImages = imageData.features.filter((feature) => {
          const { trackNumber: t } = parseImageId(feature.properties.id);
          return t === nextTrackNumber;
        });

        // Sort by image number
        nextTrackImages.sort((a, b) => {
          const imgA = parseImageId(a.properties.id).imageNumber;
          const imgB = parseImageId(b.properties.id).imageNumber;
          return imgA - imgB;
        });

        // Get the first image in the next track
        if (nextTrackImages.length > 0) {
          nextImage = nextTrackImages[0];
        }
      }
    }

    // Update selected image if we found a next one
    if (nextImage) {
      setSelectedImageId(nextImage.properties.id);
    }
  }, [selectedImageId, imageData.features]);

  const handlePrevImage = useCallback(() => {
    if (!selectedImageId || imageData.features.length === 0) return;

    // Parse current image's track and image numbers
    const { trackNumber, imageNumber } = parseImageId(selectedImageId);

    // Try to find the previous sequential image number in the same track
    let prevImage = findImageByTrackAndNumber(trackNumber, imageNumber - 1);

    // If no previous image in current track, try to find the last image in the previous track
    if (!prevImage) {
      // Find all tracks and sort them
      const tracks = Array.from(
        new Set(
          imageData.features.map(
            (feature) => parseImageId(feature.properties.id).trackNumber
          )
        )
      ).sort((a, b) => a - b);

      const currentTrackIndex = tracks.indexOf(trackNumber);

      // If there's a previous track
      if (currentTrackIndex > 0) {
        const prevTrackNumber = tracks[currentTrackIndex - 1];

        // Find all images in the previous track
        const prevTrackImages = imageData.features.filter((feature) => {
          const { trackNumber: t } = parseImageId(feature.properties.id);
          return t === prevTrackNumber;
        });

        // Sort by image number (descending to get highest/last)
        prevTrackImages.sort((a, b) => {
          const imgA = parseImageId(a.properties.id).imageNumber;
          const imgB = parseImageId(b.properties.id).imageNumber;
          return imgB - imgA; // Note: descending order
        });

        // Get the last image in the previous track
        if (prevTrackImages.length > 0) {
          prevImage = prevTrackImages[0];
        }
      }
    }

    // Update selected image if we found a previous one
    if (prevImage) {
      setSelectedImageId(prevImage.properties.id);
    }
  }, [selectedImageId, imageData.features]);

  // Find the selected image object
  const selectedImage = selectedImageId
    ? imageData.features.find(
        (feature) => feature.properties.id === selectedImageId
      )
    : null;

  if (isLoading && imageData.features.length === 0) {
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
              refreshData={refreshData}
              isLoading={isLoading}
            />
          </div>

          {showViewer && selectedImage && (
            <ImageViewer
              selectedImage={selectedImage}
              images={imageData.features}
              imageData={imageData}
              pathData={imagePath}
              onPrevImage={handlePrevImage}
              onNextImage={handleNextImage}
              onClose={handleCloseViewer}
              onImageSelect={handleImageSelect}
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
