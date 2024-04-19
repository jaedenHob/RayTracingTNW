import React from 'react';
import { useEffect, useRef } from 'react';


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
        // Quick vertex shader to draw a light with.
        const LIGHT_VSHADER = (`
  attribute vec2 a_vertex;
  attribute vec2 a_uv;
  
  varying lowp vec2 v_uv;
  
  uniform mat4 u_matrix;

  void main(){
    gl_Position = u_matrix*vec4(a_vertex, 0, 1);
    gl_Position.x *= 0.75; // I'm too lazy to use a projection matrix here...
    v_uv = a_uv;
  }
`);

        // Quick fragment shader to draw a light with.
        const LIGHT_FSHADER = (`
  varying lowp vec2 v_uv;
  
  uniform lowp vec3 u_color;
  
  void main(){
    lowp float brightness = max(0.0, 1.0 - pow(dot(v_uv, v_uv), 0.25));
    gl_FragColor = vec4(brightness*u_color, 1.0);
  }
`);

        // Quick vertex buffer to draw a light with.
        const LIGHT_SPRITE_VERTS = new Float32Array([
            10, 10, 10, 10,
            -10, 10, -10, 10,
            10, -10, 10, -10,
            -10, -10, -10, -10,
        ]);

        const SHADOW_VSHADER = (`
  attribute vec4 a_segment;
  attribute vec2 a_shadow_coord;
  
  uniform mat4 u_matrix;
  uniform vec3 u_light;
  
  varying vec4 v_penumbras;
  varying vec3 v_edges;
  varying vec3 v_proj_pos;
  varying vec4 v_endpoints;
  
  mat2 adjugate(mat2 m){return mat2(m[1][1], -m[0][1], -m[1][0], m[0][0]);}
  
  void main(){
    // Unpack the vertex shader input.
    vec2 endpoint_a = (u_matrix*vec4(a_segment.zw, 0.0, 1.0)).xy;
    vec2 endpoint_b = (u_matrix*vec4(a_segment.xy, 0.0, 1.0)).xy;
    vec2 endpoint = mix(endpoint_a, endpoint_b, a_shadow_coord.x);
    float light_radius = u_light.z;
    
    // Deltas from the segment to the light center.
    vec2 delta_a = endpoint_a - u_light.xy;
    vec2 delta_b = endpoint_b - u_light.xy;
    vec2 delta = endpoint - u_light.xy;
    
    // Offsets from the light center to the edge of the light volume.
    vec2 offset_a = vec2(-light_radius,  light_radius)*normalize(delta_a).yx;
    vec2 offset_b = vec2( light_radius, -light_radius)*normalize(delta_b).yx;
    vec2 offset = mix(offset_a, offset_b, a_shadow_coord.x);
    
    // Vertex projection.
    float w = a_shadow_coord.y;
    vec3 proj_pos = vec3(mix(delta - offset, endpoint, w), w);
    gl_Position = vec4(proj_pos.xy, 0, w);
    gl_Position.x *= 0.75; // I'm too lazy to use a projection matrix here...
    
    vec2 penumbra_a = adjugate(mat2( offset_a, -delta_a))*(delta - mix(offset, delta_a, w));
    vec2 penumbra_b = adjugate(mat2(-offset_b,  delta_b))*(delta - mix(offset, delta_b, w));
    v_penumbras = (light_radius > 0.0 ? vec4(penumbra_a, penumbra_b) : vec4(0, 1, 0, 1));

    // Edge values for light penetration and clipping.
    vec2 seg_delta = endpoint_b - endpoint_a;
    vec2 seg_normal = seg_delta.yx*vec2(-1.0, 1.0);
    // Calculate where the light -> pixel ray will intersect with the segment.
    v_edges.xy = -adjugate(mat2(seg_delta, delta_a + delta_b))*(delta - offset*(1.0 - w));
    v_edges.y *= 2.0; // Skip a multiply in the fragment shader.
    // Calculate a clipping coordinate that is 0 at the near edge (when w = 1)...
    // otherwise calculate the dot product with the projected coordinate.
    v_edges.z = dot(seg_normal, delta - offset)*(1.0 - w);

    // Light penetration values.
    float light_penetration = 0.01;
    v_proj_pos = vec3(proj_pos.xy, w*light_penetration);
    v_endpoints = vec4(endpoint_a, endpoint_b)/light_penetration;
  }
`);

        const SHADOW_FSHADER = (`
  varying mediump vec4 v_penumbras;
  varying mediump vec3 v_edges;
  varying mediump vec3 v_proj_pos;
  varying mediump vec4 v_endpoints;
  
  void main(){
    // Calculate the light intersection point, but clamp to endpoints to avoid artifacts.
    mediump float intersection_t = clamp(v_edges.x/abs(v_edges.y), -0.5, 0.5);
    mediump vec2 intersection_point = (0.5 - intersection_t)*v_endpoints.xy + (0.5 + intersection_t)*v_endpoints.zw;
    // The delta from the intersection to the pixel.
    mediump vec2 penetration_delta = intersection_point - v_proj_pos.xy/v_proj_pos.z;
    // Apply a simple falloff function.
    mediump float bleed = min(dot(penetration_delta, penetration_delta), 1.0);

    // Penumbra mixing.
    mediump vec2 penumbras = smoothstep(-1.0, 1.0, v_penumbras.xz/v_penumbras.yw);
    mediump float penumbra = dot(penumbras, step(v_penumbras.yw, vec2(0.0)));
    penumbra -= 1.0/64.0; // Numerical precision fudge factor.
    
    gl_FragColor = vec4(bleed*(1.0 - penumbra)*step(v_edges.z, 0.0));
  }
`);

        let SHADOW_VERTEX_COUNT =[];

        function main() {
            const canvas = document.getElementById('myCanvas2');
            const gl = canvas.getContext('webgl2');

            if (!gl) {
                alert('Unable to initialize WebGL. Your browser or machine may not support it.');
                return;
            }

            const shadow_verts = new Float32Array([
                -0.2, -0.1, 0.2, -0.1, 0.0, 0.0, // Vertex A
                -0.2, -0.1, 0.2, -0.1, 0.0, 1.0, // Vertex B
                -0.2, -0.1, 0.2, -0.1, 1.0, 1.0, // Vertex C
                -0.2, -0.1, 0.2, -0.1, 1.0, 1.0, // Vertex C
                -0.2, -0.1, 0.2, -0.1, 1.0, 0.0, // Vertex D
                -0.2, -0.1, 0.2, -0.1, 0.0, 0.0, // Vertex A

                0.2, -0.1, 0.2, 0.1, 0.0, 0.0,
                0.2, -0.1, 0.2, 0.1, 0.0, 1.0,
                0.2, -0.1, 0.2, 0.1, 1.0, 1.0,
                0.2, -0.1, 0.2, 0.1, 1.0, 1.0,
                0.2, -0.1, 0.2, 0.1, 1.0, 0.0,
                0.2, -0.1, 0.2, 0.1, 0.0, 0.0,

                0.2, 0.1, -0.2, 0.1, 0.0, 0.0,
                0.2, 0.1, -0.2, 0.1, 0.0, 1.0,
                0.2, 0.1, -0.2, 0.1, 1.0, 1.0,
                0.2, 0.1, -0.2, 0.1, 1.0, 1.0,
                0.2, 0.1, -0.2, 0.1, 1.0, 0.0,
                0.2, 0.1, -0.2, 0.1, 0.0, 0.0,

                -0.2, 0.1, -0.2, -0.1, 0.0, 0.0,
                -0.2, 0.1, -0.2, -0.1, 0.0, 1.0,
                -0.2, 0.1, -0.2, -0.1, 1.0, 1.0,
                -0.2, 0.1, -0.2, -0.1, 1.0, 1.0,
                -0.2, 0.1, -0.2, -0.1, 1.0, 0.0,
                -0.2, 0.1, -0.2, -0.1, 0.0, 0.0,
            ]);

            SHADOW_VERTEX_COUNT = shadow_verts.length / 6;

            // This blend mode applies the shadow to the light, accumulates it, and resets the alpha.
            // The source color is multiplied by the destination alpha (where the shadow mask has been drawn).
            // The alpha src alpha replaces the destination alpha.
            const blend_light = {
                equation: { color: gl.FUNC_ADD, alpha: gl.FUNC_ADD },
                function: { color_src: gl.DST_ALPHA, color_dst: gl.ONE, alpha_src: gl.ONE, alpha_dst: gl.ZERO },
            };

            // Shadows should only be drawn into the alpha channel and should leave color untouched.
            const blend_shadow = {
                equation: { color: gl.FUNC_ADD, alpha: gl.FUNC_REVERSE_SUBTRACT },
                function: { color_src: gl.ZERO, color_dst: gl.ONE, alpha_src: gl.ONE, alpha_dst: gl.ONE },
            };

            // all rendering data
            const ctx = {
                gl: gl,
                light_material: {
                    shader: create_shader(gl, LIGHT_VSHADER, LIGHT_FSHADER),
                    vbuffer: create_vbuffer(gl, LIGHT_SPRITE_VERTS),
                    blend: blend_light,
                    attrib_stride: 16, attribs: [
                        { name: "a_vertex", size: 2, offset: 0 },
                        { name: "a_uv", size: 2, offset: 8 },
                    ],
                },
                shadow_material: {
                    shader: create_shader(gl, SHADOW_VSHADER, SHADOW_FSHADER),
                    vbuffer: create_vbuffer(gl, shadow_verts),
                    blend: blend_shadow,
                    attrib_stride: 4 * 6, attribs: [
                        { name: "a_segment", size: 4, offset: 4 * 0 },
                        { name: "a_shadow_coord", size: 2, offset: 4 * 4 },
                    ],
                },
            };

            // Start the drawing loop.
            function render_loop(time) {
                draw(ctx, time * 1e-3);
                requestAnimationFrame(render_loop);
            }

            requestAnimationFrame(render_loop);
        }

        function draw(ctx, time) {
            const gl = ctx.gl;

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // A list of the visible lights we want to draw.
            const lights = [
                {x:0, y:1, size: 3, radius: 0.5, color: [0, 1, 0]}, // green light at the top
                { x: -1, y: -1, size: 3, radius: 0.5, color: [1, 0, 0] }, // red light bottom left
                { x: 1, y: -1, size: 3, radius: 0.5, color: [0, 0, 1] }, // blue light bottom right
            ];

            // square that casts the shadow.
            const rectangle = mat4_trs(0, 0, time / 3, 1);

            for (var i in lights) {
                const light = lights[i];

                // Draw the shadow mask into destination alpha.
                bind_material(gl, ctx.shadow_material, [
                    { name: "u_matrix", type: UNIFORM.mat4, value: rectangle},
                    { name: "u_light", type: UNIFORM.vec3, value: [light.x, light.y, light.radius] }
                ]);
                gl.drawArrays(gl.TRIANGLES, 0, SHADOW_VERTEX_COUNT);

                bind_material(gl, ctx.light_material, [
                    { name: "u_color", type: UNIFORM.vec3, value: light.color },
                    { name: "u_matrix", type: UNIFORM.mat4, value: mat4_trs(light.x, light.y, 0, light.size) },
                ]);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
        }

        function create_shader(gl, LIGHT_VSHADER, LIGHT_FSHADER) {
            function compile(gl, type, source) {
                const shader = gl.createShader(type);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);

                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    alert('Failed to compile shader: ' + gl.getShaderInfoLog(shader));
                    gl.deleteShader(shader);
                    return null;
                } else {
                    return shader;
                }
            }

            const vshader = compile(gl, gl.VERTEX_SHADER, LIGHT_VSHADER);
            const fshader = compile(gl, gl.FRAGMENT_SHADER, LIGHT_FSHADER);

            const shader = gl.createProgram();
            gl.attachShader(shader, vshader);
            gl.attachShader(shader, fshader);
            gl.linkProgram(shader);

            if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
                alert('Unable to initialize the shader shader: ' + gl.getProgramInfoLog(shader));
                gl.deleteShader(vshader);
                gl.deleteShader(fshader);
                gl.deleteProgram(shader);
                return null;
            } else {
                return shader;
            }
        }

        function create_vbuffer(gl, vertexes) {
            const vbuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertexes, gl.STATIC_DRAW);

            return vbuffer;
        }
         
        // function for rectangle transformations
        function mat4_trs(x, y, rotate, scale) {
            const c = scale * Math.cos(rotate);
            const s = scale * Math.sin(rotate);
            return [
                c, -s, 0, 0,
                s, c, 0, 0,
                0, 0, 1, 0,
                x, y, 0, 1,
            ];
        }


        const UNIFORM = {
            vec2: function (gl, loc, value) { gl.uniform2fv(loc, value); },
            vec3: function (gl, loc, value) { gl.uniform3fv(loc, value); },
            mat4: function (gl, loc, value) { gl.uniformMatrix4fv(loc, false, value); },
        };

        function bind_material(gl, material, uniforms) {
            if (material.blend) {
                gl.enable(gl.BLEND);
                const blend = material.blend;
                gl.blendEquationSeparate(blend.equation.color, blend.equation.alpha);
                const func = blend.function;
                gl.blendFuncSeparate(func.color_src, func.color_dst, func.alpha_src, func.alpha_dst);
            } else {
                gl.disable(gl.BLEND);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, material.vbuffer);
            for (var i in material.attribs) {
                const attrib = material.attribs[i];
                const loc = gl.getAttribLocation(material.shader, attrib.name);
                gl.vertexAttribPointer(loc, attrib.size, gl.FLOAT, false, material.attrib_stride, attrib.offset);
                gl.enableVertexAttribArray(loc);
            }

            gl.useProgram(material.shader);
            for (var i in uniforms) {
                const uniform = uniforms[i];
                uniform.type(gl, gl.getUniformLocation(material.shader, uniform.name), uniform.value);
            }
        }

        main();


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