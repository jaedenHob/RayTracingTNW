import React, { useState, useRef, useEffect } from 'react';
import * as twgl from 'twgl.js';

const pixelCode = [

    // uniforms
    `
    uniform sampler2D u_texture;
    uniform  vec3 camera_center;
    uniform vec3 pixel_delta_u;
    uniform vec3 pixel_delta_v;
    uniform vec3 pixel00_loc;
    uniform float iteration;
    uniform float seed;
    uniform float defocus_angle;
    uniform vec3 defocus_disk_u;
    uniform vec3 defocus_disk_v;
    `,

    `
    // constants
    #define PI 3.1415926538
    #define INFINITY 1.0 / 0.00000000001
    #define MAX_SPHERE 10
    #define RAND_MAX 2147483647.0
    // #define SAMPLES_PER_PIXEL 100.0
    #define MAX_RAY_BOUNCES 5

    // values we will use when determining matrial type
    #define LAMBERTIAN 0
    #define METAL 1
    #define DIELECTRIC 2
    `,

    // auxilary functions
    `
    // linearly interpolate between two values
    vec3 mix(vec3 x, vec3 y, float a) {
            return x * (1.0 - a) + y * a;
    }`,

    `
    // check if all of a vector's components are near zero
    bool near_zero(vec3 a) {
        // returns true if close to zero in all dimensions
        float s = 0.00000001;

        if ((abs(a.x) < s) && (abs(a.y) < s) && (abs(a.z) < s))
            return true;
        else
            return false;
    }`,

    // functions for computing reflecting and refractions
    `
    // computing a reflected vector
    vec3 reflection(vec3 v, vec3 n) {
        return v - 2. * dot(v, n) * n;
    }`,

    `
    // function to calculate refractions
    vec3 refracting(vec3 uv, vec3 n, float etai_over_etat) {
        float cos_theta = min(dot(-uv, n), 1.0);

        vec3 r_out_perp = etai_over_etat * (uv + cos_theta * n);
        vec3 r_out_parallel = -sqrt(abs(1.0 - dot(r_out_perp, r_out_perp))) * n;
        return r_out_perp + r_out_parallel;
    }`,

    `
    // function for reflectance by using shlicks approximation of reflectance
    float reflectance(float cosine, float refraction_index) {
        float r0 = (1. - refraction_index) / (1. + refraction_index);
        r0 = r0 * r0;

        return r0 + (1. - r0) * pow((1. - cosine), 500.);
    }`,

    // structs to be treated almost as if creating objects

    `
    // defining specific material and its characteristics
    struct Material {
        int type;

        vec3 albedo;

        float fuzzyness;
        float refraction_index;
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
    // returns a vector to a random point on a unit disk
    vec3 random_in_unit_disk(vec2 st) {
        float i = 1.0;
        vec2 tmp = st;

        while(true) {
            vec3 p = vec3(random_double_interval(tmp, -1.0, 1.0), random_double_interval(tmp * (seed + 2.), -1.0, 1.0), 0);
            
            if (dot(p, p) < 1.) {
                return p;
            }

            tmp = vec2(tmp.x + i, tmp.y + i);
            i += seed;
        }
    }`,

    `
    // returns a random point in a camera defocus disk
    vec3 defocus_disk_sample(vec2 st) {
        vec3 p = random_in_unit_disk(st);
        return camera_center + (p[0] * defocus_disk_u) + (p[1] * defocus_disk_v);
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

        // vec3 ray_origin = camera_center;
        vec3 ray_origin = (defocus_angle <= 0.0) ? camera_center : defocus_disk_sample(st);
        vec3 ray_direction = pixel_sample - ray_origin;

        // created ray
        Ray r = Ray(ray_origin, ray_direction);

        return r;
    }`,

    // functions for calculating light reflections from different sphere material types
    `
    // lambertian scatter
    bool lambertian_scatter(out vec3 scatter_direction, out vec3 attenuation, hit_record rec, vec2 st) {
        // new direction for the new ray that bounces off a surface
        scatter_direction = rec.normal + random_unit_vector(st);

        // avoid any degenerate scatter
        if (near_zero(scatter_direction)) {
            scatter_direction = rec.normal;
        }

        attenuation *= rec.mat.albedo;
        return true;
    }`,

    `
    // metal scatter function
    bool metalic_scatter(Ray ray_in, out vec3 scatter_direction, out vec3 attenuation, hit_record rec, vec2 st) {
        // local variables
        vec3 reflected;

        // new direction for the new ray that bounces off a surface (reflected)
        reflected = reflection(ray_in.direction, rec.normal);

        scatter_direction = normalize(reflected) + (rec.mat.fuzzyness * random_unit_vector(st));

        attenuation *= rec.mat.albedo;

        return (dot(scatter_direction, rec.normal) > 0.0);
    }`,

    `
    // dielectric scatter function
    bool dielectric_scatter(Ray ray_in, out vec3 scatter_direction, out vec3 attenuation, hit_record rec, vec2 st) {
        attenuation = vec3(1., 1., 1.);

        float ri = rec.front_face ? (1.0 / rec.mat.refraction_index) : rec.mat.refraction_index;
        
        vec3 unit_direction = normalize(ray_in.direction);

        float cos_theta = min(dot(-unit_direction, rec.normal), 1.0);
        float sin_theta = sqrt(1.0 - cos_theta * cos_theta);

        bool cannot_refract;
        vec3 direction;

        if ((ri * sin_theta) > 1.0) {
            cannot_refract = true; // reflect
        } else {
            cannot_refract = false; // refract
        }

        if (cannot_refract || reflectance(cos_theta, ri) > random_double(st)) {
            direction = reflection(unit_direction, rec.normal);
        } else {
            direction = refracting(unit_direction, rec.normal, ri);
        }

        scatter_direction = direction;

        return true;
    }
    `,

    `
    // calcualte the color for pixel based on rays direction
    vec3 ray_color(in Ray ray, Sphere[MAX_SPHERE] world, vec2 st) {
        hit_record rec;

        int bounce = 0;
        
        Ray curr = ray; // tracking current ray calculations

        vec3 attenuation = vec3(1.);
        vec3 scatter_direction;
        vec3 color;

        // terminates loop when true
        bool stop = false;
        bool continue_bouncing;

        while (bounce <= MAX_RAY_BOUNCES && stop == false) {

            continue_bouncing = false;

            if (hit_list(world, curr, interval(0.001, INFINITY), rec)) {

                // need a set of switch or if statements based on sphere material type
                if (rec.mat.type == LAMBERTIAN) { // lambertian light scatter

                    if (lambertian_scatter(scatter_direction, attenuation, rec, st)) {
                        continue_bouncing = true;
                    } 
                }
                else if (rec.mat.type == METAL) { // metal light reflectance

                    if (metalic_scatter(curr, scatter_direction, attenuation, rec, st)) {
                        continue_bouncing = true;
                    }
                } 
                else if (rec.mat.type == DIELECTRIC) { // metal light reflectance

                    if (dielectric_scatter(curr, scatter_direction, attenuation, rec, st)) {
                        continue_bouncing = true;
                    }
                }

                
                if (continue_bouncing) { // if we can continue boucing let variables change
                    // create new ray from point of collision (will be used in the next loop if bounce < Max_bounce)
                    curr = Ray(rec.p, scatter_direction);

                    // increment bounce since we hit something
                    bounce++;
                } 
                else { // cannot continue then flag to stop and return the color black
                    color = vec3(0.);
                    stop = true;
                }

            } else { // draw background since ray hit nothing (no bounce.... sadge)
                
                vec3 unit_direction = normalize(curr.direction);
                float a = 0.5 * (unit_direction.y + 1.0);
                color = (1.0 - a) * vec3(1.0, 1.0, 1.0) + a * vec3(0.5, 0.7, 1.0);

                return (color * attenuation);

            } 
        }
        // if we break out of loop without returning then return the color black
        return color;
    }`,
]

