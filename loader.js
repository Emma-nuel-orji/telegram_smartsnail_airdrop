"use client";
import React, { useEffect, useState } from "react";

const Loader = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="loading-container">
      <video autoPlay muted loop>
        <source src="/videos/unload.mp4" type="video/mp4" />
      </video>
    </div>
  );
};

export default Loader;
