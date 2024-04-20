import React, { useRef, useEffect } from 'react';

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
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
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
            console.log("X: " + x + "\nY: " + y);
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
                isRendering = true;
                paintPixel();
                renderFrame();
            }
        }, 0.0001); // Adjust throttle time

        return () => clearInterval(interval);
    }, []);

    return <canvas ref={canvasRef} width={800} height={600} />;
};

export default Canvas;