const Raytrace = () => {

    // auxilary functions for camera
    function degrees_to_radians(degrees) {
        return degrees * (3.1415926538) / 180.0;
    }

    function distance(p1, p2) {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        const dz = p1[2] - p2[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function normalize(vector) {
        // Calculate the magnitude of the vector
        const magnitude = Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2]);

        // Check if the magnitude is not zero to avoid division by zero
        if (magnitude !== 0) {
            // Divide each component by the magnitude to normalize the vector
            const normalizedVector = [
                vector[0] / magnitude,
                vector[1] / magnitude,
                vector[2] / magnitude
            ];
            return normalizedVector;
        } else {
            // If the vector is already a zero vector, return the original vector
            return vector;
        }
    }

    function subtract_vectors(vec1, vec2) {
        return [
            vec1[0] - vec2[0],
            vec1[1] - vec2[1],
            vec1[2] - vec2[2]
        ]
    }

    function cross_product(vec1, vec2) {
        let x = vec1[1] * vec2[2] - vec1[2] * vec2[1];
        let y = vec1[2] * vec2[0] - vec1[0] * vec2[2];
        let z = vec1[0] * vec2[1] - vec1[1] * vec2[0];

        return [x, y, z];
    }

    function multiply_a_vector(vec1, multiple) {

        let x = vec1[0] * multiple;
        let y = vec1[1] * multiple;
        let z = vec1[2] * multiple;

        return [x, y, z];
    }

    function negative_vector(vec) {
        return[-vec[0], -vec[1], -vec[2]];
    }


    // variables local to Raytrace
    let width = 450;
    

    // canvas reference
    const canvasRef = useRef(null);

    const [cameraPosition, setCameraPosition] = useState([13.0, 2.0, -3.0]); // Initial camera position
    const [sliderValues, setSliderValues] = useState({
        posX: 13.0,
        posY: 2.0,
        posZ: -3.0
    });

    useEffect(() => {

        // Update camera position when slider values change

        if (cameraPosition[0] !== sliderValues.posX || cameraPosition[1] !== sliderValues.posY || cameraPosition[2] !== sliderValues.posZ)
            setCameraPosition([sliderValues.posX, sliderValues.posY, sliderValues.posZ]);

        const vfov = 20;

        const lookfrom = cameraPosition; // point camera is looking from
        const lookat = [0.0, 0.0, 0.0]; // point that camera is looking at
        const vup = [0.0, -1.0, 0.0]; // camera up direction

        
        let defocus_angle = 0.6; // variation angle of rays through each pixel
        let focus_dist = 10.0; //distance of camera from plane of perfect focus

        let u, v, w; // camra frame basis vectors

        // rendered image setup
        const aspect_ratio = 16.0 / 9.0;
        const image_width = width;

        // calculate image height that is at least 1
        var image_height = image_width / aspect_ratio;

        let height = image_height;

        // console.log(image_height);

        // camera (viewport dimensions)
        const camera_center = lookfrom;

        // const focal_length = distance(lookfrom, lookat);
        const theta = degrees_to_radians(vfov);
        const h = Math.tan(theta/2.);
        const viewport_height = 2.0 * h * focus_dist;
        const viewport_width = viewport_height * (image_width / image_height);

        // calculate the u, v, w unit basis vectors for the camera coordinate frame
        w = normalize(subtract_vectors(lookfrom, lookat));
        u = normalize(cross_product(vup, w));
        v = cross_product(w, u);

        // Calculate the vectors across the horizontal and down the vertical viewport edges.
        let viewport_u = multiply_a_vector(u, viewport_width);
        let viewport_v = multiply_a_vector(negative_vector(v), viewport_height);

        // Calculate the horizontal and vertical delta vectors from pixel to pixel.
        let pixel_delta_u = viewport_u.map(component => component / image_width);
        let pixel_delta_v = viewport_v.map(component => component / image_height);

        // console.log(pixel_delta_u + " " + pixel_delta_v);

        // Calculate the location of the upper left pixel.
        let focal_w = multiply_a_vector(w, focus_dist);

        let viewport_upper_left = [
            camera_center[0] - (focal_w[0]) - (0.5 * viewport_u[0]) - (0.5 * viewport_v[0]),
            camera_center[1] - (focal_w[1]) - (0.5 * viewport_u[1]) - (0.5 * viewport_v[1]),
            camera_center[2] - (focal_w[2]) - (0.5 * viewport_u[2]) - (0.5 * viewport_v[2])
        ];

        // console.log(viewport_upper_left);

        let pixel00_loc = [
            viewport_upper_left[0] + 0.5 * (pixel_delta_u[0] + pixel_delta_v[0]),
            viewport_upper_left[1] + 0.5 * (pixel_delta_u[1] + pixel_delta_v[1]),
            viewport_upper_left[2] + 0.5 * (pixel_delta_u[2] + pixel_delta_v[2])
        ];
        
        // calculate the camera defocus disk basis vectors
        let defocus_radius = focus_dist * Math.tan(degrees_to_radians(defocus_angle / 2.));
        let defocus_disk_u = multiply_a_vector(u, defocus_radius);
        let defocus_disk_v = multiply_a_vector(v, defocus_radius);


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
                fragColor = vec4(0., 0., 0.0, 1.0);
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
                
                // initializing world array
                Sphere world[MAX_SPHERE];

                // creating the ground
                Material ground = Material(0, vec3(0.5), 0., 0.);
                world[0] = Sphere(vec3(0, -1000.0, 0), 1000.0, ground);

                // the three distinct large spheres in scene
                Material sphere1 = Material(2, vec3(0.0), 0.0, 1.5);
                world[1] = Sphere(vec3(0., 1.0, 0.), 1.0, sphere1);

                Material sphere2 = Material(0, vec3(0.4, 0.2, 0.1), 0., 0.);
                world[2] = Sphere(vec3(-4., 1.0, 0.0), 1.0, sphere2);

                Material sphere3 = Material(1, vec3(0.7, 0.6, 0.5), 0., 0.);
                world[3] = Sphere(vec3(4., 1.0, 0.), 1.0, sphere3);

                // manual input of spheres

                // the three distinct large spheres in scene
                Material sphere4 = Material(2, vec3(0.0), 0.0, 1.5);
                world[4] = Sphere(vec3(2.5, 0.2, -3.), 0.2, sphere4);

                Material sphere5 = Material(0, vec3(1., 0.2, 0.1), 0., 0.);
                world[5] = Sphere(vec3(6., 0.2, -1.0), 0.2, sphere5);

                Material sphere6 = Material(1, vec3(0.0, 1., 0.5), 0., 0.);
                world[6] = Sphere(vec3(8., 0.2, 0.), 0.2, sphere6);

                // the three distinct large spheres in scene
                Material sphere7 = Material(2, vec3(0.0), 0.0, 1.5);
                world[7] = Sphere(vec3(9., 0.2, -3.), 0.2, sphere7);

                Material sphere8 = Material(0, vec3(0.3, 0.7, 0.7), 0., 0.);
                world[8] = Sphere(vec3(-7., 0.5, -4.0), 0.5, sphere8);

                Material sphere9 = Material(1, vec3(1.0, 0.0, 1.0), 0., 0.);
                world[9] = Sphere(vec3(0., 0.2, 3.0), 0.2, sphere9);

                // Random spheres generation to generate final scene applying all techniques
                // from raytracing in one weekend (gonna manually generate spheres into world due to performance issues)

                // int index = 3;
                // vec3 albedo;

                // float fuzz;

                // for (int a = -11; a < 11; a++) {
                //     for (int b = -11; b < 11; b++) {
                //         float choose_mat = random_double(st * float((a + 22) + b));

                //         vec3 center = vec3(float(a) + 0.9 * random_double(vec2(st.x + seed + float(a + 11), st.y + seed + float(a + 11))), 
                //                            0.2, 
                //                            float(b) + 0.9 * random_double(vec2(st.y + seed + float(b + 11), st.x + seed + float(b + 11))));
                        
                //         if (index < MAX_SPHERE)
                //             if (length(center - vec3(4, 0.2, 0.)) > 0.9) {
                //                 index++;
                //                 if (choose_mat < 0.8) {
                //                     // diffuse sphere
                //                     albedo = vec3(random_double(center.xy) * random_double(center.yx), random_double(center.yz) * random_double(center.zy), random_double(center.xz) * random_double(center.zx));
                //                     world[index] = Sphere(center, 0.2, Material(0, albedo, 0., 0.));
                //                 } else if (choose_mat < 0.95) {
                //                     // metal sphere
                //                     albedo = vec3(random_double(center.xy) * random_double(center.yx), random_double(center.yz) * random_double(center.zy), random_double(center.xz) * random_double(center.zx));
                //                     fuzz = random_double_interval(center.yx, 0.0, 0.5);
                //                     world[index] = Sphere(center, 0.2, Material(1, albedo, fuzz, 0.0));
                //                 } else {
                //                     // glass sphere
                //                     world[index] = Sphere(center, 0.2, Material(2, vec3(0.0), 0.0, 1.5));
                //                 }
                //             }
                //     }
                // }


                // code for interpolating colors
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
                seed: seed,
                defocus_angle: defocus_angle,
                defocus_disk_u: defocus_disk_u,
                defocus_disk_v: defocus_disk_v
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
    }, [cameraPosition, sliderValues]);

    // Event handler for slider value changes
    const handleSliderChange = (e) => {
        const { name, value } = e.target;
        setSliderValues(prevState => ({
            ...prevState,
            [name]: parseFloat(value)
        }));
    };

    return (
        <>
            <div className='centered-container'>
                <div>fps: <span id="fps"></span></div>
                
                <canvas ref={canvasRef} width={width} height={width / (16.0 / 9.0)}></canvas>

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
                        value={sliderValues.posX}
                        onChange={handleSliderChange}
                    />
                    <label>Position Y:</label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.1"
                        name="posY"
                        value={sliderValues.posY}
                        onChange={handleSliderChange}
                    />
                    <label>Position Z:</label>
                    <input
                        type="range"
                        min="-20"
                        max="20"
                        step="0.1"
                        name="posZ"
                        value={sliderValues.posZ}
                        onChange={handleSliderChange}
                    />
                </div>
                
            </div>
        </>
    );
};

export default Raytrace;
