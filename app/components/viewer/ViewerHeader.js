"use client";

import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { TbSunFilled } from "react-icons/tb";
const ViewerHeader = ({ title, onClose }) => {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className='flex justify-between items-center p-4 text-white glass border-b border-white/10 backdrop-blur-md'>
      <h2 className='text-xl font-bold gradient-text'>{title}</h2>
      <div className='flex items-center space-x-4'>
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
