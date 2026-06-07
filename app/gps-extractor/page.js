'use client';

import { useState } from 'react';

// Function to call the server action
async function extractAndUpdateImageData() {
  try {
    // Dynamically import the server action
    const { updateImageDataFile } = await import('../utils/updateImageData.js');
    const result = await updateImageDataFile();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in extractAndUpdateImageData:', error);
    return { success: false, error: error.message };
  }
}

export default function GpsExtractor() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleExtractGps = async () => {
    setLoading(true);
    try {
      const extractionResult = await extractAndUpdateImageData();
      setResult(extractionResult);
    } catch (error) {
      setResult({
        success: false,
        error: error.message || 'An error occurred during GPS extraction',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='max-w-3xl mx-auto p-6'>
      <h1 className='text-2xl font-bold mb-6'>GPS Data Extractor</h1>

      <div className='mb-6'>
        <p className='mb-4'>
          This utility will extract GPS coordinates from all images in the
          <code className='px-2 py-1 bg-gray-100 rounded font-mono'>
            public/street-view
          </code>
          directory and update the{' '}
          <code className='px-2 py-1 bg-gray-100 rounded font-mono'>
            imageData.js
          </code>{' '}
          file.
        </p>

        <button
          onClick={handleExtractGps}
          disabled={loading}
          className={`px-4 py-2 bg-blue-600 text-white rounded ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
        >
          {loading ? 'Extracting GPS Data...' : 'Extract GPS Data'}
        </button>
      </div>

      {result && (
        <div
          className={`p-4 rounded ${
            result.success ? 'bg-green-100' : 'bg-red-100'
          } mt-4`}
        >
          <h3 className='font-bold mb-2'>
            {result.success ? 'Success!' : 'Error'}
          </h3>

          {result.success ? (
            <div>
              <p>Successfully extracted GPS data from images.</p>
              <p className='mt-2'>
                The{' '}
                <code className='px-1 bg-gray-100 rounded font-mono'>
                  imageData.js
                </code>{' '}
                file has been updated.
              </p>
              {result.data && (
                <div className='mt-4'>
                  <p>
                    Found coordinates for{' '}
                    {result.data.imageCollection?.features?.length || 0} images.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
