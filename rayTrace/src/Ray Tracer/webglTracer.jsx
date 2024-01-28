import React, { useEffect } from 'react';
import * as twgl from 'twgl.js';

function deg2rad(degrees) {
    return degrees * Math.PI / 180;
}

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

        gl.clearColor(0.5, 0.5, 0.5, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const shaders = {
            vs: `#version 300 es
                precision mediump float;
                in vec3 position;
                uniform float scale;
                uniform float asp;
                uniform mat4 uModel;
                uniform mat4 uView;
                uniform mat4 uProjection;
                out vec3 fragColor;
                out vec3 cent;
                void main(){
                    vec4 cubeCenter = vec4(0,0,0,1);
                    cent = vec3(uView * uModel * cubeCenter);
                    gl_Position = uProjection * uView * uModel * vec4(position, 1.0f);
                }`,
            fs: `#version 300 es
                precision mediump float;
                in vec3 fragColor;
                in vec3 cent;
                uniform float canvasHeight;
                uniform float canvasWidth;
                uniform float radius;
                uniform vec3 eyePosition;
                vec3 orig, dir, N;
                float A, B, C, x_add, x_sub, tHit;
                out vec4 outColor;
                void main(){
                    orig = vec3(0);
                    dir = vec3(gl_FragCoord.xy * vec2(1.0 / canvasWidth, 1.0 / canvasHeight), 0) * 2.0 - 1.0;
                    dir = normalize(dir);
                    A = length(dir) * length(dir);
                    B = 2.0 * dot(dir, (orig - cent));
                    C = length(orig - cent) * length(orig - cent) - radius * radius;
                    float discriminant = (B * B) - (4.0 * A * C);
                    if (discriminant < 0.0) {
                        discard;
                    } else if (discriminant == 0.0) {
                        tHit = -B / (2.0 * A);
                    } else {
                        x_add = (-B + sqrt(discriminant)) / (2.0 * A);
                        x_sub = (-B - sqrt(discriminant)) / (2.0 * A);
                        if (x_add >= 0.0 && x_sub < 0.0) {
                            tHit = x_add;
                        } else if (x_add < 0.0 && x_sub >= 0.0) {
                            tHit = x_sub;
                        } else {
                            tHit = (x_add < x_sub) ? x_add : x_sub;
                        }
                    }
                    vec3 P = orig + tHit * dir;
                    N = P - cent;
                    N = normalize(N);
                    outColor = vec4((N + 1.0) * 0.5, 1);
                }`,
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
            scale: 1,
            uModel: modelMatrix,
            uView: viewMatrix,
            uProjection: projectionMatrix,
            canvasHeight: gl.canvas.height,
            canvasWidth: gl.canvas.width,
            eyePosition: eyeVector,
            radius: 1.0, // Replace with your desired value
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
