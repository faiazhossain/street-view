import { createSlice } from "@reduxjs/toolkit";

/**
 * Slice for managing panorama viewer state
 * Stores view positions (yaw, pitch, hfov) for each image
 */
const panoramaSlice = createSlice({
  name: "panorama",
  initialState: {
    // Store view positions for each image ID
    viewPositions: {},
  },
  reducers: {
    // Save the view position for a specific image
    saveViewPosition: (state, action) => {
      const { imageId, position } = action.payload;
      state.viewPositions[imageId] = position;
    },
    // Reset all stored view positions
    resetViewPositions: (state) => {
      state.viewPositions = {};
    },
  },
});

export const { saveViewPosition, resetViewPositions } = panoramaSlice.actions;

// Selectors
export const selectViewPosition = (state, imageId) =>
  state.panorama.viewPositions[imageId] || null;

export default panoramaSlice.reducer;
