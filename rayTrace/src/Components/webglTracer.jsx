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
    #define RAY_BOUNCES 5
    `,

    // structs to be treated almost as if creating objects

    `
    // defining a ray
    struct Ray {
        vec3 origin;
        vec3 direction;
    };`,

    `
    // defining a hit record
    struct hit_record {
        vec3 p;
        vec3 normal;
        float t;
        bool front_face;
    };`,

    `
    // defining a Sphere
    struct Sphere {
        vec3 center;
        float radius;
    };`,

    `// defining interval which is the minimum and maximum value of t
    struct interval {
        float min;
        float max;
    };`,

    // utility functions

    `// check interval size
    float interval_size(interval t) {
        return t.max - t.min;
    }`,

    `// check if t for a ray is within acceptable range
    bool interval_contains(float x, interval t) {
        return t.min <= x && x <= t.max;
    }`,

    `// check if t for a ray is within acceptable range
    bool interval_surrounds(float x, interval t) {
        return t.min < x && x < t.max;
    }`,

    `
    // defining if a ray collision is valid or within a set range
    bool hit(Ray r, float ray_tmin, float ray_tmax, hit_record rec) {
        return true;
    }`,

    `
    // defining the specific point on a ray
    vec3 point_on_ray(Ray ray, float t) {
        return (ray.origin + t * ray.direction);
    }`,

    `
    // hitting a sphere (pre changes)
    // float hit_sphere(in vec3 center, in float radius, in Ray r) {
    //     vec3 oc = center - r.origin;
    //     float a = dot(r.direction, r.direction);
    //     float h = dot(r.direction, oc);
    //     float c = dot(oc, oc) - radius * radius;
    //     float discriminant = h * h - a * c;

    //     if (discriminant < 0.0)
    //         return -1.0;
    //     else
    //         return (h - sqrt(discriminant) ) / (a);
    // }`,

    `
    // comparison to whether a ray is inside or outside of a sphere
    void set_face_normal(Ray r, vec3 outward_normal, out hit_record rec) {
        // Sets the hit record normal vector.
        // NOTE: the parameter "outward_normal" is assumed to have unit length.
        
        rec.front_face = dot(r.direction, outward_normal) < 0.0;

        rec.normal = rec.front_face ? outward_normal : -outward_normal;
    }`,

    `
    // hitting a sphere
    bool hit_sphere(vec3 center,  float radius, Ray r, interval ray_t, out hit_record rec) {
        vec3 oc = center - r.origin;
        float a = dot(r.direction, r.direction);
        float h = dot(r.direction, oc);
        float c = dot(oc, oc) - radius * radius;
        float discriminant = h * h - a * c;

        if (discriminant < 0.0)
            return false;

        float sqrtd = sqrt(discriminant);

        // Find the nearest root that lies in the acceptable range.
        float root = (h - sqrtd) / a;

        if (!interval_surrounds(root, ray_t)) {
            root = (h + sqrtd) / a;

            if (!interval_surrounds(root, ray_t))
                return false;
        }

        rec.t = root;
        rec.p = point_on_ray(r, rec.t);
        vec3 outward_normal = (rec.p - center) / radius;

        set_face_normal(r, outward_normal, rec);
        // rec.normal = (rec.p - center) / radius;
        return true;
    }`,

    `
    // list of things we can hit (keeps track of things)
    bool hit_list(Sphere[MAX_SPHERE] spheres, Ray r, interval ray_t, out hit_record rec) {
        hit_record temp_rec;
        bool hit_anything = false;
        float closest_so_far = ray_t.max;

        for (int i = 0; i < MAX_SPHERE; i++) {
            if (hit_sphere(spheres[i].center, spheres[i].radius, r, interval(ray_t.min, closest_so_far), temp_rec)) {
                hit_anything = true;
                closest_so_far = temp_rec.t;
                rec = temp_rec;
            }
        }
        return hit_anything;
    }`,

    `
    // calcualte the color for pixel based on rays direction
    vec3 ray_color(in Ray ray, Sphere[MAX_SPHERE] world) {
        hit_record rec;

        if (hit_list(world, ray, interval(0.0, INFINITY), rec)) {
            return 0.5 * (rec.normal + vec3(1., 1., 1.));
        }

        // float t = hit_sphere(vec3(0.0, 0.0, -1.0), 0.5, ray);

        // if (t > 0.0) {
        //     vec3 N = normalize(point_on_ray(ray, t) - vec3(0, 0, -1));
        //     return 0.5 * vec3(N.x + 1.0, N.y + 1.0, N.z + 1.0);
        // }

        vec3 unit_direction = normalize(ray.direction);
        float a = 0.5 * (unit_direction.y + 1.0);

        return (1.0 - a) * vec3(1.0, 1.0, 1.0) + a * vec3(0.5, 0.7, 1.0);
    }`,
]

const Raytrace = () => {
    // variables local to Raytrace
    let width = 400;
    let height = 225;

    // canvas reference
    const canvasRef = useRef(null);

    useEffect(() => {

        // rendered image setup
        const aspect_ratio = 16.0 / 9.0;
        const image_width = 400;

        // calculate image height that is at least 1
        var image_height = image_width / aspect_ratio;

        console.log(image_height);

        // camera
        const focal_length = 1.0;
        const viewport_height = 2.0;
        const viewport_width = viewport_height * (image_width / image_height);
        const camera_center = [0.0, 0, 0];

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
                // old code
                // vec4 texColor = texture(u_texture, v_texcoord);
                // float r = texColor.r+0.004; if (r > 1.) r = 0.;
                // float g = texColor.g+0.004; if (g > 1.) g = 0.;
                // float b = 0.;//texColor.b+0.01; if (b > 1.) b = 0.;

                // fresh code

                // setting up world
                Sphere world[MAX_SPHERE];

                world[0] = Sphere(vec3(0., 0., -1.), 0.5);
                world[1] = Sphere(vec3(0., -100.5, -1.), 100.0);

                vec3 pixel_center = pixel00_loc + (gl_FragCoord.x * pixel_delta_u) + (gl_FragCoord.y * pixel_delta_v);
                vec3 ray_direction = pixel_center - camera_center;
                Ray ray = Ray(camera_center, ray_direction);

                vec4 pixel_color = vec4(ray_color(ray, world), 1.0);
                fragColor = pixel_color;
                // fragColor = vec4(r, g, b, 1.0);
            }`,
        }

        // program infos
        const initProgramInfo = twgl.createProgramInfo(gl, [initShader.vInit, initShader.fInit]);
        const drawProgramInfo = twgl.createProgramInfo(gl, [drawShaders.vDraw, drawShaders.fDraw]);
        const updateProgramInfo = twgl.createProgramInfo(gl, [updateShaders.vUpdate, updateShaders.fUpdate]);


        // supporting function
        function render() {
            iteration++;
            // console.log(iteration);
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
        var iteration = 0;
        renderLoop();
    });

    return (
        <>
            <div>
                <canvas ref={canvasRef} width="400" height="225"></canvas>
            </div>
        </>
    );
};

export default Raytrace;
