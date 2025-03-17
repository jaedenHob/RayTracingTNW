import React from "react";

import CanvasTriangle from "../Components/CanvasTriangle";
import GraphicsPipeline from "../assets/GraphicsPipeline.png";
const About = () => {
  return (
    <>
      <div className="centered-container">
        <h2 className="p-3">Skills and Interests</h2>

        <p className="p-3">
          When it comes to programing I have done projects revolving around full
          stack development covering mobile and web. Got my initail push into
          computer programming after programming the firmware for some robots in
          C which was when I made the switch to software. Used Python to train
          models and tested for accuracy of handwritten digits recognition.
          Peeked into computer graphics where I learned to render three
          dimensional objects in a virtual space in Javascript and learned
          techniques for realistic renders. I feel I have taken more interests
          in interactive simulations as well as continuous learning of how newer
          optimizations and cutting edge technologies can lead to more
          exhilerating innovations.
        </p>

        <h2 className="p-3">Graphics Pipeline</h2>

        <div className="p-3 centered-container">
          <img src={GraphicsPipeline} />

          <p className="p-3">
            Abstract representation of the different stages for the graphics
            pipline. From: learnopengl.com
          </p>
        </div>

        <h2 className="p-3">Hello Triangle</h2>

        <div className="p-2">
          <CanvasTriangle />
        </div>

        <p className="p-3">
          This is the "Hello World" of the computer graphics world. I have never
          used webgl in reactjs before so going full circle I am applying the
          very first time I learned webgl and created a triangle back when I was
          learning computer graphics at the University of Central Florida.
        </p>
      </div>
    </>
  );
};

export default About;
