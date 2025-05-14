import { configureStore } from "@reduxjs/toolkit";
import panoramaReducer from "./slices/panoramaSlice";

/**
 * Configure the Redux store for the application
 * This combines all reducers and adds middleware
 */
export const store = configureStore({
  reducer: {
    panorama: panoramaReducer,
    // Add other reducers here as needed
  },
});

export default store;
