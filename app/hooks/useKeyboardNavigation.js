"use client";

import { useEffect } from "react";

/**
 * Custom hook to handle keyboard navigation for the ThirdEye360 images
 *
 * @param {Object} options - Navigation options
 * @param {Function} options.onPrev - Function to call when navigating to previous image
 * @param {Function} options.onNext - Function to call when navigating to next image
 * @param {Function} options.onClose - Function to call when closing the viewer
 * @param {boolean} options.isActive - Whether keyboard navigation is active
 */
export const useKeyboardNavigation = ({
  onPrev,
  onNext,
  onClose,
  isActive = true,
}) => {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event) => {
      switch (event.key) {
        case "ArrowLeft":
          onPrev && onPrev();
          break;
        case "ArrowRight":
          onNext && onNext();
          break;
        case "Escape":
          onClose && onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onPrev, onNext, onClose, isActive]);
};
