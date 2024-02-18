import React, { useEffect } from 'react';
import * as twgl from 'twgl.js';

// supporting functions and variables for putting rays out into a scene
function deg2rad(degrees) {
    return degrees * Math.PI / 180;
}

function hex2rgb(hex) {
    hex = hex.replace('#', '');
    return hex.match(new RegExp('(.{' + hex.length / 3 + '})', 'g'))
        .map(l => parseInt(hex.length % 2 ? l + l : l, 16) / 255);
}

const resolution = [800.0, 600.0];

// rendered image setup
const aspect_ratio = 16.0 / 9.0;
const image_width = 800;

// calculate image height that is at least 1
var image_height = image_width / aspect_ratio;

// viewport width can be less than 1
const viewport_height = 2.0;
const viewport_width = viewport_height * (image_width / image_height);
const camera_center = [0, 0, 0];


const pixelCode = [

    // uniforms
    `
    uniform vec3 camera_center;
    uniform float image_height;
    uniform float image_width;
    uniform float viewport_width;
    uniform float viewport_height;
    uniform vec2 resolution;
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

    // utility functions

    `// random real number within [0,1] (https://thebookofshaders.com/10/)
    float randomReal(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }`,

    ` // random real within [min, max]
    float randomRealRestricted(vec2 st, float min, float max) {
        return min + (max - min) * randomReal(st);
    }`,

    ` // random vector function
    vec3 randomVector(vec2 st) {
        return (vec3(randomReal(st), randomReal(st), randomReal(st)));
    }`,

    ` // random vector function
    vec3 randomVectorRestricted(vec2 st, float min, float max) {
        return (vec3(randomReal(st), randomReal(st), randomReal(st)));
    }`,

    ` // random vector in sphere function
    vec3 randomInUnitSphere(vec2 st) {
        while (true) {
            vec3 p = vec3(randomRealRestricted(st * 12., -1.0, 1.0), 
                          randomRealRestricted(st * 3.0, -1.0, 1.0), 
                          randomRealRestricted(st * 8.0, -1.0, 1.0));

            if (dot(p, p) < 1.0) {
                return p;
            }
        }
    }`,

    ` // random unit vector in sphere function
    vec3 randomUnitVector(vec2 st) {
        return (normalize(randomInUnitSphere(st)));
    }`,

    ` // random unit vector checked if on the right sphere hemisphere
    vec3 randomOnHemisphere(vec2 st, vec3 normal) {
        vec3 onUnitSphere = randomUnitVector(st);

        if (dot(onUnitSphere, normal) > 0.0) 
            return onUnitSphere;
        else
            return -onUnitSphere;
    }`,

    `// from degrees to radians
    float degrees_to_radians(float degrees) {
        return degrees * PI / 180.0;
    }`,

    `// check if t for a ray is within acceptable range
    bool surrounds(float x, float min, float max) {
        return min < x && x < max;
    }`,

    `
    // defining a camera
    struct Camera {
        float focal;

        float samples;

        vec3 origin;
        vec3 viewport_u;
        vec3 viewport_v;
        vec3 pixel_delta_u;
        vec3 pixel_delta_v;
        vec3 viewport_upper_left;
        vec3 pixel00_loc;
    };`,

    `
    // defining a ray
    struct Ray {
        vec3 origin;
        vec3 direction;
    };`,

    `
    // defining all things that count as a hit
    struct hitRecord {
        vec3 p;
        vec3 normal;
        float t;
        bool frontFace;
    };`,

    `// defining st 
    struct noise {
        vec2 rand;
    };`,

    `// defining interval which is the minimum and maximum value of t
    struct interval {
        float min;
        float max;
    };`,

    `
    // defining a sphere
    struct Sphere {
        vec3 center;
        float radius;
    };`,

    `
    // defining if the ray is hitting the inside or outside and makeing the normal point accordingly
    void setFaceNormal(Ray ray, vec3 outwardNormal, out hitRecord rec) {

        rec.frontFace = dot(ray.direction, outwardNormal) < 0.0;

        rec.normal = rec.frontFace ? outwardNormal : -outwardNormal;

        return;
    }`,

    `
    // defining the specific point on a ray
    vec3 pointOnRay(Ray ray, float t) {
        return (ray.origin + t * ray.direction);
    }`,

    `
    // defining a hit specific to spheres and the possible amount of roots based from the discriminant
    bool hit_sphere(Sphere ball, Ray ray, float ray_tmin, float ray_tmax, out hitRecord rec) {
        vec3 oc = ray.origin - ball.center;

        float a = dot(ray.direction, ray.direction);
        float half_b = dot(oc, ray.direction);
        float c = dot(oc, oc) - ball.radius * ball.radius;
        float discriminant = half_b * half_b - a * c;

        if (discriminant < 0.0)
            return false;

        float sqrtd = sqrt(discriminant);

        // find the nearest root that lies within the acceptable range
        float root = (-half_b - sqrtd) / a;

        if (!surrounds(root, ray_tmin, ray_tmax)) {
            root = (-half_b + sqrtd) / a;

            if (!surrounds(root, ray_tmin, ray_tmax))
                return false;
        }

        rec.t = root;
        rec.p = pointOnRay(ray, root);
        vec3 outward_normal = (rec.p - ball.center) / ball.radius;

        setFaceNormal(ray, outward_normal, rec);

        return true;
    }`,

    `
    // hitList for keeping tracks
    bool hitList(Sphere[MAX_SPHERE] spheres, Ray ray, interval rayT, out hitRecord hit) {
        hitRecord temp;
        bool hitAnything = false;
        float closest = rayT.max;

        // loop through each sphere
        for (int i = 0; i < MAX_SPHERE; i++) {

            if(hit_sphere(spheres[i], ray, rayT.min, closest, temp)) {
                hitAnything = true;
                closest = temp.t;
                hit = temp;
            }
        }
        return hitAnything;
    } `,

    `// generating a camera
    Camera getCamera() {
        // camera setup (stays the same)
        float focal_length = 1.0;

        vec3 viewport_u = vec3(viewport_width, 0, 0);
        vec3 viewport_v = vec3(0, viewport_height, 0);
        vec3 pixel_delta_u = viewport_u / image_width;
        vec3 pixel_delta_v = viewport_v / image_height;

        // Calculate the location of the upper left pixel.
        vec3 viewport_upper_left = camera_center - vec3(0, 0, focal_length) - viewport_u / 2.0 - viewport_v / 2.0;
        vec3 pixel00_loc = viewport_upper_left + 0.5 * (pixel_delta_u + pixel_delta_v);
        
        return Camera(1.0, SAMPLES_PER_PIXEL, vec3(0.0, 0.0, 0.0), viewport_u,
                      viewport_v, pixel_delta_u, pixel_delta_v, viewport_upper_left, pixel00_loc);
    }`,

    `// selecting random points in a square surrounding a pixel
    vec3 sampleSquare(vec2 pixel, Camera cam, float i, out noise v) {
        vec2 st = (pixel + i) / resolution;
        st *= 10.0;

        v.rand = st;

        float px = -0.5 + randomReal(st);
        float py = -0.5 + randomReal(st.yx);
        return (px * cam.pixel_delta_u) + (py * cam.pixel_delta_v);
    }`,

    `// generating a ray (mainly finding the direction between the camera and viewport)
    Ray getRay(vec2 pixel, Camera cam, float i, out noise vari) {
        vec3 pixelCenter = cam.pixel00_loc + (pixel.x * cam.pixel_delta_u) + (pixel.y * cam.pixel_delta_v);
        vec3 pixelSample = pixelCenter + sampleSquare(pixel, cam, i, vari);

        return Ray(cam.origin, pixelSample - cam.origin);
    }`,

    `
    // function for ray color logic to reduce size of pixel color
    vec3 rayColor(vec2 pixel, Sphere[MAX_SPHERE] orb, Ray ray, vec2 vari) {
        hitRecord rec;

        Ray curr = ray;

        int bounce = 0;

        vec3 attenuation = vec3(1.0);
        vec3 direction;

        while (bounce <= RAY_BOUNCES) {
            // ray hits obstacle
            if (hitList(orb, curr, interval(0.0, INFINITY), rec)) {
                // new ray direction
                direction = randomOnHemisphere((vari + float(bounce)) / resolution, rec.normal);

                curr.origin = rec.p;
                curr.direction = direction;

                // increment bounce
                bounce++;

                attenuation *= 0.5;
            } else {
                // background section
                // logic for creating background blue -> white gradient
                vec3 unitDirection = normalize(curr.direction);
                float a = 0.5 * (unitDirection.y + 1.0);
                vec3 color = attenuation * ((1.0 - a) * vec3(1.0, 1.0, 1.0) + a * vec3(0.5, 0.7, 1.0));

                return color;
            }
        }
    }`,

    `// function meant for doing the sampling process
    vec3 sampleColor(vec3 color) {
        float r = color.x;
        float g = color.y;
        float b = color.z;

        // Divide the color by the number of samples.
        float scale = 1.0 / SAMPLES_PER_PIXEL;
        r *= scale;
        g *= scale;
        b *= scale;

        interval intensity = interval(0.0, 1.0);

        return vec3(clamp(r, intensity.min, intensity.max),
                    clamp(g, intensity.min, intensity.max),
                    clamp(b, intensity.min, intensity.max));
    }`,

    `
    vec3 pixelColor(vec2 pixel, Camera cam, Sphere[MAX_SPHERE] orb) {
        vec3 color;
        noise variability;

        for (float i; i < SAMPLES_PER_PIXEL; i++) {
            // we are creating a ray instance for every pixel
            Ray ray = getRay(pixel, cam, i, variability);

            color += rayColor(pixel, orb, ray, pixel.yx);
        }

        return sampleColor(color);
    }`
]

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

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        

        const shaders = {
            vs: `#version 300 es
                    precision highp float;

                    in vec4 position;
                    
                    void main () {
                    gl_Position = position;
                    }`,

            fs: `#version 300 es
                    
                    precision highp float;
                    
                    out vec4 fragColor;

                    ${pixelCode.join("\n//----------------")} // interjected code

                    void main() {

                        // initialize camera
                        Camera cam = getCamera();

                        // setting up every sphere
                        Sphere world[MAX_SPHERE];

                        world[0] = Sphere(vec3(0.0, 0.0, -1.0), 0.5);
                        world[1] = Sphere(vec3(0.0, -100.5, -1.0), 100.0);

                        fragColor = vec4(pixelColor(gl_FragCoord.xy, cam, world), 1.0);
                    }`
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

        const uniforms = {
            camera_center: camera_center,
            image_height: image_height,
            image_width: image_width,
            viewport_height: viewport_height,
            viewport_width: viewport_width,
            resolution: resolution
            
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
                <canvas id="myCanvas3" width="800" height="450"></canvas>
            </div>
        </>
    );
};

export default Raytrace;
