import React, { useEffect } from 'react';
import * as twgl from 'twgl.js';


// supporting functions and variables for putting rays out into a scene
function deg2rad(degrees) {
    return degrees * Math.PI / 180;
}

function hex2rgb(hex) {
    hex = hex.replace('#', '');
    return hex.match(new RegExp('(.{' + hex.length / 3 + '})', 'g'))
        .map(l => parseInt(hex.length % 2 ? l + l : l, 16) / 255);
}


// rendered image setup
const aspect_ratio = 16.0 / 9.0;
const image_width = 800;

// calculate image height that is at least 1
var image_height = image_width / aspect_ratio;

if (image_height < 1) 
    image_height = 1;

// viewport width can be less than 1
const viewport_height = 2.0;
const viewport_width = viewport_height * (image_width / image_height);

console.log(image_height);

const pixelCode = [
    
    // uniforms
    `
    uniform vec3 Background;
    `,

    `
    // defining a ray
    struct Ray {
        vec3 origin;
        vec3 direction;
    };`,

    `
    // defining the specific point on a ray
    vec3 pointOnRay(in Ray ray, float t) {
        return (ray.origin + t * ray.direction);
    }`,

    // `vec3 pixelColor(vec2 pixel) {
    //     vec3 color = Background;

    //     return Background;
    // }`

    `
    vec3 pixelColor(vec2 pixel) {
        vec3 color = Background;

        // Ray ray = getRay(pixel);

        return Background;
    }
`
]

const Raytrace = () => {
    useEffect(() => {
        const m4 = twgl.m4;
        const v3 = twgl.v3;
        const canvas = document.getElementById('myCanvas3');
        let gl = canvas.getContext('webgl2');

        if (!gl) {
            gl = canvas.getContext('experimental-webgl');
            console.log('Browser does not support WebGL');
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const shaders = {
            vs: `#version 300 es
                    precision highp float;

                    in vec4 position;
                    
                    void main () {
                    gl_Position = position;
                    }`,

            fs: `#version 300 es
                    
                    precision highp float;
                    
                    out vec4 fragColor;

                    ${pixelCode.join("\n//----------------")} // interjected code

                    void main() {
                        fragColor = vec4(pixelColor(gl_FragCoord.xy), 1.0);
                    }`
        };

        const programInfo = twgl.createProgramInfo(gl, [shaders.vs, shaders.fs]);

        const vertexAttributes = {
            position: {
                numComponents: 3,
                data: [1, 1, 1, -1, 1, 1, -1, -1, 1,      // v0-v1-v2 (front)
                    -1, -1, 1, 1, -1, 1, 1, 1, 1,      // v2-v3-v0
                    1, 1, 1, 1, -1, 1, 1, -1, -1,      // v0-v3-v4 (right)
                    1, -1, -1, 1, 1, -1, 1, 1, 1,      // v4-v5-v0
                    1, 1, 1, 1, 1, -1, -1, 1, -1,      // v0-v5-v6 (top)
                    -1, 1, -1, -1, 1, 1, 1, 1, 1,      // v6-v1-v0
                    -1, 1, 1, -1, 1, -1, -1, -1, -1,      // v1-v6-v7 (left)
                    -1, -1, -1, -1, -1, 1, -1, 1, 1,      // v7-v2-v1
                    -1, -1, -1, 1, -1, -1, 1, -1, 1,      // v7-v4-v3 (bottom)
                    1, -1, 1, -1, -1, 1, -1, -1, -1,      // v3-v2-v7
                    1, -1, -1, -1, -1, -1, -1, 1, -1,      // v4-v7-v6 (back)
                    -1, 1, -1, 1, 1, -1, 1, -1, -1],
            },
        };

        const bufferInfo = twgl.createBufferInfoFromArrays(gl, vertexAttributes);

        // camera stuff
        const eyeDirection = m4.transformDirection(
            m4.multiply(m4.rotationY(deg2rad(0)), m4.rotationX(deg2rad(0))),
            [0, 0, 1]
        );

        const eyeVector = v3.mulScalar(eyeDirection, 3)

        const cameraMatrix = m4.lookAt(eyeVector, [0, 0, 0], [0, 1, 0]);
        const viewMatrix = m4.inverse(cameraMatrix);
        const projectionMatrix = m4.perspective(deg2rad(75), gl.canvas.width / gl.canvas.height, 1, 2000);
        const modelMatrix = m4.identity();

        const uniforms = {
            asp: gl.canvas.width / gl.canvas.height,
            Background: [0.8, 0.5, 0.0],
            resolution: [gl.canvas.width, gl.canvas.height],
            scale: 1,
            uModel: modelMatrix,
            uView: viewMatrix,
            uProjection: projectionMatrix,
            canvasHeight: gl.canvas.height,
            canvasWidth: gl.canvas.width,
            eyePosition: eyeVector,
        };

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(programInfo.program);
        twgl.setUniforms(programInfo, uniforms);
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
        twgl.drawBufferInfo(gl, bufferInfo);
    }, []);

    return (
        <>
            <div>
                <canvas id="myCanvas3" width="800" height="600"></canvas>
            </div>
        </>
    );
};

export default Raytrace;
