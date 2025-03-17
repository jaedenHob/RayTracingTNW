import React from "react";

import RayTracerTNW from "../Components/WebglTracerTNW";

const RTTNW = () => {
  return (
    <>
      <div className="centered-container">
        <h2 className="p-4">Ray Tracing Part Two</h2>

        <RayTracerTNW />

        <p>
          Final render of the scene of completing the next week of peter
          shirleys ray tracing tautorials.
        </p>
      </div>
    </>
  );
};

export default RTTNW;
