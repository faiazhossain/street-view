"use client";

import React from "react";
import {
  MdClose,
  MdLocationOn,
  MdLanguage,
  MdCheck,
  MdWarning,
} from "react-icons/md";

const PoiModal = ({ poi, isOpen, onClose }) => {
  if (!isOpen || !poi) return null;

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return "text-green-500";
    if (confidence >= 0.7) return "text-yellow-500";
    return "text-red-500";
  };

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 0.9) return <MdCheck className='text-green-500' />;
    if (confidence >= 0.7) return <MdWarning className='text-yellow-500' />;
    return <MdWarning className='text-red-500' />;
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white dark:bg-gray-800 rounded-xl w-full max-w-md mx-4 overflow-hidden shadow-xl transform transition-all'>
        {/* Header with image */}
        <div className='relative'>
          {poi.image_url && (
            <img
              src={poi.image_url}
              alt={poi.text}
              className='w-full h-48 object-cover'
            />
          )}
          <button
            onClick={onClose}
            className='absolute top-2 right-2 p-1 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-colors'
            aria-label='Close'
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className='p-4'>
          <h2 className='text-xl font-bold mb-2'>{poi.text}</h2>

          <div className='grid grid-cols-2 gap-2 mb-4'>
            <div className='flex items-center space-x-2'>
              <MdLocationOn className='text-blue-600' />
              <span className='text-gray-700 dark:text-gray-300'>
                {poi.type}
              </span>
            </div>
            <div className='flex items-center space-x-2'>
              <MdLanguage className='text-blue-600' />
              <span className='text-gray-700 dark:text-gray-300'>
                {poi.language}
              </span>
            </div>
          </div>

          <div className='bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4'>
            <h3 className='font-semibold mb-1'>Location Details</h3>
            <p className='text-sm text-gray-700 dark:text-gray-300'>
              {poi.location}
            </p>
            <div className='mt-2 grid grid-cols-2 gap-2 text-sm'>
              <div>
                <span className='text-gray-500 dark:text-gray-400'>
                  Latitude:{" "}
                </span>
                <span className='font-mono'>{poi.latitude.toFixed(6)}</span>
              </div>
              <div>
                <span className='text-gray-500 dark:text-gray-400'>
                  Longitude:{" "}
                </span>
                <span className='font-mono'>{poi.longitude.toFixed(6)}</span>
              </div>
            </div>
          </div>

          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <span className='text-gray-600 dark:text-gray-400'>
                Confidence:
              </span>
              <div className='flex items-center'>
                {getConfidenceIcon(poi.confidence)}
                <span className={`ml-1 ${getConfidenceColor(poi.confidence)}`}>
                  {Math.round(poi.confidence * 100)}%
                </span>
              </div>
            </div>
            <div className='text-sm text-gray-500'>ID: {poi.id}</div>
          </div>

          {poi.distance_meters > 0 && (
            <div className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
              Distance: {poi.distance_meters} meters
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='bg-gray-100 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse'>
          <button
            type='button'
            className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm'
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PoiModal;
