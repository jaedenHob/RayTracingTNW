import React from 'react'
import { ReactP5Wrapper } from "@p5-wrapper/react";
// import ScriptTag from  'react-script-tag';

function sketch(p5) {
    class Boundary {
        constructor(x1, y1, x2, y2) {
            this.a = p5.createVector(x1, y1);
            this.b = p5.createVector(x2, y2);
        }

        show() {
            p5.stroke(255);
            p5.line(this.a.x, this.a.y, this.b.x, this.b.y);
        }
    };

    let b;

    p5.setup = () => {
        p5.createCanvas(800, 600);

       b = new Boundary(300, 100, 300, 300);
    }

    p5.draw = () => {
        p5.background(0);
        p5.stroke(255);

        b.show();

        // p5.line(50, 550, 50, 50);
    };
}

const Raycast = () => {
  return (
    <>
        <ReactP5Wrapper sketch={sketch} />
    </>
  )
}

export default Raycast