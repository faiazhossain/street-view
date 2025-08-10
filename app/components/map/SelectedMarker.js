"use client";

import React from "react";
import { Marker } from "react-map-gl/maplibre";
import { useSelector } from "react-redux";
import { selectViewPosition } from "../../redux/slices/panoramaSlice";

const SelectedMarker = ({ feature, images }) => {
  // Get the saved view position for this image from Redux
  const savedViewPosition = useSelector((state) =>
    selectViewPosition(state, feature.properties.id)
  );

  // Get the current camera yaw (default to 0 if not available)
  const cameraYaw = savedViewPosition?.yaw || 0;

  // Helper function to extract track and image numbers from image ID
  const parseImageId = (feature) => {
    // Get feature_id (new format) or fallback to id (old format)
    const id = feature.properties.feature_id || feature.properties.id;

    if (!id) return { trackNumber: 0, imageNumber: 0 };

    const match = String(id).match(/^(\d+)_(\d+)/);
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
    return images?.find((image) => {
      const { trackNumber: t, imageNumber: i } = parseImageId(image);
      return t === trackNumber && i === imageNumber;
    });
  };

  // Function to calculate bearing between two coordinates
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
  };

  // Find the next image to determine the direction
  const findNextImage = () => {
    if (!images || images.length === 0) return null;

    const { trackNumber, imageNumber } = parseImageId(feature);

    // Try to find the next sequential image number in the same track
    let nextImage = findImageByTrackAndNumber(trackNumber, imageNumber + 1);

    // If no next image in current track, try to find the first image in the next track
    if (!nextImage) {
      const tracks = Array.from(
        new Set(images.map((image) => parseImageId(image).trackNumber))
      ).sort((a, b) => a - b);

      const currentTrackIndex = tracks.indexOf(trackNumber);

      if (currentTrackIndex < tracks.length - 1) {
        const nextTrackNumber = tracks[currentTrackIndex + 1];
        const nextTrackImages = images.filter((image) => {
          const { trackNumber: t } = parseImageId(image);
          return t === nextTrackNumber;
        });

        nextTrackImages.sort((a, b) => {
          const imgA = parseImageId(a).imageNumber;
          const imgB = parseImageId(b).imageNumber;
          return imgA - imgB;
        });

        if (nextTrackImages.length > 0) {
          nextImage = nextTrackImages[0];
        }
      }
    }

    return nextImage;
  };

  // Calculate the direction the arrow should point
  const calculateArrowDirection = () => {
    const nextImage = findNextImage();
    if (!nextImage) return 0; // No next image, point north

    // Get current and next image coordinates
    const currentLat = feature.geometry.coordinates[1];
    const currentLon = feature.geometry.coordinates[0];
    const nextLat = nextImage.geometry.coordinates[1];
    const nextLon = nextImage.geometry.coordinates[0];

    // Calculate bearing from current to next image
    const bearing = calculateBearing(currentLat, currentLon, nextLat, nextLon);

    // When camera yaw is 0°, the arrow should point towards the next image
    // When camera yaw is 180°, the arrow should point away from the next image
    // The arrow direction relative to the camera view
    const arrowDirection = bearing - cameraYaw;

    return arrowDirection;
  };

  const directionRotation = calculateArrowDirection();

  return (
    <Marker
      key={feature.properties.id}
      longitude={feature.geometry.coordinates[0]}
      latitude={feature.geometry.coordinates[1]}
      anchor='bottom'
      pitchAlignment='map'
    >
      <div className='marker selected-marker scale-in'>
        <div className='marker-pin' />

        {/* Directional View Indicator - only show if we have saved position and next image exists */}
        {savedViewPosition && findNextImage() && (
          <div
            className='directional-indicator'
            style={{
              transform: `translate(-50%, -50%) rotate(${directionRotation}deg)`,
            }}
          >
            <div className='direction-arrow' />
          </div>
        )}
      </div>
    </Marker>
  );
};

export default SelectedMarker;
