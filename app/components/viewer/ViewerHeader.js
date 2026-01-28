"use client";

import React, { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import {
  toggleControlsVisibility,
  selectShowControls,
} from "../../redux/slices/uiControlsSlice";
import { TbSunFilled } from "react-icons/tb";
import { FaTimes, FaShareAlt } from "react-icons/fa";
import toast from "react-hot-toast";

const ViewerHeader = ({ title, subtitle, onClose, selectedImage, onShare }) => {
  const { darkMode, toggleDarkMode } = useTheme();
  const dispatch = useDispatch();
  const showControls = useSelector(selectShowControls);
  const [isSharing, setIsSharing] = useState(false);

  const handleToggleControls = () => {
    dispatch(toggleControlsVisibility());
  };

  const handleShare = async () => {
    if (isSharing || !onShare) return;

    setIsSharing(true);
    try {
      await onShare();
    } finally {
      setIsSharing(false);
    }
  };

  // Generate a display subtitle based on the selected image if available
  const displaySubtitle = () => {
    if (!selectedImage) return subtitle;

    // Use id (new format) or fall back to id (old format)
    const displayId =
      selectedImage.properties.id || selectedImage.properties.id;

    return `Image: ${displayId}`;
  };

  if (!showControls) return null;

  return (
    <div className='flex justify-between items-center p-4 text-white glass border-b border-white/10 backdrop-blur-md'>
      <div className='flex flex-col'>
        <h2 className='text-xl font-bold gradient-text'>{title}</h2>
        {(subtitle || selectedImage) && (
          <p className='text-gray-300 text-sm'>{displaySubtitle()}</p>
        )}
      </div>
      <div className='flex items-center space-x-4'>
        {/* Clean UI Toggle Button */}
        <button
          onClick={handleToggleControls}
          className='flex items-center justify-center p-2.5 rounded-full glass hover:bg-gray-700/70 transition-colors'
          aria-label={showControls ? "Hide UI controls" : "Show UI controls"}
          title={showControls ? "Hide UI controls" : "Show UI controls"}
        >
          {showControls ? (
            // Icon for when controls are shown - eye open
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5 text-yellow-400'
              viewBox='0 0 20 20'
              fill='currentColor'
            >
              <path d='M10 12a2 2 0 100-4 2 2 0 000 4z' />
              <path
                fillRule='evenodd'
                d='M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z'
                clipRule='evenodd'
              />
            </svg>
          ) : (
            // Icon for when controls are hidden - eye closed
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5 text-gray-400'
              viewBox='0 0 20 20'
              fill='currentColor'
            >
              <path
                fillRule='evenodd'
                d='M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z'
                clipRule='evenodd'
              />
              <path d='M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z' />
            </svg>
          )}
        </button>

        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleDarkMode}
          className='flex items-center justify-center p-2.5 rounded-full glass hover:bg-gray-700/70 transition-colors'
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? (
            // Sun icon for light mode
            <div className='flex items-center justify-center text-yellow-300 text-xl'>
              <TbSunFilled />
            </div>
          ) : (
            // Moon icon for dark mode
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5 text-blue-200'
              viewBox='0 0 20 20'
              fill='currentColor'
            >
              <path d='M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z' />
            </svg>
          )}
        </button>

        {/* Share Button */}
        {onShare && (
          <button
            onClick={handleShare}
            disabled={isSharing}
            className={`glass text-white hover:bg-white/20 rounded-full p-2.5 shadow-md transition-all duration-200 ${
              isSharing ? "opacity-50 cursor-not-allowed" : "hover:scale-110"
            }`}
            title='Share this view'
            aria-label='Share'
          >
            {isSharing ? (
              <svg
                className='animate-spin h-5 w-5'
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                ></circle>
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                ></path>
              </svg>
            ) : (
              <FaShareAlt className='text-xl' />
            )}
          </button>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className='rounded-full glass bg-red-600/80 hover:bg-red-700 p-2.5 transition-all duration-300 hover:scale-110'
          aria-label='Close viewer'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ViewerHeader;
