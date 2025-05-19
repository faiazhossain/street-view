// Main application file to initialize and coordinate components
let viewerContainer;
let showViewer = false;

// Initialize the application when data is loaded
function initializeApp() {
  if (!imageData) {
    console.error("Image data not loaded");
    return;
  }

  // Initialize the map
  initializeMap();

  // Get DOM elements
  viewerContainer = document.getElementById("viewer-container");
  const closeButton = document.getElementById("close-viewer");
  const prevButton = document.getElementById("prev-image");
  const nextButton = document.getElementById("next-image");
  const autoplayButton = document.getElementById("toggle-autoplay");

  // Add event listeners
  closeButton.addEventListener("click", handleCloseViewer);
  prevButton.addEventListener("click", handlePrevImage);
  nextButton.addEventListener("click", handleNextImage);
  autoplayButton.addEventListener("click", toggleAutoPlay);

  // Add keyboard event listeners
  document.addEventListener("keydown", handleKeyDown);
}

// Handle image selection
function handleImageSelect(imageId) {
  selectedImageId = imageId;
  showViewer = true;

  // Show the viewer container
  viewerContainer.classList.remove("hidden");

  // Update the selected marker on the map
  updateSelectedMarker();

  // Initialize the panorama viewer
  initializePanorama(imageId);
}

// Handle closing the viewer
function handleCloseViewer() {
  if (!showViewer) return;

  // Destroy the panorama viewer
  destroyPanorama();

  // Hide the viewer container
  viewerContainer.classList.add("hidden");
  showViewer = false;
}

// Handle navigation to previous image
function handlePrevImage() {
  if (!selectedImageId) return;

  const currentIndex = imageData.features.findIndex(
    (feature) => feature.properties.id === selectedImageId
  );

  if (currentIndex > 0) {
    // Save the current view position
    saveViewPosition();

    // Navigate to the previous image
    const prevId = imageData.features[currentIndex - 1].properties.id;
    selectedImageId = prevId;

    // Update the selected marker
    updateSelectedMarker();

    // Reinitialize the panorama viewer
    destroyPanorama();
    initializePanorama(prevId);

    // Restart autoplay timer if active
    if (isAutoPlaying) {
      if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
      }
      autoPlayTimer = setTimeout(() => {
        handleNextImage();
      }, 10000);
    }
  }
}

// Handle navigation to next image
function handleNextImage() {
  if (!selectedImageId) return;

  const currentIndex = imageData.features.findIndex(
    (feature) => feature.properties.id === selectedImageId
  );

  if (currentIndex < imageData.features.length - 1) {
    // Save the current view position
    saveViewPosition();

    // Navigate to the next image
    const nextId = imageData.features[currentIndex + 1].properties.id;
    selectedImageId = nextId;

    // Update the selected marker
    updateSelectedMarker();

    // Reinitialize the panorama viewer
    destroyPanorama();
    initializePanorama(nextId);

    // Restart autoplay timer if active
    if (isAutoPlaying) {
      if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
      }
      autoPlayTimer = setTimeout(() => {
        handleNextImage();
      }, 10000);
    }
  } else if (isAutoPlaying) {
    // If we're at the last image and autoplay is on, go back to the first image
    const firstId = imageData.features[0].properties.id;
    selectedImageId = firstId;
    updateSelectedMarker();
    destroyPanorama();
    initializePanorama(firstId);

    // Restart timer
    if (autoPlayTimer) {
      clearTimeout(autoPlayTimer);
    }
    autoPlayTimer = setTimeout(() => {
      handleNextImage();
    }, 10000);
  }
}

// Handle keyboard navigation
function handleKeyDown(event) {
  if (!showViewer) return;

  switch (event.key) {
    case "ArrowLeft":
      handlePrevImage();
      break;
    case "ArrowRight":
      handleNextImage();
      break;
    case "Escape":
      handleCloseViewer();
      break;
  }
}
