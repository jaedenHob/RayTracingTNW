import React, {useState} from 'react'
import { ReactP5Wrapper } from "@p5-wrapper/react";

function sketch(p5) {

    // define our obstacles
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

    class shapeBoundary {
        constructor(x, y, x2, y2) {
            this.a = p5.createVector(x, y);
            this.b = p5.createVector(x2, y2);
        }

        show() {
            p5.stroke(255);
            p5.line(this.a.x, this.a.y, this.b.x, this.b.y);
        }
    };

    // classes of varying shapes
    class Square {
        constructor(x, y, size) {
            this.pos = p5.createVector(x , y);
            this.walls = [];
            
        }

        show() {
            for (let side of this.walls) {
                side.show();
            }
        }
    }

    // define the ray from our exaple light source
    class Ray {
        constructor(pos, angle) {
            this.pos = pos;
            this.dir = p5.constructor.Vector.fromAngle(angle);
        }

        //  function for detecting if a ray contacts a wall
        intersect(obstacle) {
            const x1 = obstacle.a.x;
            const y1 = obstacle.a.y;
            const x2 = obstacle.b.x;
            const y2 = obstacle.b.y;

            const x3 = this.pos.x;
            const y3 = this.pos.y;
            const x4 = this.pos.x + this.dir.x;
            const y4 = this.pos.y + this.dir.y;

            const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

            if (denominator == 0) {
                return;
            }

            const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
            const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

            if (t > 0 && t < 1 && u > 0) {
                const pt = p5.createVector();
                pt.x = x1 + t * (x2 - x1);
                pt.y = y1 + t * (y2 - y1);

                return pt;
            } else {
                return;
            }

        }

        lookAt(x, y) {
            this.dir.x = x - this.pos.x;
            this.dir.y = y - this.pos.y;
            this.dir.normalize();
        }

        show() {
            p5.stroke(255);
            p5.push();
            p5.translate(this.pos.x, this.pos.y);
            p5.line(0, 0, this.dir.x * 1000, this.dir.y * 1000);
            p5.pop();
        }
    }

// this will be considered our light source
    class Particle {
        constructor() {
            this.pos = p5.createVector(800 / 2, 600 / 2);
            this.rays = [];

            for (let degree = 0; degree < 360; degree += 10) {
                this.rays.push(new Ray(this.pos, p5.radians(degree)));
            }
        }

        show() {
            p5.fill(255);
            p5.ellipse(this.pos.x, this.pos.y, 12);
        }

        contacts(walls) {
            let pt;
            let max;
            let distance;
            for (let ray of this.rays) {
                max = Infinity;
                let closest = null;
                for (let wall of walls) {
                    pt = ray.intersect(wall);

                    if (pt) {
                        distance = p5.constructor.Vector.dist(this.pos, pt);
                        if (distance < max) {
                            max = distance;
                            closest = pt;
                        }
                    }
                }
                if (closest) {
                    p5.line(this.pos.x, this.pos.y, closest.x, closest.y); // rays that stop at a boundary
                } else {
                    ray.show(); // rays that don't stop at a boundary
                }
            }
        }

        update(x, y) {
            if ((x >= 0 && x <= 800) && (y >= 0 && y <= 600))
                this.pos.set(x, y);        
        }
    }

    // local variables
    let obstacle;
    let obstacle2;
    let allBounds = [];
    let particle;
    let square;

    // set up things in the environment
    p5.setup = () => {
        p5.createCanvas(800, 600);

       obstacle = new Boundary(750, 100, 750, 500);

       obstacle2 = new Boundary(500, 100, 500, 500);
       
       allBounds.push(obstacle);
       allBounds.push(obstacle2);

       square = new Square(300, 400, 50);

       particle = new Particle();
    }

    // draw onto the world
    p5.draw = () => {
        p5.background(0);
        p5.stroke(255);

        obstacle.show();

        obstacle2.show();

        // square.show();


        particle.update(p5.mouseX, p5.mouseY);
        particle.show();
        particle.contacts(allBounds);

        // particle.contacts(obstacle);
        // particle.contacts(obstacle2);

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