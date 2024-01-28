import { useEffect, useRef} from 'react';
import * as twgl from 'twgl.js';
import Raycast from './2D Ray Casting/raycast.jsx';
import Webgl2D from './2D webgl shading/webgl2D.jsx';
import Raytrace from './Ray Tracer/webglTracer.jsx';
import './App.css';

const shaders = {
  vs: `#version 300 es
    in vec2 position;
    in vec3 color;

    uniform float aspect;
    uniform float scale;

    out vec3 fragColor;
    void main () {
      gl_Position = vec4(scale*position/vec2(aspect,1), 0, 1);
      fragColor = color;
    }`,

  fs: `#version 300 es
    precision mediump float;
    out vec4 outColor;
    in vec3 fragColor;
    void main () {
      outColor = vec4(fragColor, 1);
    }`
};


const CanvasComponentTriangle = () => {
  useEffect(() => {
    const canvas = document.getElementById('myCanvas');
    let gl = canvas.getContext('webgl2')

    let aspect = canvas.width / canvas.height;
    let scale = 0.5;

    if (!gl) {
      gl = canvas.getContext('experimental-webgl');

      console.log('Browser does not support WebGL'); 

    }

    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const programInfo = twgl.createProgramInfo(gl, [shaders.vs, shaders.fs]);

    const vertexAttributes = {
      position: {numComponents: 2, data: [1, 0, 0, 1, -1, -1]},
      color: {numComponents: 3, data: [1, 0, 0, 0, 1, 0, 0, 0, 1]}
    };

    const uniforms = {
      aspect,
      scale
    };

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, vertexAttributes);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(programInfo.program);

    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, bufferInfo);

  }, [])

  return (
    <>
      <div>
        <canvas id="myCanvas" width="800" height="600"></canvas>
      </div>
    </>
  );
  
};


function App() {

  return (
    <>
      <h1>Ray Tracing Project</h1>

      <div className='centered-container'>
        <p>
          After my computer graphics course in college I enjoyed the process of designing a game using all
          the techniques that was learned. However, I felt that there was a valuable learning  experience I missed
          out on building a ray tracer. So this project will aim to do just that. My process begun by reading
          up on it in
          <a href='https://raytracing.github.io/books/RayTracingInOneWeekend.html#overview'> ray tracing in one weekend</a>.  The reference material is in C++, but I will stick to what
          I'm accustomed  to with javascript and webgl. Ray tracing is a complex subject so I don't expect
          to complete this in one weekend, but lets see I how far I can get.
        </p>

        <h1>Triangle Webgl Render</h1>

        <CanvasComponentTriangle />

        <p>
          I have never used webgl in reactjs before so going full circle I am applying the very
          first time I learned webgl and created a triangle back when I was learning computer
          graphics back at the University of Central Florida.
        </p>

        <br />

        <h1>Light Source and rays (Ray Casting) </h1>

        <p>
          So first to simplify things to get the concepts and the logic down. I'll do ray casting.
          Both ray tracing and ray casting involve sending rays out through every pixel of an image
          mimmicing the behavior of light. The difference is that ray casting will stop at the first hit,
          while the latter is calculated recursively since when a ray of light hits it reflects or splits
          many times which is very exspensive computationally. Doing it in 2D also simplifies things as well.
        </p>

        <br />

        <Raycast />


        <p>
          Here is we have a point giving rays in all directions and follows the users cursor.
          when a ray contacts a wall it no longer draws further than the contact point.
        </p>

        <br />

        <Webgl2D /> 

        <p>
          Something that pained me was how in previous projects where I have made a shadow protrude from an object useing shadow mapping.
          Shadows appeared, but where hard shadows that appeared blocky so in a 2D situation I was doing a little research into soft shadows.
          This way is a little more complicated and involved calculations for the three parts of a shodow. The umbra, penumbra, and antumbra. 
          For my implementation I may go for try to use RNG to mix/blend the background color with the shadow color to make this affect. 
        </p>

        <br />

        <Raytrace />
        
      </div>


    </>
  )
}

export default App
