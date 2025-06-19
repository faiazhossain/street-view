// Navigation utilities for the ThirdEye360 app

/**
 * Get the next or previous image based on current image ID
 * @param {string} currentId - The current image ID
 * @param {Array} images - Array of image features
 * @param {number} direction - Direction to navigate (1 for next, -1 for previous)
 * @returns {string|null} The ID of the next/previous image or null if none exists
 */
export const getAdjacentImageId = (currentId, images, direction) => {
  const currentIndex = images.findIndex(
    (image) => image.properties.id === currentId
  );

  if (currentIndex === -1) return null;

  const targetIndex = currentIndex + direction;

  if (targetIndex < 0 || targetIndex >= images.length) {
    return null;
  }

  return images[targetIndex].properties.id;
};

/**
 * Set up keyboard navigation for the image viewer
 * @param {function} handlePrev - Function to handle previous image
 * @param {function} handleNext - Function to handle next image
 * @param {function} handleClose - Function to close the viewer
 * @param {boolean} isActive - Whether the viewer is active
 */
export const useKeyboardNavigation = (
  handlePrev,
  handleNext,
  handleClose,
  isActive
) => {
  if (typeof window === "undefined") return;

  const handleKeyDown = (e) => {
    if (!isActive) return;

    switch (e.key) {
      case "ArrowLeft":
        handlePrev();
        break;
      case "ArrowRight":
        handleNext();
        break;
      case "Escape":
        handleClose();
        break;
      default:
        break;
    }
  };

  // Add the event listener
  window.addEventListener("keydown", handleKeyDown);

  // Return a cleanup function
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
};
