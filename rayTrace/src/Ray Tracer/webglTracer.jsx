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
    `,

    `
    // constants
    #define PI 3.1415926538;
    #define INFINITY 1.0 / 0.00000000001;
    `,

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

    `
    // defining if the ray is hitting the inside or outside and makeing the normal point accordingly
    void setFaceNormal(Ray ray, vec3 outwardNormal, hitRecord rec) {

        if (dot(ray.direction, outwardNormal) < 0.0)
            rec.frontFace = true;
        else
            rec.frontFace = false;

        rec.normal = rec.frontFace ? outwardNormal : -outwardNormal;

        return;
    }`,

    `
    // defining a sphere
    struct Sphere {
        vec3 center;
        float radius;
    };`,

    `
    // defining the specific point on a ray
    vec3 pointOnRay(Ray ray, float t) {
        return (ray.origin + t * ray.direction);
    }`,

    `
    // defining a hit specific to spheres and the possible amount of roots based from the discriminant
    bool hit_sphere(Ray ray, float ray_tmin, float ray_tmax, Sphere ball, hitRecord rec) {
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

        if (root <= ray_tmin || ray_tmax <= root) {
            root = (-half_b + sqrtd) / a;

            if (root <= ray_tmin || ray_tmax <= root)
                return false;
        }

        rec.t = root;
        rec.p = pointOnRay(ray, root);
        rec.normal = (rec.p - ball.center) / ball.radius;

        vec3 outward_normal = (rec.p - ball.center) / ball.radius;
        setFaceNormal(ray, outward_normal, rec);

        return true;
    }`,

    `// geting a ray (mainly finding the direction between the camera and viewport)
    Ray getRay(vec2 pixel) {
        Ray ray;

        float focal_length = 1.0;

        vec3 viewport_u = vec3(viewport_width, 0, 0);
        vec3 viewport_v = vec3(0, viewport_height, 0);
        vec3 pixel_delta_u = viewport_u / image_width;
        vec3 pixel_delta_v = viewport_v / image_height;

        // Calculate the location of the upper left pixel.
        vec3 viewport_upper_left = camera_center - vec3(0, 0, focal_length) - viewport_u / 2.0 - viewport_v / 2.0;
        vec3 pixel00_loc = viewport_upper_left + 0.5 * (pixel_delta_u + pixel_delta_v);

        vec3 pixelCenter = pixel00_loc + (pixel.x * pixel_delta_u) + (pixel.y * pixel_delta_v);
        
        ray.origin = camera_center;
        ray.direction = pixelCenter - camera_center;
        return ray;
    }`,

    `
    // calculates if a ray hits a sphere and the normals
    float hitSphere(vec3 spherePos, float radius, Ray ray) {
        vec3 oc = ray.origin - spherePos;

        float a = dot(ray.direction, ray.direction);
        float half_b = dot(oc, ray.direction);
        float c = dot(oc, oc) - radius * radius;
        float discriminant = half_b * half_b - a * c;

        if (discriminant < 0.0)
            return -1.0;
        else
            return (-half_b - sqrt(discriminant) ) / (a);
    }`,

    `
    vec3 pixelColor(vec2 pixel) {
        vec3 color = vec3(0., 0., 0.);

        // we are creating a ray instance for every pixel
        Ray ray = getRay(pixel);

        // creating a sphere and its normals (t is a point on the ray {P(t) = A + tb})
        float t = hitSphere(vec3 (0.0, 0.0, -1.0), 0.5, ray);

        if (t > 0.0) {
            vec3 N = normalize(pointOnRay(ray, t) - vec3(0.0, 0.0, -1.0));
            return 0.5 * vec3(N.x + 1.0, N.y + 1.0, N.z + 1.0);
        }

        // logic for creating background blue -> white gradient
        vec3 unitDirection = normalize(ray.direction);
        float a = 0.5 * (unitDirection.y + 1.0);
        color = (1.0 - a) * vec3(1.0, 1.0, 1.0) + a * vec3(0.5, 0.7, 1.0);

        return color;
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
                        fragColor = vec4(pixelColor(gl_FragCoord.xy), 1.0);
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
