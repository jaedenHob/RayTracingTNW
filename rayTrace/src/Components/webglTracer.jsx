// imports
import React, { useState, useRef, useEffect } from "react";
import * as twgl from "twgl.js";

import shaders from "./RIOW support code/shaders/ray_tracer_shaders";

import util from "./RIOW support code/utils/supporting_functions";

const Raytrace = () => {
  // canvas reference
  const canvas_ref = useRef(null);

  var width = 450;

  // frame counts
  const [frame_count, setFrameCount] = useState(1);
  let iteration = 0;

  useEffect(() => {
    //   image
    let aspect_ratio = 16.0 / 9.0;
    let image_width = width;

    //   calculate the image height, and ensure that it's at least 1
    let image_height = width / aspect_ratio;

    if (image_height < 1) image_height = 1;

    //   camera
    let focal_length = 1.0;
    let viewport_height = 2.0;
    let viewport_width = viewport_height * (image_width / image_height);
    let camera_center = [0, 0, 0];

    // calculate the vectors across the horizontal and down the vertical viewport edges
    let viewport_u = [viewport_width, 0, 0];
    let viewport_v = [0, viewport_height, 0];

    // calculate the horizontal and vertical delta vectors from pixel to pixel
    // Correct approach using map()
    let pixel_delta_u = viewport_u.map((val) => val / image_width);
    let pixel_delta_v = viewport_v.map((val) => val / image_height);

    // calculate the location of the upper left pixel
    let viewport_upper_left = [
      camera_center[0] - 0 - viewport_u[0] / 2 - viewport_v[0] / 2,
      camera_center[1] - 0 - viewport_u[1] / 2 - viewport_v[1] / 2,
      camera_center[2] - focal_length - viewport_u[2] / 2 - viewport_v[2] / 2,
    ];

    // calculate the 0,0 pixel postion
    let pixel00_loc = [
      viewport_upper_left[0] + 0.5 * (pixel_delta_u[0] + pixel_delta_v[0]),
      viewport_upper_left[1] + 0.5 * (pixel_delta_u[1] + pixel_delta_v[1]),
      viewport_upper_left[2] + 0.5 * (pixel_delta_u[2] + pixel_delta_v[2]),
    ];

    const canvas = canvas_ref.current;
    const gl = canvas.getContext("webgl2");

    if (!gl) {
      console.error("webgl context is not available.", canvas);
      return;
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const initProgram_info = twgl.createProgramInfo(gl, [
      shaders.v_Init,
      shaders.f_Init,
    ]);

    const drawProgram_info = twgl.createProgramInfo(gl, [
      shaders.v_Draw,
      shaders.f_Draw,
    ]);

    const updateProgram_info = twgl.createProgramInfo(gl, [
      shaders.v_Update,
      shaders.f_update_tracer,
    ]);

    const arrays = {
      position: { numComponents: 2, data: [-1, -1, 1, -1, 1, 1, -1, 1] },
      indices: { data: [0, 1, 2, 2, 3, 0] },
    };

    // setup for scene creation
    const buffer_info = twgl.createBufferInfoFromArrays(gl, arrays);

    // uniforms
    let uniforms = {
      pixel00_loc: new Float32Array(pixel00_loc), // Ensure it's a Float32Array
      pixel_delta_u: new Float32Array(pixel_delta_u), // Float32Array for delta
      pixel_delta_v: new Float32Array(pixel_delta_v), // Float32Array for delta
      camera_center: new Float32Array(camera_center), // Float32Array for camera center
      u_texture: null, // for when we pass in previous frame as a texture
      texture_weight: parseFloat(iteration / (iteration + 1)),
      seedA: null,
      seedB: null,
    };

    // create 2 buffers to swap generated frame and saved texture
    let frame_buffer1 = twgl.createFramebufferInfo(
        gl,
        undefined,
        width,
        image_height
      ),
      frame_buffer2 = twgl.createFramebufferInfo(
        gl,
        undefined,
        width,
        image_height
      ),
      temp = null;

    // particle initialization
    gl.useProgram(initProgram_info.program);
    twgl.setBuffersAndAttributes(gl, initProgram_info, buffer_info);
    twgl.bindFramebufferInfo(gl, frame_buffer1);
    twgl.drawBufferInfo(gl, buffer_info, gl.TRIANGLE_FAN);

    requestAnimationFrame(render);

    function render() {
      // increment iteration
      iteration++;

      // update current frame iteration
      setFrameCount((previous_count) => previous_count + 1);

      // change seed every cycle
      let random_seedA = Math.random() * 1000;
      let random_seedB = Math.random() * (750 - 250) + 250;

      twgl.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      // drawing frame
      gl.useProgram(drawProgram_info.program);
      twgl.setBuffersAndAttributes(gl, drawProgram_info, buffer_info);
      twgl.setUniforms(drawProgram_info, {
        u_texture: frame_buffer1.attachments[0],
      });
      twgl.bindFramebufferInfo(gl, null);
      twgl.drawBufferInfo(gl, buffer_info, gl.TRIANGLE_FAN);

      // update frame
      gl.useProgram(updateProgram_info.program);
      twgl.setBuffersAndAttributes(gl, updateProgram_info, buffer_info);

      uniforms.u_texture = frame_buffer1.attachments[0];
      uniforms.seedA = parseFloat(random_seedA);
      uniforms.seedB = parseFloat(random_seedB);
      uniforms.texture_weight = parseFloat(iteration / (iteration + 1));

      twgl.setUniforms(updateProgram_info, uniforms);
      twgl.bindFramebufferInfo(gl, frame_buffer2);
      twgl.drawBufferInfo(gl, buffer_info, gl.TRIANGLE_FAN);

      // ping-pong buffers
      temp = frame_buffer1;
      frame_buffer1 = frame_buffer2;
      frame_buffer2 = temp;

      // // run loop at a reduced speed (30 fps)
      setTimeout(() => {
        console.log(
          "seed A: " + uniforms.seedA + "\nseed B: " + uniforms.seedB
        );
        requestAnimationFrame(render);
      }, 250);

      // run loop at a reduced speed (1 frame every 2 seconds)
      // setTimeout(() => {
      //   requestAnimationFrame(render);
      //   console.log(
      //     "seed A: " + uniforms.seedA + "\nseed B: " + uniforms.seedB
      //   );
      // }, 2000);

      // run loop at full speed
      // requestAnimationFrame(render);
      // console.log(uniforms.seed);
    }
  }, []);

  const [slider_values, set_slider_values] = useState({
    posX: 13.0,
    posY: 2.0,
    posZ: -3.0,
  });

  // Event handler for slider value changes
  const handle_slider_change = (e) => {
    const { name, value } = e.target;
    set_slider_values((prev_state) => ({
      ...prev_state,
      [name]: parseFloat(value),
    }));
  };

  return (
    <>
      <div className="centered-container">
        <div>
          fps: <span id="fps"></span>
        </div>

        <div>
          <div>
            Current frame: <span id="curr_frame">{frame_count}</span>
          </div>
        </div>

        <canvas
          ref={canvas_ref}
          width={width}
          height={width / (16.0 / 9.0)}
        ></canvas>

        <div>
          <br />

          <p>Camera position:</p>

          {/* Sliders for adjusting camera position */}
          <label>Position X:</label>
          <input
            type="range"
            min="-20"
            max="20"
            step="0.1"
            name="posX"
            value={slider_values.posX}
            onChange={handle_slider_change}
          />
          <label>Position Y:</label>
          <input
            type="range"
            min="1"
            max="20"
            step="0.1"
            name="posY"
            value={slider_values.posY}
            onChange={handle_slider_change}
          />
          <label>Position Z:</label>
          <input
            type="range"
            min="-20"
            max="20"
            step="0.1"
            name="posZ"
            value={slider_values.posZ}
            onChange={handle_slider_change}
          />
        </div>
      </div>
    </>
  );
};

export default Raytrace;
