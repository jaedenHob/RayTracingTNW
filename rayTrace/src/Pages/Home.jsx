import React from "react";

import render_image from "../assets/FinalRenderQuick.png";

const Home = () => {
  return (
    <div className="centered-container">
      <br />

      <h1>RayTracing in one Weekend Projects</h1>

      <br />

      <img src={render_image} alt="A Final Render Image" />

      <br />

      <p>
        So I have completed my version of ray tracing in one weekend using react
        and webgl to then Render a scene of spheres of varying material and
        colors. I want something that renders on the browser while also being
        accessible to devices that don't have an overly powerful GPU. My first
        attempt I would say is successful, but there are areas that are lacking
        in optimization that I feel can be improved which I want to accomplish
        before moving onto some more challenging concepts such as, lights,
        motion blure, perlin noise.
      </p>
    </div>
  );
};

export default Home;
