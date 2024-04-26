import React, { useRef, useEffect } from 'react';
import * as twgl from 'twgl.js';

const pixelCode = [
    // auxilary functions
    `
    // linearly interpolate between two values
    vec3 mix(vec3 x, vec3 y, float a) {
            return x * (1.0 - a) + y * a;
    }`,

    // `
    // // check if all of a vector's components are near zero
    // bool near_zero(vec3 a) {
    //     // returns true if close to zero in all dimensions
    //     float s = 0.00000001;

    //     abs(a.x) < s

    //     if ((abs(a.x) < s) && (abs(a.y) < s) && (abs(a.z) < s))
    //         return true;
    //     else
    //         return false;
    // }`,

    `
    // computing a reflected vector
    vec3 reflection(vec3 v, vec3 n) {
        return v - 2. * dot(v, n) * n;
    }`,

    // uniforms
    `
    uniform sampler2D u_texture;
    uniform  vec3 camera_center;
    uniform vec3 pixel_delta_u;
    uniform vec3 pixel_delta_v;
    uniform vec3 pixel00_loc;
    uniform float iteration;
    uniform float seed;
    `,

    `
    // constants
    #define PI 3.1415926538
    #define INFINITY 1.0 / 0.00000000001
    #define MAX_SPHERE 2
    #define RAND_MAX 2147483647.0
    #define SAMPLES_PER_PIXEL 100.0
    #define MAX_RAY_BOUNCES 10

    // values we will use when determining matrial type
    #define LAMBERTIAN 0
    #define METAL 1
    #define DIELECTRIC 2
    `,

    // structs to be treated almost as if creating objects

    `
    // defining specific material and its characteristics
    struct Material {
        int type;

        vec3 albedo;

        float fuzzyness;
    };`,

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

        Material mat;
    };`,

    `
    // defining a Sphere
    struct Sphere {
        vec3 center;

        float radius;

        Material mat;
    };`,

    `// defining interval which is the minimum and maximum value of t
    struct interval {
        float min;
        float max;
    };`,

    `
    // defining a camera
    struct Camera {
        float texture_weight;

        vec3 center;
        vec3 pixel_delta_u;
        vec3 pixel_delta_v;
        vec3 pixel00_loc;
    };`,

    // utility functions

    // gamma correction function
    `
    float linear_to_gamma(float linear_component) {
        if (linear_component > 0.0)
            return sqrt(linear_component);

        return 0.0;
    }`,

    // interval functions
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

    // ray calculating and collision functions
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
    // comparison to whether a ray is inside or outside of a sphere
    void set_face_normal(Ray r, vec3 outward_normal, out hit_record rec) {
        // Sets the hit record normal vector.
        // NOTE: the parameter "outward_normal" is assumed to have unit length.
        
        rec.front_face = dot(r.direction, outward_normal) < 0.0;

        rec.normal = rec.front_face ? outward_normal : -outward_normal;
    }`,

    `
    // hitting a sphere
    bool hit_sphere(Sphere orb, Ray r, interval ray_t, out hit_record rec) {
        vec3 oc = orb.center - r.origin;
        float a = dot(r.direction, r.direction);
        float h = dot(r.direction, oc);
        float c = dot(oc, oc) - orb.radius * orb.radius;
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
        vec3 outward_normal = (rec.p - orb.center) / orb.radius;

        set_face_normal(r, outward_normal, rec);

        rec.mat = orb.mat;
        return true;
    }`,

    `
    // list of things we can hit (keeps track of things)
    bool hit_list(Sphere[MAX_SPHERE] spheres, Ray r, interval ray_t, out hit_record rec) {
        hit_record temp_rec;
        bool hit_anything = false;
        float closest_so_far = ray_t.max;

        for (int i = 0; i < MAX_SPHERE; i++) {
            if (hit_sphere(spheres[i], r, interval(ray_t.min, closest_so_far), temp_rec)) {
                hit_anything = true;
                closest_so_far = temp_rec.t;
                rec = temp_rec;
            }
        }
        return hit_anything;
    }`,

    // random number generation functions and random sphere calculations
    `
    // returns a random float value
    float rand(vec2 st) {
        // newer version
        float a = 12.9898;
        float b = 78.223;
        float c = 43758.5453;
        float dt = dot(st, vec2(a,b));
        float sn = mod(dt, 3.14);

        return fract(sin(sn) * c);

        // older version
        // return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }`,

    `
    // returns a vector of random doubles
    float random_double(vec2 st) {
        return rand(st);
    }`,

    `
    // returns a vector of random doubles within a range
    float random_double_interval(vec2 st, float min, float max) {
        return min + (max - min) * random_double(st);
    }`,

    `
    // returns a vector of random doubles
    vec3 random_vector(vec2 st) {
        return vec3(random_double(st), random_double(st.xx), random_double(st.yx));
    }`,

    `
    // returns a vector of random doubles in a range
    vec3 random_vector_interval(vec2 st, float min, float max) {
        return vec3(random_double_interval(st, min, max), 
                    random_double_interval(vec2(st.y + 2., st.x * 4.), min, max), 
                    random_double_interval(st.yx, min, max));
    }`,

    `
    // returns a vector to a random point on a unit square
    vec3 sample_square(vec2 st) {
        return vec3(random_double(st) - seed / 2., random_double(st) - seed / 2., 0);
    }`,

    `
    // returns a vector to a random point on a unit square
    vec3 random_in_unit_sphere(vec2 st) {
        float i = 1.0;
        vec2 tmp = st;

        while(true) {
            vec3 p = random_vector_interval(tmp, -1.0, 1.0);
            
            if (dot(p, p) < 1.) {
                return p;
            }

            tmp = vec2(tmp.x + i, tmp.y + i);
            i += seed;
        }
    }`,

    `
    // returns a unit vector on unit vector sphere
    vec3 random_unit_vector(vec2 st) {
        return normalize(random_in_unit_sphere(st));
    }`,

    `
    // check if vector is in the right hemisphere
    vec3 random_on_hemisphere(vec2 st, vec3 normal) {
        vec3 on_unit_sphere = random_unit_vector(st);

        if (dot(on_unit_sphere, normal) > 0.0) // in the same hemisphere
            return on_unit_sphere;
        else
            return -on_unit_sphere;
    }`,

    // ray calculations and colors

    `
    // calcualte the random ray direction for sampling
    Ray get_ray(vec2 pos, vec2 st) {

        vec3 offset = sample_square(st);

        vec3 pixel_sample = pixel00_loc
                            + ((pos.x + offset.x) * pixel_delta_u)
                            + ((pos.y + offset.y) * pixel_delta_v);

        vec3 ray_origin = camera_center;
        vec3 ray_direction = pixel_sample - ray_origin;

        // created ray
        Ray r = Ray(ray_origin, ray_direction);

        return r;
    }`,

    `
    // calcualte the color for pixel based on rays direction
    vec3 ray_color(in Ray ray, Sphere[MAX_SPHERE] world, vec2 st) {
        hit_record rec;

        int bounce = 0;

        Ray curr = ray;

        float attenuation = 1.;

        while (bounce <= MAX_RAY_BOUNCES) {

            if (hit_list(world, curr, interval(0.001, INFINITY), rec)) {

                // new direction for the new ray that bounces off a surface
                vec3 new_direction = rec.normal + random_unit_vector(st);

                // create new ray from point of collision (will be used in the next loop if bounce < Max_bounce)
                curr = Ray(rec.p, new_direction);
                
                // increment bounce since we hit something
                bounce++;

                attenuation *= 0.5;
            } else { // draw background since ray hit nothing (no bounce.... sadge)
                
                vec3 unit_direction = normalize(curr.direction);
                float a = 0.5 * (unit_direction.y + 1.0);
                vec3 color = (1.0 - a) * vec3(1.0, 1.0, 1.0) + a * vec3(0.5, 0.7, 1.0);

                return (color * attenuation);

            }   
        }
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

        // console.log(image_height);

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
                fragColor = vec4(0., 0., 0.0, 0.0);
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

            out vec4 fragColor;

            ${pixelCode.join("\n//----------------")} // auxillary code

            void main() {
                // vector for resulting color as well as the texture from previous frame
                vec3 color;

                vec4 tex_color = texture(u_texture, v_texcoord);
                vec4 pixel_color;

                // postion on frament used as seeding for rnadom numbers
                vec2 st = vec2(float(gl_FragCoord.x + seed), float(gl_FragCoord.y + seed));
                
                // setting up camera
                Camera cam = Camera((iteration / (iteration + 1.)), camera_center, pixel_delta_u, pixel_delta_v, pixel00_loc);

                Material test = Material(0, vec3(1.), 0.);
                
                // setting up world
                Sphere world[MAX_SPHERE];
                world[0] = Sphere(vec3(0., 0., -1.), 0.5, test);
                world[1] = Sphere(vec3(0., -100.5, -1.), 100.0, test);

                // old code for just interpolating colors. no traditional sampling
                Ray ray = get_ray(vec2(float(gl_FragCoord.x), float(gl_FragCoord.y)), st);
                color = ray_color(ray, world, st);

                // applying linear to gamma correction
                float r = linear_to_gamma(color.x);
                float g = linear_to_gamma(color.y);
                float b = linear_to_gamma(color.z);

                // build color up again with the transformed rgb values
                color = vec3(r, g, b);

                pixel_color = vec4(mix(color, tex_color.rgb, cam.texture_weight), 1.0);

                fragColor = pixel_color;
            }`,
        }

        // program infos
        const initProgramInfo = twgl.createProgramInfo(gl, [initShader.vInit, initShader.fInit]);
        const drawProgramInfo = twgl.createProgramInfo(gl, [drawShaders.vDraw, drawShaders.fDraw]);
        const updateProgramInfo = twgl.createProgramInfo(gl, [updateShaders.vUpdate, updateShaders.fUpdate]);

        let framesCount = 0;
        let startTime = performance.now();
        const fpsElem = document.querySelector("#fps");


        // supporting function
        function render() {
            // keeping track of fps performance
            // Increment frames count
            framesCount++;

            // Calculate elapsed time
            let elapsedTime = performance.now() - startTime;

            // Check if 1 second has elapsed
            if (elapsedTime >= 1000) {
                // Calculate FPS
                let fps = framesCount / (elapsedTime / 1000);

                // Display FPS
                fpsElem.textContent = fps.toFixed(2);

                // Reset counters
                framesCount = 0;
                startTime = performance.now();
            }

            // generate seed to give frames variation
            let seed = (Math.random() * 1.).toFixed(2);
            // console.log(seed / 2.5);

            // increment the iteration for new frame
            iteration++;
            // console.log(iteration);

            let uniforms = {
                camera_center: camera_center,
                pixel_delta_u: pixel_delta_u,
                pixel_delta_v: pixel_delta_v,
                pixel00_loc: pixel00_loc,
                u_texture: fb1.attachments[0],
                iteration: parseFloat(iteration),
                seed: seed
            };

            // console.log(uniforms);

            twgl.resizeCanvasToDisplaySize(gl.canvas);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            // // drawing frame
            gl.useProgram(drawProgramInfo.program);
            twgl.setBuffersAndAttributes(gl, drawProgramInfo, positionBuffer);
            twgl.setUniforms(drawProgramInfo, uniforms);
            twgl.bindFramebufferInfo(gl, null);
            twgl.drawBufferInfo(gl, positionBuffer, gl.TRIANGLE_FAN);

            // update frame
            gl.useProgram(updateProgramInfo.program);
            twgl.setBuffersAndAttributes(gl, updateProgramInfo, positionBuffer);

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
        var start_time = performance.now();
        renderLoop();
    });

    return (
        <>
            <div className='centered-container'>
                <div>fps: <span id="fps"></span></div>
                <canvas ref={canvasRef} width="400" height="225"></canvas>
            </div>
        </>
    );
};

export default Raytrace;
