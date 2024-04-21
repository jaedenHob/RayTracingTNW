import React, { useRef, useEffect } from 'react';

// Supporting things such as functions and variables
const aspect_ratio = 16.0 / 9.0;
const width = 800;

// calculate image height
const image_height = width / aspect_ratio;
const height = (image_height < 1) ? 1 : image_height;

// viewport width
const viewport_height = 2.0;
const viewport_width = viewport_height * (width / image_height);

// glsl code for supporting functions. It is not possible to have objects
// so instead we create structs that will be treated as object which can
// be usefull for defining things such as rays or spheres.

const Canvas = () => {
    const canvasRef = useRef(null);
    const pixels = useRef([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl');

        if (!gl) {
            console.error('Unable to initialize WebGL. Your browser may not support it.');
            return;
        }

        const vertexShaderSource = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
                gl_PointSize = 1.0;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            uniform float u_time;

            
            void main() {
                // Calculate normalized coordinates in the range [0, 1]
                float r = gl_FragCoord.x / 400.0;
                float g = gl_FragCoord.y / 300.0;
                float b = 0.0; // Blue component is set to 0

                // Convert normalized coordinates to color values in the range [0, 255]
                int ir = int(255.999 * r);
                int ig = int(255.999 * g);
                int ib = int(255.999 * b);

                // Output the color
                gl_FragColor = vec4(float(ir) / 255.0, float(ig) / 255.0, float(ib) / 255.0, 1.0);
            }
        `;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader compilation failed:', gl.getShaderInfoLog(vertexShader));
            return;
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader compilation failed:', gl.getShaderInfoLog(fragmentShader));
            return;
        }

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        const positionAttributeLocation = gl.getAttribLocation(program, 'position');
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        const paintPixel = () => {
            const x = Math.random() * 2 - 1;
            const y = Math.random() * 2 - 1;
            // console.log("X: " + x + "\nY: " + y);
            pixels.current.push({ x, y });
        };

        let isRendering = false; // Local variable to track rendering state

        const renderFrame = () => {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform1f(gl.getUniformLocation(program, 'u_time'), performance.now());
            const positions = pixels.current.map(({ x, y }) => [x, y]).flat();
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
            gl.drawArrays(gl.POINTS, 0, positions.length / 2);
            isRendering = false;
        };

        const interval = setInterval(() => {
            if (!isRendering) {
                // isRendering = true;

                paintPixel();
                
                if (pixels.current.length % 1000 === 0) {
                    console.log("lucky");
                    renderFrame();
                }
                // paintPixel();
                // renderFrame();
            }
        }, 1); // Adjust throttle time

        return () => clearInterval(interval);
    }, []);

    return <canvas ref={canvasRef} width={width} height={height} />;
};

export default Canvas;
