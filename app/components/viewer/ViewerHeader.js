"use client";

import React from "react";

const ViewerHeader = ({ title, onClose }) => {
  return (
    <div className='flex justify-between items-center p-4 text-white'>
      <h2 className='text-xl font-bold'>{title}</h2>
      <button
        onClick={onClose}
        className='rounded-full bg-red-600 p-2 hover:bg-red-700'
        aria-label='Close viewer'
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6'
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
  );
};

export default ViewerHeader;
