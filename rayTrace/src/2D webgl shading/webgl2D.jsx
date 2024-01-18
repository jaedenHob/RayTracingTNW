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

        gl.clearColor(0, 0, 0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const programInfo = twgl.createProgramInfo(gl, [shaders.vs, shaders.fs], (message) => {
            console.log("Program shader copilation error\n" + message);
        });

        // drawing a square by making points for two triangles
        const vertex = [
            -1, 1, -1, 0, 1, 1
        ];
        const vertexAttributes = {
            position: { numComponents: 2, data: vertex },
            color: { numComponents: 3, data: [1, 0, 0, 0, 1, 0, 0, 0, 1] }
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
                <canvas id="myCanvas2" width="800" height="600"></canvas>
            </div>
        </>
    );

};

export default Webgl2D