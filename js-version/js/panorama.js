// This file handles the panorama viewer functionality
let panoramaViewer = null;
let isAutoPlaying = false;
let autoPlayTimer = null;
let viewPositions = {}; // Store view positions for each image

// Initialize the panorama viewer
function initializePanorama(imageId) {
  const selectedImage = imageData.features.find(
    (feature) => feature.properties.id === imageId
  );

  if (!selectedImage) return;

  const viewerContainer = document.getElementById("panorama-viewer");
  if (!viewerContainer) return;

  // Get the saved view position if available
  const savedPosition = viewPositions[imageId] || {
    yaw: selectedImage.properties.initialYaw || 0,
    pitch: selectedImage.properties.initialPitch || 0,
    hfov: selectedImage.properties.initialHfov || 100,
  };

  // Create the panorama viewer
  panoramaViewer = pannellum.viewer("panorama-viewer", {
    type: "equirectangular",
    panorama: selectedImage.properties.imageUrl,
    autoLoad: true,
    showControls: true,
    showZoomCtrl: true,
    showFullscreenCtrl: false,
    compass: selectedImage.properties.showCompass || false,
    yaw: savedPosition.yaw,
    pitch: savedPosition.pitch,
    hfov: savedPosition.hfov,
    autoRotate: 0, // Not rotating by default
    sceneFadeDuration: 1000,
  });

  // Set the viewer title
  document.getElementById(
    "viewer-title"
  ).textContent = `Location: ${selectedImage.properties.id}`;

  // Add event listener to save view position
  panoramaViewer.on("mouseup", saveViewPosition);
  panoramaViewer.on("touchend", saveViewPosition);
}

// Save the current view position
function saveViewPosition() {
  if (!panoramaViewer || !selectedImageId) return;

  try {
    const position = {
      yaw: panoramaViewer.getYaw(),
      pitch: panoramaViewer.getPitch(),
      hfov: panoramaViewer.getHfov(),
    };

    // Save position if it's different enough from the current saved position
    const savedPosition = viewPositions[selectedImageId];
    if (
      !savedPosition ||
      Math.abs(savedPosition.yaw - position.yaw) > 1 ||
      Math.abs(savedPosition.pitch - position.pitch) > 1 ||
      Math.abs(savedPosition.hfov - position.hfov) > 1
    ) {
      viewPositions[selectedImageId] = position;
    }
  } catch (error) {
    console.error("Error saving view position:", error);
  }
}

// Handle autoplay functionality
function toggleAutoPlay() {
  isAutoPlaying = !isAutoPlaying;

  // Update button text
  const autoplayText = document.getElementById("autoplay-text");
  autoplayText.textContent = isAutoPlaying ? "Pause" : "Auto Play";

  if (isAutoPlaying) {
    // Start auto-rotation
    if (panoramaViewer) {
      panoramaViewer.setAutoRotate(2);
    }

    // Setup timer to move to next image
    autoPlayTimer = setTimeout(() => {
      handleNextImage();
    }, 10000); // Move to next image after 10 seconds
  } else {
    // Stop auto-rotation
    if (panoramaViewer) {
      panoramaViewer.setAutoRotate(0);
    }

    // Clear the timer
    if (autoPlayTimer) {
      clearTimeout(autoPlayTimer);
      autoPlayTimer = null;
    }
  }
}

// Destroy the panorama viewer
function destroyPanorama() {
  if (panoramaViewer) {
    // Save the current view position before destroying
    saveViewPosition();

    // Stop auto play if active
    if (isAutoPlaying) {
      toggleAutoPlay();
    }

    panoramaViewer.destroy();
    panoramaViewer = null;
  }
}
