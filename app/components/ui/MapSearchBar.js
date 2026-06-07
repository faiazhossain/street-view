"use client";

import React, { useState, useEffect, useRef } from "react";

// Use environment variable or default to a placeholder that will be replaced
const API_KEY = process.env.NEXT_PUBLIC_BARIKOI_API_KEY || "api_key";

const MapSearchBar = ({ onLocationSelect, className }) => {
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // Regular expression for matching latitude,longitude format
  const coordRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;

  // Handle clicks outside of the component to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchRef]);

  // Search for places using Barikoi API
  const searchPlaces = async (value) => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }

    // Check if input is direct coordinates (latitude,longitude)
    const coordMatch = value.match(coordRegex);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      setSuggestions([
        {
          id: "coordinates",
          value: `${lat},${lng}`,
          longitude: lng,
          latitude: lat,
          address: `Coordinates: ${lat}, ${lng}`,
          isCoordinate: true,
        },
      ]);
      return;
    }

    // Otherwise search using Barikoi API
    setLoading(true);
    try {
      const response = await fetch(
        `https://barikoi.xyz/v2/api/search/autocomplete/place?api_key=NDE2NzpVNzkyTE5UMUoy&q=${encodeURIComponent(
          value
        )}&sub_area=true&sub_district=true`
      );
      const data = await response.json();

      if (data.status === 200 && data.places && data.places.length > 0) {
        const searchResults = data.places.map((place) => ({
          id: place.id,
          value: place.address,
          longitude: place.longitude,
          latitude: place.latitude,
          address: place.address,
          area: place.area,
          city: place.city,
        }));
        setSuggestions(searchResults);
      } else {
        setSuggestions([
          { id: "no-results", value: "No results found", disabled: true },
        ]);
      }
    } catch (error) {
      console.error("Error searching places:", error);
      setSuggestions([
        { id: "error", value: "Error searching places", disabled: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    searchPlaces(value);
    setShowSuggestions(true);
  };

  // Handle selection of a place or coordinate
  const handleSelect = (suggestion) => {
    if (suggestion && !suggestion.disabled) {
      // Format coordinates to 6 decimal places for precision
      const formattedLocation = {
        longitude: parseFloat(suggestion.longitude).toFixed(6),
        latitude: parseFloat(suggestion.latitude).toFixed(6),
        address: suggestion.address,
        area: suggestion.area,
        city: suggestion.city,
        // Add showPin flag to indicate this location should be pinned on the map
        showPin: true,
      };

      onLocationSelect(formattedLocation);

      // Keep the selected value in the input
      setSearchValue(suggestion.address || suggestion.value);
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={searchRef} className={`relative w-full ${className || ""}`}>
      {/* Search Input with Tailwind styling */}
      <div className='relative'>
        <div className='absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none'>
          <svg
            className='w-4 h-4 text-blue-500'
            aria-hidden='true'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 20 20'
          >
            <path
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z'
            />
          </svg>
        </div>
        <input
          type='search'
          className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-2xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 pl-8'
          placeholder='Search for a place or enter coordinates (lat,lng)'
          value={searchValue}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
        />
      </div>

      {/* Dropdown with suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className='absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden'>
          <ul className='max-h-60 overflow-y-auto py-2'>
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                className={`px-4 py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 
                          transition-colors duration-150 ease-in-out
                          ${
                            suggestion.disabled
                              ? "opacity-60 cursor-not-allowed"
                              : ""
                          }`}
                onClick={() => !suggestion.disabled && handleSelect(suggestion)}
              >
                {suggestion.isCoordinate ? (
                  <div className='flex items-center'>
                    <span className='inline-flex items-center justify-center w-8 h-8 me-2 rounded-full bg-blue-100 dark:bg-blue-900'>
                      <svg
                        className='w-4 h-4 text-blue-600 dark:text-blue-300'
                        aria-hidden='true'
                        xmlns='http://www.w3.org/2000/svg'
                        fill='currentColor'
                        viewBox='0 0 16 20'
                      >
                        <path d='M8 0a8 8 0 0 0-8 8c0 1.8.6 3.5 1.7 5 1.5 2 6.3 7 6.3 7s4.8-5 6.3-7a7.9 7.9 0 0 0 1.7-5 8 8 0 0 0-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z' />
                      </svg>
                    </span>
                    <span className='font-medium text-gray-800 dark:text-gray-200'>
                      Go to coordinates: {suggestion.latitude},{" "}
                      {suggestion.longitude}
                    </span>
                  </div>
                ) : suggestion.disabled ? (
                  <div className='text-gray-500 dark:text-gray-400'>
                    {suggestion.value}
                  </div>
                ) : (
                  <div>
                    <div className='font-medium text-gray-800 dark:text-gray-200'>
                      {suggestion.address}
                    </div>
                    {suggestion.area && (
                      <div className='text-sm text-gray-500 dark:text-gray-400'>
                        {suggestion.area}
                        {suggestion.city ? `, ${suggestion.city}` : ""}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MapSearchBar;
