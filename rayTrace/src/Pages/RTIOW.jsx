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
          helps. New approach where instead of running everything only the gpu
          to incorporate some calculations on the cpu through javascript. Makes
          less workload on GPU an hopefull prevents some artifacts that appear
          if random number are not generated properly.
        </p>
      </div>
    </>
  );
};

export default RTIOW;
