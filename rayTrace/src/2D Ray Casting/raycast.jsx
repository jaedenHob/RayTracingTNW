import React from 'react'
import { ReactP5Wrapper } from "@p5-wrapper/react";

function sketch(p5) {
    p5.setup = () => p5.createCanvas(800, 600);

    p5.draw = () => {
        p5.background(0);
        // p5.push();
        // p5.pop();
    };
}

const Raycast = () => {
  return (
    <ReactP5Wrapper sketch={sketch} />
  )
}

export default Raycast