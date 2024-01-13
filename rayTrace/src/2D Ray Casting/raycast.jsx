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

    // define the rays from our exaple light source
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
            p5.line(0, 0, this.dir.x * 10, this.dir.y * 10);
            p5.pop();
        }
    }

    class Particle {
        constructor() {
            this.pos = p5.createVector(800 / 2, 600 / 2);
            this.rays = [];

            for (let degree = 0; degree < 360; degree += 2) {
                this.rays.push(new Ray(this.pos, p5.radians(degree)));
            }
        }

        show() {
            p5.fill(255);
            p5.ellipse(this.pos.x, this.pos.y, 12);
            for (let ray of this.rays) {
                ray.show();
            }
        }

        contacts(wall) {
            for (let ray of this.rays) {
                const pt = ray.intersect(wall);

                if (pt) {
                    p5.line(this.pos.x, this.pos.y, pt.x, pt.y); // rays that stop at a boundary
                }
                else {
                    // p5.line(this.pos.x, this.pos.y, this.pos.x + 800, this.pos.y + 800) // rays that don't stop at a boundary
                }
            }
        }

        update(x, y) {
            if ((x >= 0 && x <= 800) && (y >= 0 && y <= 600))
                this.pos.set(x, y);        
        }
    }


    let obstacle;
    let ray;
    let particle;

    p5.setup = () => {
        p5.createCanvas(800, 600);

       obstacle = new Boundary(300, 100, 300, 300);

       ray = new Ray(100, 200);
       particle = new Particle();
    }

    p5.draw = () => {
        p5.background(0);
        p5.stroke(255);

        obstacle.show();


        particle.update(p5.mouseX, p5.mouseY);
        particle.show();
        particle.contacts(obstacle);


        // ray.show();
        // ray.lookAt(p5.mouseX, p5.mouseY);

        // let pt = ray.intersect(obstacle);

        // if (pt) {
        //     p5.stroke(255);
        //     p5.ellipse(pt.x, pt.y, 8, 8);
        // }

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