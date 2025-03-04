import React from "react";

import Raytrace from "../Components/webglTracer";

const RTIOW = () => {
  return (
    <>
      <div className="centered-container">
        <h2 className="p-4">Ray Tracing Part One</h2>

        <Raytrace />

        <p className="p-1">x: forward and back</p>
        <p className="p-1">y: up and down</p>
        <p className="p-1">z: left and right</p>

        <p>
          Final render of the scene with slider components that allow the user
          to see different angles in real time. Still takes a load on a
          computers gpu. If the frames ever get to low refreshing the page
          helps. New approach on my progressive render was using a whole new way
          of random number generation with a varying global seed among pixels.
        </p>
      </div>
    </>
  );
};

export default RTIOW;
