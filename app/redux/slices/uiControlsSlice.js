import { createSlice } from "@reduxjs/toolkit";

/**
 * Slice for managing UI controls visibility in the panorama viewer
 * Controls visibility of navigation buttons, HD toggle, and minimap
 */
const uiControlsSlice = createSlice({
  name: "uiControls",
  initialState: {
    // By default show all UI controls
    showControls: true,
  },
  reducers: {
    // Toggle visibility of UI controls
    toggleControlsVisibility: (state) => {
      state.showControls = !state.showControls;
    },
    // Set controls visibility to a specific state
    setControlsVisibility: (state, action) => {
      state.showControls = action.payload;
    },
  },
});

export const { toggleControlsVisibility, setControlsVisibility } =
  uiControlsSlice.actions;

// Selector
export const selectShowControls = (state) => state.uiControls.showControls;

export default uiControlsSlice.reducer;
