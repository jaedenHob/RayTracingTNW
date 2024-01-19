import React from 'react';
import { useEffect, useRef } from 'react';
import * as twgl from 'twgl.js';



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

const lightProgramInfo = {
    vs: `#version 300 es
    precision mediump float;

    in vec3 position;

    uniform mat4 viewMatrix; // Constants that must be set before the render call.
    uniform mat4 projectionMatrix;
    uniform mat4 modelMatrix;

    void main () {
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1);
    }`,
    fs: `#version 300 es
    precision mediump float;
    out vec4 outColor;
    void main () {
      outColor = vec4(0,0,0,1);
    }`,
}

const Webgl2D = () => {
    useEffect(() => {
        const canvas = document.getElementById('myCanvas2');
        let gl = canvas.getContext('webgl2')

        let aspect = canvas.width / canvas.height;
        let scale = 0.5;

        if (!gl) {
            gl = canvas.getContext('experimental-webgl');

            console.log('Browser does not support WebGL');

        }

        gl.clearColor(0.5, 0.5, 0.5, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        const programInfo = twgl.createProgramInfo(gl, [shaders.vs, shaders.fs], (message) => {
            console.log("Program shader copilation error\n" + message);
        });

        const uniforms = {
            aspect,
            scale
        };

        // all triangles to be drawn
        const triangles = [
            [-1, 1, -1, 0, 0, 1], // top half square
            [0, 0, -1, 0, 0, 1] // bottom half of square
        ];

        const vertexAttributes = [];

        // create vertex attibutes
        for (let triangleNum in triangles) {
            // triangles[triangle]
            vertexAttributes[triangleNum] = {
                position: { numComponents: 2, data: triangles[triangleNum] },
                color: { numComponents: 3, data: [, 0, 0, 0, 0, 0, 0, 0, 0] }
            };
        }

        const bufferInfo = [];

        for (let i in triangles) {
            bufferInfo[i] = twgl.createBufferInfoFromArrays(gl, vertexAttributes[i]);
        }
        
        gl.useProgram(programInfo.program);
        twgl.setUniforms(programInfo, uniforms);

        for (let i in triangles) {
            twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo[i]);
            twgl.drawBufferInfo(gl, bufferInfo[i]);
        }


    }, [])

    return (
        <>
            <div>
                <canvas id="myCanvas2" width="800" height="600"></canvas>
            </div>
        </>
    );

};

export default Webgl2D