import React, { useRef, useEffect } from 'react';
import * as twgl from 'twgl.js';

const pixelCode = [

    // uniforms
    `
    uniform sampler2D u_texture;
    uniform  vec3 camera_center;
    uniform vec3 pixel_delta_u;
    uniform vec3 pixel_delta_v;
    uniform vec3 pixel00_loc;
    `,

    `
    // constants
    #define PI 3.1415926538
    #define INFINITY 1.0 / 0.00000000001
    #define MAX_SPHERE 2
    #define RAND_MAX 2147483647.0
    #define SAMPLES_PER_PIXEL 100.0
    #define RAY_BOUNCES 50
    `,

    // utility functions and structs for objects
    
    `
    // defining a ray
    struct Ray {
        vec3 origin;
        vec3 direction;
    };`,

    `
    // defining the specific point on a ray
    vec3 pointOnRay(Ray ray, float t) {
        return (ray.origin + t * ray.direction);
    }`,
]

const Raytrace = () => {
    // variables local to Raytrace
    let width = 400;
    let height = 297;

    // canvas reference
    const canvasRef = useRef(null);

    useEffect(() => {

        // rendered image setup
        const aspect_ratio = 16.0 / 9.0;
        const image_width = 528;

        // calculate image height that is at least 1
        var image_height = image_width / aspect_ratio;

        // console.log(image_height);

        // camera
        const focal_length = 1.0;
        const viewport_height = 2.0;
        const viewport_width = viewport_height * (image_width / image_height);
        const camera_center = [0, 0, 0];

        // Calculate the vectors across the horizontal and down the vertical viewport edges.
        let viewport_u = [viewport_width, 0, 0];
        let viewport_v = [0, viewport_height, 0];

        // Calculate the horizontal and vertical delta vectors from pixel to pixel.
        let pixel_delta_u = viewport_u.map(component => component / image_width);
        let pixel_delta_v = viewport_v.map(component => component / image_height);

        // console.log(pixel_delta_u + " " + pixel_delta_v);

        // Calculate the location of the upper left pixel.
        let viewport_upper_left = [
            camera_center[0] - (0.5 * viewport_u[0]) - (0.5 * viewport_v[0]),
            camera_center[1] - (0.5 * viewport_u[1]) - (0.5 * viewport_v[1]),
            camera_center[2] - focal_length - (0.5 * viewport_u[2]) - (0.5 * viewport_v[2])
        ];

        // console.log(viewport_upper_left);

        let pixel00_loc = [
            viewport_upper_left[0] + 0.5 * (pixel_delta_u[0] + pixel_delta_v[0]),
            viewport_upper_left[1] + 0.5 * (pixel_delta_u[1] + pixel_delta_v[1]),
            viewport_upper_left[2] + 0.5 * (pixel_delta_u[2] + pixel_delta_v[2])
        ];
        
        // console.log(pixel00_loc);

        const canvas = canvasRef.current;

        // gl initailization
        const gl = canvas.getContext('webgl2');

        // initailizing ping-pong buffers
        let fb1 = twgl.createFramebufferInfo(gl, undefined, width, height),
            fb2 = twgl.createFramebufferInfo(gl, undefined, width, height),
            temp = 0;

        // All Shaders

        // initial shader
        const initShader = {
            // drawing particles
            vInit: `
            #version 300 es
            precision mediump float;
            in vec2 position;
            out vec2 v_position;
            
            void main() {
                v_position = 0.5 * position + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }`,

            fInit: `
            #version 300 es
            precision mediump float;
            in vec2 v_position;
            out vec4 fragColor;
            void main() {
                fragColor = vec4(v_position, 0.0, 1.0);
            }`,
        }

        // draw shader
        const drawShaders = {
            // drawing particles
            vDraw: `#version 300 es
            precision mediump float;

            in vec2 vPosition;

            out vec2 texCoord;
            void main () {
                texCoord = (vPosition+1.)/2.;
                gl_Position = vec4(vPosition, 0., 1.0);
            }`,

            fDraw: `#version 300 es
            precision mediump float;
            in vec2 texCoord;
            out vec4 fragColor;
            uniform sampler2D u_texture;
            void main () {
                fragColor = texture(u_texture, texCoord);
            }`,
        }

        // update shader
        const updateShaders = {
            // drawing particles
            vUpdate: `
            #version 300 es
            precision mediump float;

            in vec2 position;
            out vec2 v_texcoord;
            
            void main() {
                v_texcoord = 0.5 * position + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }`,

            fUpdate: `
            #version 300 es
            precision mediump float;

            in vec2 v_texcoord;

            // uniform sampler2D u_texture;
            // uniform  vec3 camera_center;
            // uniform vec3 pixel_delta_u;
            // uniform vec3 pixel_delta_v;
            // uniform vec3 pixel00_loc;

            out vec4 fragColor;

            ${pixelCode.join("\n//----------------")} // auxillary code

            void main() {
                // vec4 texColor = texture(u_texture, v_texcoord);
                // float r = texColor.r+0.004; if (r > 1.) r = 0.;
                // float g = texColor.g+0.004; if (g > 1.) g = 0.;
                // float b = 0.;//texColor.b+0.01; if (b > 1.) b = 0.;
                fragColor = vec4(0.,0.,0.,1.0);
            }`,
        }

        // program infos
        const initProgramInfo = twgl.createProgramInfo(gl, [initShader.vInit, initShader.fInit]);
        const drawProgramInfo = twgl.createProgramInfo(gl, [drawShaders.vDraw, drawShaders.fDraw]);
        const updateProgramInfo = twgl.createProgramInfo(gl, [updateShaders.vUpdate, updateShaders.fUpdate]);


        // supporting function
        function render() {
            twgl.resizeCanvasToDisplaySize(gl.canvas);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            // // drawing frame
            gl.useProgram(drawProgramInfo.program);
            twgl.setBuffersAndAttributes(gl, drawProgramInfo, positionBuffer);
            twgl.setUniforms(drawProgramInfo, { u_texture: fb1.attachments[0] });
            twgl.bindFramebufferInfo(gl, null);
            twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

            // update frame
            gl.useProgram(updateProgramInfo.program);
            twgl.setBuffersAndAttributes(gl, updateProgramInfo, positionBuffer);

            const uniforms = {
                    camera_center: camera_center,
                    pixel_delta_u: pixel_delta_u,
                    pixel_delta_v: pixel_delta_v,
                    pixel00_loc: pixel00_loc,
                    u_texture: fb1.attachments[0]
            };

            // console.log(uniforms);

            twgl.setUniforms(updateProgramInfo, uniforms);
            twgl.bindFramebufferInfo(gl, fb2);
            twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

            // // ping-ponging buffers
            temp = fb1;
            fb1 = fb2;
            fb2 = temp;
        }

        gl.clearColor(0, 0, 0, 1); // Choose a clear color
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        const alignment = 1;
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);

        const positionObject = {
            position: { data: [1, 1, 1, -1, -1, -1, -1, 1], numComponents: 2 }
        };

        const positionBuffer = twgl.createBufferInfoFromArrays(gl, positionObject);

        // particle initialization
        gl.useProgram(initProgramInfo.program);
        twgl.setBuffersAndAttributes(gl, initProgramInfo, positionBuffer);
        twgl.bindFramebufferInfo(gl, fb1);
        twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

        // Rendering loop function
        const renderLoop = () => {
            // Update canvas dimensions if necessary
            twgl.resizeCanvasToDisplaySize(gl.canvas);

            // Call rendering function
            render();

            // Request next frame
            requestAnimationFrame(renderLoop);
        };

        // Start rendering loop
        renderLoop();
    });

    return (
        <>
            <div>
                <canvas ref={canvasRef} width="400" height="297"></canvas>
            </div>
        </>
    );
};

export default Raytrace;
