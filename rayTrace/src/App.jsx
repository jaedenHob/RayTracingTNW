import { useEffect, useRef } from 'react'
import * as twgl from 'twgl.js';
import './App.css'

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

const animateShaders = {
  vs: `#version 300 es
    in vec2 position;
    in vec3 color;

    uniform float aspect;
    uniform float scale;
    uniform vec2 translation;

    out vec3 fragColor;
    void main () {

      vec2 translatedPosition = position + translation;

      gl_Position = vec4(scale * translatedPosition / vec2(aspect,1), 0, 1);
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

    console.log("Everythig is functioning optimally");

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

const CanvasComponentTriangle2 = () => {

  const canvasRef = useRef(null);
  const translationRef = useRef([0, 0]);
  const isDraggingRef = useRef(false);
  
  useEffect(() => {


    const canvas = document.getElementById('myCanvas2');
    let gl = canvas.getContext('webgl2')

    let aspect = canvas.width / canvas.height;
    let scale = 0.5;

    if (!gl) {
      gl = canvas.getContext('experimental-webgl');

      console.log('Browser does not support WebGL');

    }

    console.log("Everythig is functioning optimally");

    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const programInfo = twgl.createProgramInfo(gl, [animateShaders.vs, animateShaders.fs]);

    const vertexAttributes = {
      position: { numComponents: 2, data: [1, 0, 0, 1, -1, -1] },
      color: { numComponents: 3, data: [1, 0, 0, 0, 1, 0, 0, 0, 1] }
    };

    const uniforms = {
      aspect,
      scale,
      translation: translationRef.current,
    };

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, vertexAttributes);

    const handleLeftClick = (e) => {
      isDraggingRef.current = !isDraggingRef.current;
      handleMouseMove(e);
    };

    const handleMouseMove = (e) => {
      if (isDraggingRef.current) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * 2 - 1;
        const y = -(e.clientY - rect.top) / rect.height * 2 + 1;

        translationRef.current = [x, y];
      }
    };

    canvas.addEventListener('click', handleLeftClick);
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {

      gl.clearColor(0, 0, 0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      uniforms.translation = translationRef.current;

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.useProgram(programInfo.program);

      twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, bufferInfo);

      // Request the next animation frame
      requestAnimationFrame(animate);

    };

    animate();

    return () => {
      canvas.removeEventListener('click', handleLeftClick);
      window.removeEventListener('mousemove', handleMouseMove);
    }

  }, [])

  return (
    <>
      <div>
        <canvas ref ={canvasRef} id="myCanvas2" width="800" height="600"></canvas>
      </div>
    </>
  );

};


function App() {

  return (
    <>
      <h1>Raytracing Project</h1>

      <br/>

      <h1>Triangle Webgl Render</h1>
      <CanvasComponentTriangle />
      <p>
        I have never used webgl in reactjs before so going full circle I am applying the very 
      <br/> first time I learned webgl and created a triangle back when I was learning computer
      <br /> at University of Central Florida.
      </p>

      <br />

      <h1>Light Source and rays (Ray Casting) </h1>
      <CanvasComponentTriangle2 />
      <p>
        Here is we have a vusual of a circle being used as a light source around rooms
        <br /> Rays are given off in all direction hiting walls and that is what we can see. 
      </p>
    </>
  )
}

export default App
