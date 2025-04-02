import React from "react";

import RayTracerTNW from "../Components/WebglTracerTNW";

const RTTNW = () => {
  return (
    <>
      <div className="centered-container">
        <h2 className="p-4">Ray Tracing Part Two</h2>

        <RayTracerTNW />

        <p className="m-2">Final scene of a "cornell box"</p>
      </div>
    </>
  );
};

export default RTTNW;
