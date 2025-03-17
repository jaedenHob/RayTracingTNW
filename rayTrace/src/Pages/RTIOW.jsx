import React from "react";

import Raytrace from "../Components/webglTracer";
import poor_render from "../assets/previous_project.png";
import GraphicsPipeline from "../assets/GraphicsPipeline.png";
// D:\projects\Ray Tracing TNW\RayTracingTNW\rayTrace\src\assets
// RayTracingTNW\rayTrace\src\assets\previous_project.png
const RTIOW = () => {
  return (
    <>
      <div className="centered-container">
        <h2 className="p-4">Ray Tracing Part One</h2>

        <div className="centered-container">
          <img src={poor_render} alt="poor final render"></img>
          <p className="p-3">
            Above is an image of my intial attempt at a raytracer which
            contained streaks and could not render many spheres due to impact on
            performance.
          </p>
        </div>

        <Raytrace />

        <p>
          Final render of the scene with slider components that allow the user
          to see different angles in real time. Large improvements when compared
          to the above image.
        </p>
      </div>
    </>
  );
};

export default RTIOW;
