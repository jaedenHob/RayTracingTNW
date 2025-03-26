import React, { useState, useRef, useEffect } from "react";
import * as twgl from "twgl.js";
import shaders from "./BVH Test/Shaders/ray_tracer_shaders";
import { scene_objects } from "./BVH Test/utils/scene_objects";
import { build_BVH, flatten_BVH } from "./BVH Test/utils/BVH";

const BVH_tutorial = () => {
  // canvas reference
  const canvas_ref = useRef(null);
  const camera_pos_ref = useRef({ x: 13.0, y: 2.0, z: -3.0 }); // reference of camera position
  const iteration_ref = useRef(0);

  var width = 300;

  // frame counts
  const [frame_count, setFrameCount] = useState(1);
  let iteration = 0;

  useEffect(() => {
    //   image ratio
    let aspect_ratio = 16.0 / 9.0;

    //   calculate the image height, and ensure that it's at least 1
    let image_height = width / aspect_ratio;

    if (image_height < 1) image_height = 1;

    const canvas = canvas_ref.current;
    const gl = canvas.getContext("webgl2");

    if (!gl) {
      console.error("webgl context is not available.", canvas);
      return;
    }

    // create scene objects to be passed
    // console.log(scene_objects);

    // building bvh
    const object_indexes = scene_objects.map((_, index) => index);

    let obj_data = scene_objects.map((obj, i) => ({
      obj,
      index: object_indexes[i],
    }));

    // console.log(obj_data);

    const BVH_root = build_BVH(obj_data);

    // console.log(BVH_root);

    const flat_tree = flatten_BVH(BVH_root);

    // console.log(flat_tree);

    // convert tree into a flat array of floats to be passed to shaders
    let float_BVH = new Float32Array(flat_tree);

    // console.log(float_BVH);

    const textureWidth = 256; // Choose an appropriate width
    const textureHeight = Math.ceil(float_BVH.length / (textureWidth * 4));

    // pad array
    let padded_BVH = new Float32Array(textureWidth * textureHeight * 4);
    padded_BVH.set(float_BVH);

    // console.log(padded_BVH);

    // Create BVH texture buffer
    const BVH_texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, BVH_texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F, // Single-channel float texture
      textureWidth,
      textureHeight,
      0,
      gl.RGBA,
      gl.FLOAT,
      padded_BVH
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null); // Unbind

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
      width: width,
      camera_center: [
        camera_pos_ref.current.x,
        camera_pos_ref.current.y,
        camera_pos_ref.current.z,
      ],
      u_texture: null, // for when we pass in previous frame as a texture
      textureWidth: textureWidth,
      BVH_texture: BVH_texture,
      texture_weight: parseFloat(iteration / (iteration + 1)),
      iteration: null,
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
      iteration_ref.current++;

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

      // uniforms that are updated continuosly in the render loop
      uniforms.camera_center = [
        camera_pos_ref.current.x,
        camera_pos_ref.current.y,
        camera_pos_ref.current.z,
      ];
      uniforms.u_texture = frame_buffer1.attachments[0];
      uniforms.seedA = parseFloat(random_seedA);
      uniforms.seedB = parseFloat(random_seedB);
      uniforms.texture_weight = parseFloat(
        iteration_ref.current / (iteration_ref.current + 1)
      );
      uniforms.iteration = iteration_ref.current;

      twgl.setUniforms(updateProgram_info, uniforms);
      twgl.bindFramebufferInfo(gl, frame_buffer2);
      twgl.drawBufferInfo(gl, buffer_info, gl.TRIANGLE_FAN);

      // ping-pong buffers
      temp = frame_buffer1;
      frame_buffer1 = frame_buffer2;
      frame_buffer2 = temp;

      // run loop at a reduced speed (5 fps)
      setTimeout(() => {
        requestAnimationFrame(render);
      }, 140);
    }
  }, []);

  // Event handler for slider value changes
  const handle_slider_change = (e) => {
    const { name, value } = e.target;
    camera_pos_ref.current = {
      ...camera_pos_ref.current,
      [name]: parseFloat(value),
    };

    iteration_ref.current = 1;
  };

  return (
    <>
      <div className="centered-container">
        <canvas
          ref={canvas_ref}
          width={width}
          height={width / (16.0 / 9.0)}
        ></canvas>
      </div>

      <div className="centered-container">
        <p>Camera position:</p>
        <label>Position X (left and right):</label>
        <input
          type="range"
          min="-90"
          max="90"
          step="0.001"
          name="x"
          defaultValue={camera_pos_ref.current.x}
          onChange={handle_slider_change}
        />
        <label>Position Y (up and down):</label>
        <input
          type="range"
          min="1"
          max="45"
          step="0.001"
          name="y"
          defaultValue={camera_pos_ref.current.y}
          onChange={handle_slider_change}
        />
        <label>Position Z (forward and back):</label>
        <input
          type="range"
          min="-90"
          max="90"
          step="0.001"
          name="z"
          defaultValue={camera_pos_ref.current.z}
          onChange={handle_slider_change}
        />
      </div>
    </>
  );
};

export default BVH_tutorial;
