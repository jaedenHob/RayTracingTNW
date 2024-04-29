import React, { useRef, useEffect } from 'react'

import * as twgl from 'twgl.js';


const Ping_pong_animation = () => {
    // variables local to test
    let width = 400;
    let height = 350;

    // canvas reference
    const canvasRef = useRef(null);

    useEffect(() => {
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
            uniform sampler2D u_texture;
            out vec4 fragColor;

            void main() {
                vec4 texColor = texture(u_texture, v_texcoord);
                float r = texColor.r+0.004; if (r > 1.) r = 0.;
                float g = texColor.g+0.004; if (g > 1.) g = 0.;
                float b = 0.;//texColor.b+0.01; if (b > 1.) b = 0.;
                fragColor = vec4(r,g,b,1.0);
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

            // drawing frame
            gl.useProgram(drawProgramInfo.program);
            twgl.setBuffersAndAttributes(gl, drawProgramInfo, positionBuffer);
            twgl.setUniforms(drawProgramInfo, { u_texture: fb1.attachments[0] });
            twgl.bindFramebufferInfo(gl, null);
            twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

            // update frame
            gl.useProgram(updateProgramInfo.program);
            twgl.setBuffersAndAttributes(gl, updateProgramInfo, positionBuffer);

            twgl.setUniforms(updateProgramInfo, { u_texture: fb1.attachments[0] });
            twgl.bindFramebufferInfo(gl, fb2);
            twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

            // ping-ponging buffers
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
            
    })
  return (
    <>
        <div className='centered-container'>
              <canvas ref={canvasRef} width={width} height={height} />
        </div>
    </>
  )
}

export default Ping_pong_animation