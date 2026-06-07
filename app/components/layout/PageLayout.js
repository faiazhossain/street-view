"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import LoginModal from "../ui/LoginModal";
import { getAuthInstance } from "../../utils/barikoiAuth";

const PageLayout = ({ title, description, children }) => {
  const { darkMode, toggleDarkMode } = useTheme();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
  });

  // Initialize auth state and listen for changes
  useEffect(() => {
    const auth = getAuthInstance();
    const currentAuthState = auth.getAuthState();

    if (currentAuthState.isAuthenticated) {
      setAuthState({
        isAuthenticated: true,
        user: currentAuthState.user,
      });
    }

    const handleAuthChange = (state) => {
      setAuthState({
        isAuthenticated: state.isAuthenticated || false,
        user: state.user || null,
      });
    };

    auth.on("authStateChange", handleAuthChange);
    auth.on("login", handleAuthChange);
    auth.on("logout", () => {
      setAuthState({
        isAuthenticated: false,
        user: null,
      });
    });

    return () => {
      auth.off("authStateChange", handleAuthChange);
      auth.off("login", handleAuthChange);
      auth.off("logout", handleAuthChange);
    };
  }, []);

  // Handle logout
  const handleLogout = () => {
    const auth = getAuthInstance();
    auth.logout();
  };

  // Handle login success
  const handleLoginSuccess = (user) => {
    setAuthState({
      isAuthenticated: true,
      user: user,
    });
  };

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{title}</h1>

        <div className="flex items-center gap-3">
          {/* Login/User Button */}
          {authState.isAuthenticated ? (
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 group
                ${darkMode
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-gray-100 hover:bg-gray-200 border border-gray-200"
                }`}
              title="Logout"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                {authState.user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className={`text-sm font-medium max-w-24 truncate hidden sm:block
                ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                {authState.user?.name || 'User'}
              </span>
              <svg
                className={`w-4 h-4 transition-colors
                  ${darkMode ? "text-gray-400 group-hover:text-red-400" : "text-gray-500 group-hover:text-red-500"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm hidden sm:block">Login</span>
            </button>
          )}

          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className={`flex items-center justify-center p-2 rounded-full ${
              darkMode
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-gray-200 hover:bg-gray-300"
            } transition-colors`}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              // Sun icon for light mode
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-yellow-300"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              // Moon icon for dark mode
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-700"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {description && (
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>
        </div>
      )}

      {children}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </main>
  );
};

export default PageLayout;
