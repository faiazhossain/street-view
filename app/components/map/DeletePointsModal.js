"use client";

import React, { useState, useEffect } from "react";
import { MdClose, MdDelete, MdWarning, MdCheck } from "react-icons/md";
import { FaTrashAlt, FaLock } from "react-icons/fa";

const DeletePointsModal = ({
  isOpen,
  onClose,
  selectedPoints,
  onDeleteConfirm,
  isDeleting = false,
}) => {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [step, setStep] = useState("pin"); // "pin" or "confirm"
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setPinError("");
      setStep("pin");
      setShowSuccess(false);
    }
  }, [isOpen]);

  const handlePinSubmit = () => {
    if (pin !== "2017") {
      setPinError("Incorrect PIN. Access denied.");
      setPin("");
      return;
    }
    setPinError("");
    setStep("confirm");
  };

  const handleConfirmDelete = () => {
    onDeleteConfirm(selectedPoints.map((point) => point.id));
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && step === "pin") {
      handlePinSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white dark:bg-gray-800 rounded-xl w-full max-w-md mx-4 overflow-hidden shadow-xl transform transition-all'>
        {/* Header */}
        <div className='relative bg-red-600 text-white p-4'>
          <div className='flex items-center space-x-3'>
            <FaTrashAlt className='text-2xl' />
            <div>
              <h2 className='text-xl font-bold'>Delete Street View Points</h2>
              <p className='text-red-100 text-sm'>
                {selectedPoints.length} point
                {selectedPoints.length > 1 ? "s" : ""} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='absolute top-4 right-4 p-1 rounded-full hover:bg-red-700 transition-colors'
            aria-label='Close'
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className='p-6'>
          {step === "pin" && (
            <div className='space-y-4'>
              <div className='text-center'>
                <FaLock className='mx-auto text-4xl text-gray-400 mb-4' />
                <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2'>
                  Enter Security PIN
                </h3>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  Please enter the security PIN to proceed with deletion
                </p>
              </div>

              <div>
                <input
                  type='password'
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder='Enter PIN'
                  className='w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white'
                  maxLength='4'
                  autoFocus
                />
                {pinError && (
                  <div className='mt-2 flex items-center text-red-600 text-sm'>
                    <MdWarning className='mr-1' />
                    {pinError}
                  </div>
                )}
              </div>

              <div className='flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={onClose}
                  className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handlePinSubmit}
                  disabled={pin.length < 4}
                  className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  Verify PIN
                </button>
              </div>
            </div>
          )}

          {step === "confirm" && !showSuccess && (
            <div className='space-y-4'>
              <div className='text-center'>
                <MdWarning className='mx-auto text-4xl text-yellow-500 mb-4' />
                <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2'>
                  Confirm Deletion
                </h3>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
                  Are you sure you want to delete the following{" "}
                  {selectedPoints.length} point
                  {selectedPoints.length > 1 ? "s" : ""}? This action cannot be
                  undone.
                </p>
              </div>

              {/* Selected Points List */}
              <div className='max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3'>
                {selectedPoints.map((point, index) => (
                  <div
                    key={point.id}
                    className='flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0'
                  >
                    <div>
                      <p className='font-medium text-gray-800 dark:text-gray-200'>
                        ID: {point.id}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {point.latitude?.toFixed(6)},{" "}
                        {point.longitude?.toFixed(6)}
                      </p>
                    </div>
                    <MdDelete className='text-red-500' />
                  </div>
                ))}
              </div>

              <div className='flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={() => setStep("pin")}
                  className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                >
                  Back
                </button>
                <button
                  type='button'
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center'
                >
                  {isDeleting ? (
                    <>
                      <svg
                        className='animate-spin -ml-1 mr-3 h-4 w-4 text-white'
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
                      Deleting...
                    </>
                  ) : (
                    <>
                      <MdDelete className='mr-2' />
                      Delete {selectedPoints.length} Point
                      {selectedPoints.length > 1 ? "s" : ""}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {showSuccess && (
            <div className='text-center space-y-4'>
              <MdCheck className='mx-auto text-6xl text-green-500' />
              <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200'>
                Points Deleted Successfully
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                {selectedPoints.length} point
                {selectedPoints.length > 1 ? "s have" : " has"} been removed
                from the system.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeletePointsModal;
