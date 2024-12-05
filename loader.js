// Loader.js
import React from 'react';
import './Loader.css'; // Style as needed

const Loader = () => {
  return (
    <div className="loading-container">
      <video autoPlay muted loop>
        <source src="/videos/unload.mp4" type="video/mp4" />
      </video>
    </div>
  );
};

export default Loader;
