"use client";

import React from "react";

const PageLayout = ({ title, description, children }) => {
  return (
    <main className='flex min-h-screen flex-col p-4 md:p-8'>
      <h1 className='text-3xl font-bold mb-6'>{title}</h1>

      {description && (
        <div className='mb-6'>
          <p className='text-gray-600 dark:text-gray-300 mb-4'>{description}</p>
        </div>
      )}

      {children}
    </main>
  );
};

export default PageLayout;
