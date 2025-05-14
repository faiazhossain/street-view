"use client";

import React from "react";

const ViewerFooter = ({ isAutoPlaying, toggleAutoPlay }) => {
  return (
    <div className='p-2 flex justify-between items-center text-white text-sm bg-gray-800'>
      <div className='flex-grow text-center'>
        Click hotspots to move | Press ESC to close | Drag to look around |
        Scroll to zoom
      </div>

      <button
        onClick={toggleAutoPlay}
        className='flex items-center justify-center px-3 py-1 ml-4 rounded bg-blue-600 hover:bg-blue-700 transition-colors'
      >
        {isAutoPlaying ? (
          <>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-4 w-4 mr-1'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <rect
                x='6'
                y='4'
                width='4'
                height='16'
                rx='1'
                ry='1'
                fill='currentColor'
              />
              <rect
                x='14'
                y='4'
                width='4'
                height='16'
                rx='1'
                ry='1'
                fill='currentColor'
              />
            </svg>
            Pause
          </>
        ) : (
          <>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-4 w-4 mr-1'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 3l14 9-14 9V3z'
                fill='currentColor'
              />
            </svg>
            Resume
          </>
        )}
      </button>
    </div>
  );
};

export default ViewerFooter;
