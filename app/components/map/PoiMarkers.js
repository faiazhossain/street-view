"use client";

import React, { useState } from "react";
import { Marker, Popup } from "react-map-gl/maplibre";
import { MdLocationOn } from "react-icons/md";
import PoiModal from "./PoiModal";

const PoiMarkers = ({ pois, hoveredPoiId }) => {
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPopup, setShowPopup] = useState(null);

  // Handler for when a POI marker is clicked
  const handlePoiClick = (poi) => {
    setSelectedPoi(poi);
    setShowModal(true);
    setShowPopup(null); // Hide any open popup
  };

  // Close the modal
  const closeModal = () => {
    setShowModal(false);
  };

  // POI type to color mapping
  const getPoiColor = (poiType) => {
    const typeMap = {
      Restaurant: "#FF5733", // Red-orange
      Cafe: "#C70039", // Darker red
      Bank: "#3498DB", // Blue
      "Retail Store": "#2ECC71", // Green
      Hospital: "#E74C3C", // Red
      Pharmacy: "#9B59B6", // Purple
      School: "#F1C40F", // Yellow
      Office: "#34495E", // Dark blue
      Hotel: "#16A085", // Teal
      ATM: "#2980B9", // Blue
    };

    return typeMap[poiType] || "#FF9800"; // Default orange if type not in map
  };

  return (
    <>
      {pois &&
        pois.map((poi) => (
          <React.Fragment key={poi.id}>
            <Marker
              longitude={poi.longitude}
              latitude={poi.latitude}
              anchor='bottom'
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                if (showPopup === poi.id) {
                  handlePoiClick(poi);
                } else {
                  setShowPopup(poi.id);
                }
              }}
            >
              <MdLocationOn
                size={hoveredPoiId === poi.id ? 32 : 24}
                color={getPoiColor(poi.type)}
                className={`cursor-pointer transition-all drop-shadow-lg 
                ${
                  hoveredPoiId === poi.id
                    ? "scale-125 drop-shadow-xl"
                    : "hover:scale-110"
                }`}
              />
            </Marker>

            {/* Show a small popup with basic info */}
            {showPopup === poi.id && (
              <Popup
                longitude={poi.longitude}
                latitude={poi.latitude}
                anchor='top'
                closeButton={true}
                closeOnClick={false}
                onClose={() => setShowPopup(null)}
                className='poi-popup z-20'
                maxWidth='200px'
              >
                <div className='p-1'>
                  <p className='text-sm font-semibold'>{poi.text}</p>
                  <p className='text-xs text-gray-600'>{poi.type}</p>
                  <button
                    className='text-xs text-blue-600 hover:text-blue-800 mt-1'
                    onClick={() => handlePoiClick(poi)}
                  >
                    More details
                  </button>
                </div>
              </Popup>
            )}
          </React.Fragment>
        ))}

      {/* POI Modal */}
      {selectedPoi && (
        <PoiModal poi={selectedPoi} isOpen={showModal} onClose={closeModal} />
      )}
    </>
  );
};

export default PoiMarkers;
