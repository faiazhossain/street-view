"use client";

import React from "react";

const ViewerFooter = ({ isAutoPlaying, toggleAutoPlay }) => {
  return (
    <div className='glass p-3 flex justify-between items-center text-white text-sm backdrop-blur-md border-t border-white/10'>
      <div className='flex items-center space-x-4'>
        <div className='flex items-center space-x-2 px-3 py-1.5 rounded-lg glass'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-4 w-4 text-blue-400'
            viewBox='0 0 20 20'
            fill='currentColor'
          >
            <path
              fillRule='evenodd'
              d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
              clipRule='evenodd'
            />
          </svg>
          <span>Keyboard controls: ←/→ to navigate | ESC to close</span>
        </div>
      </div>

      <div className='flex items-center space-x-3'>
        <div className='hidden md:flex items-center text-xs glass p-2 text-gray-300'>
          <span>Drag to look around | Scroll to zoom</span>
        </div>

        <button
          onClick={toggleAutoPlay}
          className='flex items-center justify-center px-4 py-2 rounded-lg glass hover:bg-blue-600/70 transition-all duration-300'
        >
          {isAutoPlaying ? (
            <>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-4 w-4 mr-2'
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
              Pause Tour
            </>
          ) : (
            <>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-4 w-4 mr-2'
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
              Auto Tour
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ViewerFooter;
