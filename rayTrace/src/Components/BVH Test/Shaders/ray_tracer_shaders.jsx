// drawing particles
const v_Draw = `#version 300 es
    precision mediump float;

    in vec2 vPosition;

    out vec2 texCoord;
    void main () {
    texCoord = (vPosition+1.)/2.;
    gl_Position = vec4(vPosition, 0., 1.0);
    }`;
const f_Draw = `#version 300 es
    precision mediump float;
    in vec2 texCoord;
    out vec4 fragColor;
    uniform sampler2D u_texture;
    void main () {
    fragColor = texture(u_texture, texCoord);
    }`;

// update information
const v_Update = `
#version 300 es
    precision mediump float;

    in vec2 position;
    out vec2 v_texcoord;
    
    void main() {
      v_texcoord = 0.5 * position + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }`;

// main ray tracer logic
const f_update_tracer = `
#version 300 es

precision mediump float;

// global variables
in vec2 v_position;
in vec2 v_texcoord;

out vec4 fragColor;

float global_seed = 0.0; // seed variable (global)
vec2 psudo_seed = vec2(3.913, 59.121);

// uniforms
uniform sampler2D u_texture;
uniform sampler2D BVH_texture;
uniform int textureWidth;
uniform float width;
uniform vec3 camera_center; // user input for camera position
uniform float texture_weight;
uniform float iteration;
uniform float seedA;
uniform float seedB;


// constants
#define PI 3.1415926538
#define INFINITY 100.0
#define MAX_SPHERE 4
#define RAND_MAX 2147483647.0
#define MAX_RAY_BOUNCES 5

// values we will use when determining matrial type
#define LAMBERTIAN 0
#define METAL 1
#define DIELECTRIC 2

// values for collidable objects
#define STATIONARY_SPHERE 0
#define MOVING_SPHERE 1

// auxilary functions
float double_time() {
    float tm;

    return tm;
}
float degrees_to_radians(float degrees) {
    return degrees * PI / 180.;
}

// gamma correction
float linear_to_gamma(float color_component) {
    if (color_component > 0.0)
        return sqrt(color_component);

    return 0.;
}

// check if all of a vector's components are near zero
bool near_zero(vec3 a) {
    // returns true if close to zero in all dimensions
    float s = 1e-8;

    return (abs(a.x) < s) && (abs(a.y) < s) && (abs(a.z) < s);
}

// function for reflectance by using shlicks approximation of reflectance
float reflectance(float cosine, float refraction_index) {
    float r0 = (1. - refraction_index) / (1. + refraction_index);
    r0 = r0 * r0;

    return r0 + (1. - r0) * pow((1. - cosine), 500.);
}

// reflected vector calculation
vec3 reflection(vec3 v, vec3 n) {
    return v - 2. * dot(v, n) * n;
}

// refracted vector calculation function
vec3 refraction(vec3 uv, vec3 n, float etai_over_etat) {
    float cos_theta = min(dot(-uv, n), 1.0);

    vec3 r_out_perp = etai_over_etat * (uv + cos_theta * n);
    vec3 r_out_parallel = -sqrt(abs(1.0 - dot(r_out_perp, r_out_perp))) * n;
    return r_out_perp + r_out_parallel;
}

// structs

// global struct camera
struct Camera {
    float aspect_ratio;
    float image_width;
    float vfov;
    float defocus_angle;
    float focus_dist;
    vec3 lookfrom;
    vec3 lookat;
    vec3 vup;
    vec3 u, v, w;
    vec3 pixel_delta_u;
    vec3 pixel_delta_v;
    vec3 pixel00_loc;
    vec3 defocus_disk_u;
    vec3 defocus_disk_v;

};

Camera cam; // needs variables to be setup before use

// struct to define materials
struct Material {
    int type;
    
    vec3 albedo;
    
    float fuzzyness;
    float refraction_index;
};

// defining a ray
struct Ray {
    vec3 origin;
    vec3 direction;

    float time;
};

// defining records of what rays hit
struct hit_record {
    vec3 p;
    vec3 normal;
    
    float t;

    bool front_face;

    Material mat;
};

// defining an interval
struct interval {
    float min;
    float max;
};

// struct to define AABB (Axis-Aligned Bounding Boxes)
struct AABB {
    interval x;
    interval y;
    interval z;
};

// defining a object a ray can collide with (will expand to other objects such a box or moving sphere)
struct Sphere {
    int object_type;

    vec3 center1, center2;

    float radius;

    Material mat;
};

// defining a BVH node
struct BVH_Node {
    vec3 minBounds;
    vec3 maxBounds;
    int left;
    int right;
    int objectIndex;
};

// define BVH tree
struct BVH_Tree {
    int node_count;
    int root_index;
};

// testing global sphere & tree array
// Sphere sphere_array[MAX_SPHERE];
// BVH_Tree bvh_nodes[MAX_SPHERE];


// interval functions

// based on int parameter pick to return a specific interval
interval axis_interval(int n, AABB plane) {
    if (n == 1) return plane.y;
    if (n == 2) return plane.z;
    return plane.x;
}

// new interval function that pads an interval via a given amount
interval expand(float delta, float min, float max) {
    float padding = delta / 2.;
    interval result = interval(min - padding, max + padding);
    return result;
}

// check interval size
float interval_size(interval t) {
    return t.max - t.min;
}

// check if t for a ray is within acceptable range
bool interval_contains(float x, interval t) {
    return t.min <= x && x <= t.max;
}

// check if t for a ray is within acceptable range
bool interval_surrounds(float x, interval t) {
    return t.min < x && x < t.max;
}

// returns a random float value from [0, 1)
float rand() {
    highp float c = 43758.5453;
    highp float dt= dot(gl_FragCoord.xy, vec2((global_seed += 0.01), (global_seed += 0.01)));
    highp float sn= mod(dt, PI);

    return fract(sin(sn) * c);
}
    
// returns a vector of random doubles
float random_double() {
    return rand();
}

// returns a vector of random doubles within a range
float random_double_interval(float min, float max) {
    return min + (max - min) * random_double();
}

void set_face_normal(Ray r, vec3 outward_normal, out hit_record rec) {
    // Sets the hit record normal vector.
    // NOTE: the parameter "outward_normal" is assumed to have unit length.

    rec.front_face = dot(r.direction, outward_normal) < 0.0;

    rec.normal = rec.front_face ? outward_normal : -outward_normal;

}

// defining a specific point of a ray
vec3 point_on_ray(Ray ray, float t) {
    return (ray.origin + t * ray.direction);
}   

// hitting a AABB
bool hit_AABB(AABB box, Ray r, interval ray_t) {
    vec3 ray_origin = r.origin;
    vec3 ray_direction = r.direction;

    for (int axis = 0; axis < 3; axis++) {
        interval ax = axis_interval(axis, box);

        float adinv = 1.0 / ray_direction[axis];

        float t0 = (ax.min - ray_origin[axis]) * adinv;
        float t1 = (ax.max - ray_origin[axis]) * adinv;

        if (t0 < t1) {
            if (t0 > ray_t.min) ray_t.min = t0;
            if (t1 < ray_t.max) ray_t.max = t1;
        } else {
            if (t1 > ray_t.min) ray_t.min = t1;
            if (t0 < ray_t.max) ray_t.max = t0;
        }
        
        if (ray_t.max <= ray_t.min)
            return false;
    }
    return true;
}

// calculate moving sphere center a given time between 0 and 1
vec3 center_at(Ray ray, vec3 center1, vec3 center2) {
    return center1 + ((ray.time - 0.0) / (1.0 - 0.0)) * (center2 - center1);
}

// hitting a sphere within a valid interval
bool hit(Sphere orb, float radius, Ray r, interval ray_t, out hit_record rec) {
    // if else to handle hits for specific objects in the scene
    if (orb.object_type == STATIONARY_SPHERE) {
        vec3 oc = orb.center1 - r.origin;
        float a = dot(r.direction, r.direction);
        float h = dot(r.direction, oc);
        float c = dot(oc, oc) - pow(radius, 2.);

        float discriminant = h * h - a * c;

        if (discriminant < 0.) // ealry termination if no contact
            return false;

        float sqrtd = sqrt(discriminant);

        // find the nearest root that lies in the acceptable range
        float root = (h - sqrtd) / a;

        if (!interval_surrounds(root, ray_t)) {
            root = (h + sqrtd) / a;

            if (!interval_surrounds(root, ray_t))
                return false;
        }
        
        rec.t = root;
        rec.p = point_on_ray(r, root);
        vec3 outward_normal = (rec.p - orb.center1) / radius;
        set_face_normal(r, outward_normal, rec);

        rec.mat = orb.mat;
        return true;
    } else if (orb.object_type == MOVING_SPHERE) {
        vec3 current_center = center_at(r, orb.center1, orb.center2);
        vec3 oc = current_center - r.origin;
        float a = dot(r.direction, r.direction);
        float h = dot(r.direction, oc);
        float c = dot(oc, oc) - pow(radius, 2.);

        float discriminant = h * h - a * c;

        if (discriminant < 0.) // ealry termination if no contact
            return false;

        float sqrtd = sqrt(discriminant);

        // find the nearest root that lies in the acceptable range
        float root = (h - sqrtd) / a;

        if (!interval_surrounds(root, ray_t)) {
            root = (h + sqrtd) / a;

            if (!interval_surrounds(root, ray_t))
                return false;
        }
        
        rec.t = root;
        rec.p = point_on_ray(r, root);
        vec3 outward_normal = (rec.p - current_center) / radius;
        set_face_normal(r, outward_normal, rec);

        rec.mat = orb.mat;
        return true;
    }
    
}

// rand function for creating random spheres
float psudo_rand(vec2 st,out vec2 seed) {
    highp float c = 43758.5453;
    highp float dt= dot(st, seed);

    // update st to avoid artifacting
    seed.x += 0.01;
    seed.y += 0.01;

    highp float sn= mod(dt, PI);

    return fract(sin(sn) * c);
}

interval merge_intervals(interval a, interval b) {
    // Create the interval tightly enclosing the two input intervals
    interval combined_interval;

    combined_interval.min = a.min <= b.min ? a.min : b.min;
    combined_interval.max = a.max >= b.max ? a.max : b.max;

    return combined_interval;
}

AABB merge_AABB (AABB box1, AABB box2) {
    AABB new_box;

    interval x = merge_intervals(box1.x, box2.x);
    interval y = merge_intervals(box1.y, box2.y);
    interval z = merge_intervals(box1.z, box2.z);

    new_box = AABB(x, y, z);

    return new_box;
}

// Treat the two points a and b as extrema for the bounding box, so we don't require a
// particular minimum/maximum coordinate order.
AABB create_AABB(vec3 a, vec3 b) {
    AABB box;

    if (a.x <= b.x) {
        box.x = interval(a.x, b.x);
    } else {
        box.x = interval(b.x, a.x);
    }

    if (a.y <= b.y) {
        box.y = interval(a.y, b.y);
    } else {
        box.y = interval(b.y, a.y);
    }

    if (a.z <= b.z) {
        box.z = interval(a.z, b.z);
    } else {
        box.z = interval(b.z, a.z);
    }
    
    return box;
}

bool hit_list(Ray r, interval ray_t, out hit_record rec) {
    // local variables
    hit_record temp_rec;

    bool hit_anything = false;

    float closest_so_far = ray_t.max;

    vec2 sphere_seed = vec2(65.2465, 5.0234);

    // main spheres materials
    Material ground_mat = Material(LAMBERTIAN, vec3(0.5, 0.5, 0.5), 0., 0.);

    Material material1 = Material(DIELECTRIC, vec3(0., 0., 0.), 0., 1.5);

    Material material2 = Material(LAMBERTIAN, vec3(0.4, 0.2, 0.1), 0., 0.);

    Material material3 = Material(METAL, vec3(0.7, 0.6, 0.5), 0., 0.);

    // spheres
    Sphere ground = Sphere(STATIONARY_SPHERE, 
                        vec3(0.0, -1000.0, 0.0),
                        vec3(0.), 
                        1000.0,
                        ground_mat
                    );

    Sphere giant_glass = Sphere(STATIONARY_SPHERE, 
                            vec3(0.0, 1.0, 0.0),
                            vec3(0.), 
                            1.0,
                            material1
                         );

    Sphere giant_lambertian = Sphere(STATIONARY_SPHERE, 
                                vec3(-4.0, 1.0, 0.0),
                                vec3(0.), 
                                1.0,
                                material2
                              );

    Sphere giant_metal = Sphere(STATIONARY_SPHERE, 
                           vec3(4.0, 1.0, 0.0),
                           vec3(0.), 
                           1.0,
                           material3
                         );

    // hitting the four spheres that do not change
    if (hit(ground, ground.radius, r, interval(ray_t.min, closest_so_far), temp_rec)) {
        hit_anything = true;
        closest_so_far = temp_rec.t;
        rec = temp_rec;
    }

    // if (hit(giant_glass, giant_glass.radius, r, interval(ray_t.min, closest_so_far), temp_rec)) {
    //     hit_anything = true;
    //     closest_so_far = temp_rec.t;
    //     rec = temp_rec;
    // }

    // if (hit(giant_lambertian, giant_lambertian.radius, r, interval(ray_t.min, closest_so_far), temp_rec)) {
    //     hit_anything = true;
    //     closest_so_far = temp_rec.t;
    //     rec = temp_rec;
    // }

    // if (hit(giant_metal, giant_metal.radius, r, interval(ray_t.min, closest_so_far), temp_rec)) {
    //     hit_anything = true;
    //     closest_so_far = temp_rec.t;
    //     rec = temp_rec;
    // }

    // loop to generate sphere and check for collision
    // removed for debugging
    // for (int i = -7; i < 7; i++) {
    //     for (int j = -7; j < 7; j++) {
    //         vec2 sphere_seed = vec2(float(i), float(j));

    //         float choose_mat = psudo_rand(vec2(90.901, 18.816), sphere_seed);

    //         vec3 center_point = vec3(
    //                              float(i) + 0.9 * psudo_rand(vec2(6.232, 10.618), sphere_seed),
    //                              0.2,
    //                              float(j) + 0.9 * psudo_rand(vec2(77.313, 40.005), sphere_seed));

    //         if (distance(center_point, vec3(4., 0.2, 0.)) > 0.9) {
                
    //             if (choose_mat < 0.8) {
    //                 // lambertian sphere
    //                 vec3 albedo = vec3(
    //                                    psudo_rand(vec2(6.232, 50.912), sphere_seed),
    //                                    psudo_rand(vec2(12.886, 0.910), sphere_seed),
    //                                    psudo_rand(vec2(29.5, 87.422), sphere_seed));

    //                 Material surface = Material(
    //                                 LAMBERTIAN,
    //                                 albedo,
    //                                 0.,
    //                                 0.);

    //                 Sphere curr_sphere;

    //                 curr_sphere = Sphere(STATIONARY_SPHERE, center_point, vec3(0.), 0.2, surface);

    //                 // if (psudo_rand(vec2(12.124, 88.293), psudo_seed) > 0.8) {
    //                 //     // create current sphere (moving)
    //                 //     curr_sphere = Sphere(MOVING_SPHERE, center_point, center_point + vec3(0., 0.8 * psudo_rand(vec2(26.252, 12.143), psudo_seed), 0.), 0.2, surface);
    //                 // } else {
    //                 //     // create current sphere (stationary)
    //                 //     curr_sphere = Sphere(STATIONARY_SPHERE, center_point, vec3(0.), 0.2, surface);
    //                 // }


    //                 if (hit(curr_sphere, curr_sphere.radius, r, interval(ray_t.min, closest_so_far), temp_rec)) {
    //                     hit_anything = true;
    //                     closest_so_far = temp_rec.t;
    //                     rec = temp_rec;
    //                 } 
    //             } else if (choose_mat < 0.95) {
    //                 // METAL sphere
    //                 vec3 albedo = vec3(
    //                                    psudo_rand(vec2(6.232, 50.912), sphere_seed),
    //                                    psudo_rand(vec2(12.886, 0.910), sphere_seed),
    //                                    psudo_rand(vec2(29.5, 87.422), sphere_seed));

    //                 Material surface = Material(
    //                                 METAL,
    //                                 albedo,
    //                                 0.5 * psudo_rand(vec2(6.232, 50.912), sphere_seed),
    //                                 0.);

    //                 // create current sphere
    //                 Sphere curr_sphere = Sphere(STATIONARY_SPHERE, center_point, vec3(0.), 0.2, surface);

    //                 if (hit(curr_sphere, curr_sphere.radius, r, interval(ray_t.min, closest_so_far), temp_rec)) {
    //                     hit_anything = true;
    //                     closest_so_far = temp_rec.t;
    //                     rec = temp_rec;
    //                 } 
    //             } else {
    //                 // glass
    //                 vec3 albedo = vec3(0.0);

    //                 Material surface = Material(
    //                                 DIELECTRIC,
    //                                 albedo,
    //                                 0.0,
    //                                 1.5);

    //                 // create current sphere
    //                 Sphere curr_sphere = Sphere(STATIONARY_SPHERE, center_point, vec3(0.), 0.2, surface);

    //                 if (hit(curr_sphere, curr_sphere.radius, r, interval(ray_t.min, closest_so_far), temp_rec)) {
    //                     hit_anything = true;
    //                     closest_so_far = temp_rec.t;
    //                     rec = temp_rec;
    //                 }

    //             }
    //         }
    //     }
    // }


    return hit_anything;
}

// BVH Code
// extract BVH tree node data
BVH_Node getBVHData(int index) {
    // Each node takes 3 texels
    int baseIndex = index * 3;

    int texX = (baseIndex % textureWidth);
    int texY = (baseIndex / textureWidth);

    vec4 data1 = texelFetch(BVH_texture, ivec2(texX, texY), 0);
    vec4 data2 = texelFetch(BVH_texture, ivec2(texX + 1, texY), 0);
    vec4 data3 = texelFetch(BVH_texture, ivec2(texX + 2, texY), 0);

    BVH_Node node;
    node.minBounds = vec3(data1.x, data1.y, data1.z);
    node.maxBounds = vec3(data2.x, data2.y, data2.z);
    node.left = floatBitsToInt(data1.w);
    node.right = floatBitsToInt(data2.w);
    node.objectIndex = floatBitsToInt(data3.x);

    return node;
}

// bounding box intersection check
bool intersectAABB(vec3 rayOrigin, vec3 rayDir, vec3 minBounds, vec3 maxBounds) {
    rayDir = normalize(rayDir);  
    vec3 invDir = 1.0 / rayDir;

    // Handle edge cases where the ray direction is zero along any axis
    if (any(greaterThan(abs(rayDir), vec3(0.0)))) {
        vec3 tMin = (minBounds - rayOrigin) * invDir;
        vec3 tMax = (maxBounds - rayOrigin) * invDir;
        
        vec3 t1 = min(tMin, tMax);
        vec3 t2 = max(tMin, tMax);
        
        float tNear = max(max(t1.x, t1.y), t1.z);
        float tFar = min(min(t2.x, t2.y), t2.z);
        
        // Add a small epsilon to handle precision issues
        const float epsilon = 1e-6;
        return tNear <= tFar + epsilon && tFar > 0.0;
    }
    return false;  
}

float intersect_sphere(vec3 rayOrigin, vec3 rayDir, vec3 minBounds, vec3 maxBounds) {
    // Compute sphere center and radius from AABB
    vec3 center = (minBounds + maxBounds) * 0.5;  
    float radius = length(maxBounds - minBounds) * 0.5;  

    // Ray-sphere intersection
    vec3 oc = rayOrigin - center;  // Vector from ray origin to the sphere center
    float b = dot(oc, rayDir);  // Dot product of the direction and the offset
    float c = dot(oc, oc) - (radius * radius);  
    float h = b * b - c;  

    if (h < 0.0) return -1.0;  
    return -b - sqrt(h);  
}


// traverse BHD Nodes and see if ray intersects with a leaf node (object)
int traverseBVH(Ray r) {
    int stack[64];  // Stack to store node indices
    int stackPtr = 0;
    stack[stackPtr++] = 0;  // Start at the root node

    int closestObject = -1;
    float closestT = 1e20;  // Large value

    while (stackPtr > -1) {  // Continue while the stack has elements
        int nodeIndex = stack[--stackPtr];  // Pop stack
        BVH_Node node = getBVHData(nodeIndex);

        // Check if the ray intersects the node's bounding box
        if (!intersectAABB(r.origin, r.direction, node.minBounds, node.maxBounds)) {
            // Miss bounding box, skip this node
            continue;
        }

        if (node.objectIndex >= 0) {
            // Leaf node: Check intersection with the object (not AABB)
            float t = intersect_sphere(r.origin, r.direction, node.minBounds, node.maxBounds);
            if (t > 0.0 && t < closestT) {
                closestT = t;
                closestObject = node.objectIndex;
            }
        } else {
            // Internal node: Push children onto stack
            if (node.left >= 0) stack[stackPtr++] = node.left;
            if (node.right >= 0) stack[stackPtr++] = node.right;
        }
    }

    return closestObject;  // Return the closest hit object
}


// returns a vector to a random point on a unit disk
vec3 random_in_unit_disk() {
    float i = 1.0;

    while(true) {
        vec3 p = vec3(random_double_interval(-1.0, 1.0), random_double_interval(-1.0, 1.0), 0);
        
        if (dot(p, p) < 1.) {
            return p;
        }
    }
}

// returns a random point in a camera defocus disk
vec3 defocus_disk_sample() {
    vec3 p = random_in_unit_disk();
    
    return cam.lookfrom + (p[0] * cam.defocus_disk_u) 
                         + (p[1] * cam.defocus_disk_v);
}

// returns a random unit vector within our sphere
vec3 random_unit_vector() {
    while (true) {
        vec3 p = vec3(random_double_interval(-1., 1.),
                    random_double_interval(-1., 1.),
                    random_double_interval(-1., 1.)
                    );
        
        float lensq = dot(p, p);


        // glsl does not support 1e-160 (64 bit float). so to avoid
        // underflowing to 0.0 i'll use 1e-38 (32 bit float) 
        if (1e-160 < lensq && lensq <= 1.) {
            return normalize(p);
        }
    }
}

// checks if random unit vector is on the correct hemisphere of sphere
vec3 random_on_hemisphere(vec3 normal) {
    vec3 on_unit_sphere = random_unit_vector();

    if (dot(on_unit_sphere, normal) > 0.0) // is on the same hemisphere
        return on_unit_sphere;
    else
        return -on_unit_sphere;
}


vec3 sample_square() {
    // Returns the vector to a random point in the [-.5,-.5]-[+.5,+.5] unit square.
    return vec3(random_double() - 0.5, random_double() - 0.5, 0.);
}

// create a ray from the camera that randomly falls within a region around a target pixel
Ray get_ray() {
    // Construct a camera ray originating from the origin and directed at randomly sampled
    // point around the pixel location x, y.
    vec3 offset = sample_square();

    vec3 pixel_sample = cam.pixel00_loc 
                        + ((gl_FragCoord.x + offset.x) * cam.pixel_delta_u) 
                        + ((gl_FragCoord.y + offset.y) * cam.pixel_delta_v);

    vec3 ray_origin = (cam.defocus_angle <= 0.0) ? cam.lookfrom : defocus_disk_sample();
    vec3 ray_direction = pixel_sample - ray_origin;
    float ray_time = random_double();

    return Ray(ray_origin, ray_direction, ray_time);

}

// lambertian scatter function
vec3 lambertian_scatter(out vec3 color, hit_record rec) {
    // vec3 direction = rec.normal + random_unit_vector(); original should use this but causes pixel to turn black over time
    // most likely from components being 0, NaN, or infinite.

    vec3 direction = random_unit_vector();

    // catch degenerate scatter direction
    if (near_zero(direction)) 
        direction = rec.normal;

    color *= rec.mat.albedo;

    return direction;
}

// metallic scatter function
bool metallic_scatter(out vec3 scatter_direction, Ray r, out vec3 color, hit_record rec) {
    vec3 reflected = reflection(r.direction, rec.normal);
    reflected = normalize(reflected) + (rec.mat.fuzzyness * random_unit_vector());
    scatter_direction = reflected;
    color *= rec.mat.albedo;

    return (dot(reflected, rec.normal) > 0.0);
}

// dielectric scatter function
vec3 dielectric_scatter(vec3 ray_direction, out vec3 attenuation, hit_record rec) {
    attenuation = vec3(1., 1., 1.);

    float ri = rec.front_face ? (1.0 / rec.mat.refraction_index) : rec.mat.refraction_index;
    
    vec3 unit_direction = normalize(ray_direction);

    float cos_theta = min(dot(-unit_direction, rec.normal), 1.0);
    float sin_theta = sqrt(1.0 - cos_theta * cos_theta);

    bool cannot_refract;
    vec3 direction;

    if ((ri * sin_theta) > 1.0) {
        cannot_refract = true; // reflect
    } else {
        cannot_refract = false; // refract
    }

    if (cannot_refract || reflectance(cos_theta, ri) > random_double()) {
        direction = reflection(unit_direction, rec.normal);
    } else {
        direction = refraction(unit_direction, rec.normal, ri);
    }

    return direction;
}

vec3 ray_color(Ray r) {
    hit_record rec;

    Ray current_ray = r;

    vec3 attenuation = vec3(1.);
    vec3 scatter_direction;

    // bounceing the ray in our world
    for (int bounce = 0; bounce < MAX_RAY_BOUNCES; bounce++) {
        if (hit_list(current_ray, interval(0.001, INFINITY), rec)) {
            
            // logic for ray bounce based on sphere material
            if (rec.mat.type == LAMBERTIAN) { // lambertian scatter
                scatter_direction = lambertian_scatter(attenuation, rec);
            } 

            else if (rec.mat.type == METAL) { // metallic scatter
                bool absorbed = metallic_scatter(scatter_direction, current_ray, attenuation, rec);

                if (!absorbed)
                    break;
            }

            else if (rec.mat.type == DIELECTRIC) { // metallic scatter
                scatter_direction = dielectric_scatter(current_ray.direction, attenuation, rec);
            }

            current_ray = Ray(rec.p, scatter_direction, psudo_rand(float(bounce) * vec2(43.934, 5.347), psudo_seed)); // create new ray from contact point and follow it

            attenuation *= .9; // 10% color loss

        } else {
            break; // exit the for loop if ray does not contact something
        }
    } 
    
    // background
    vec3 unit_direction = normalize(current_ray.direction);
    float a = 0.5 * (unit_direction.y + 1.0);
    vec3 background_color = (1.0 - a) * vec3(1.0, 1.0, 1.0) + a * vec3(0.5, 0.7, 1.0);

    return background_color * attenuation;
}

// setup camera as well as veiwport
void initalize_camera() {
    cam.image_width = width;
    cam.aspect_ratio = 16.0 / 9.0;
    cam.defocus_angle = 0.6;
    cam.focus_dist = 10.0;
    cam.vfov = 20.0;
    cam.lookfrom = camera_center;
    cam.lookat = vec3(0., 1., 0.);
    cam.vup = vec3(0., -1., 0.);

    float image_height = cam.image_width / cam.aspect_ratio;
    image_height = (image_height < 1.) ? 1. : image_height;

    vec3 center = cam.lookfrom;

    // determine viewport dimensions
    float theta = degrees_to_radians(cam.vfov);
    float h = tan(theta / 2.);
    float viewport_height = 2. * h * cam.focus_dist;
    float viewport_width = viewport_height * (cam.image_width / image_height);

    // Calculate the u,v,w unit basis vectors for the camera coordinate frame.
    cam.w = normalize(cam.lookfrom - cam.lookat);
    cam.u = normalize(cross(cam.vup, cam.w));
    cam.v = cross(cam.w, cam.u);

    // Calculate the vectors across the horizontal and down the vertical viewport edges.
    vec3 viewport_u = viewport_width * cam.u;
    vec3 viewport_v = viewport_height * -cam.v;

    // Calculate the horizontal and vertical delta vectors from pixel to pixel.
    cam.pixel_delta_u = viewport_u / cam.image_width;
    cam.pixel_delta_v = viewport_v / image_height;

    // Calculate the location of the upper left pixel.
    vec3 viewport_upper_left = center - (cam.focus_dist * cam.w) - viewport_u / 2. - viewport_v / 2.;

    cam.pixel00_loc = viewport_upper_left + 0.5 * (cam.pixel_delta_u + cam.pixel_delta_v);

    // Calculate the camera defocus disk basis vectors.
    float defocus_radius = cam.focus_dist * tan(degrees_to_radians(cam.defocus_angle / 2.));

    cam.defocus_disk_u = cam.u * defocus_radius;
    cam.defocus_disk_v = cam.v * defocus_radius;

    return;
}

void main() {
    vec4 tex_color = texture(u_texture, v_texcoord);

    vec3 previous_color = tex_color.rgb; // previous frame color

    global_seed = dot(gl_FragCoord.xy, vec2(seedA, seedB));

    initalize_camera();
    
    // create a ray in a random direction within a certain region surrounding target pixel
    Ray ray = get_ray();

    // main ray is sent to the world to intesect and bounce of spheres
    vec3 pixel_color = ray_color(ray);

    // Apply a linear to gamma transform for gamma
    float r = linear_to_gamma(pixel_color.r);
    float g = linear_to_gamma(pixel_color.g);
    float b = linear_to_gamma(pixel_color.b);

    vec3 result_color = vec3(r, g, b);

    // no linear interpolation on first frame. 
    // (no previous information to work with)
    if (iteration < 2.0) {
        fragColor = vec4(result_color, 1.);
        return;
    }

    // determines the convergence rate of our raytracer. ensure early frames contribute
    // but at the end later frames have less impact on newer frames.
    float alpha = ((iteration * 0.7) / ((iteration * 0.7) + 1.));

    vec3 lerp;
    vec3 BVH_color;

    //////////////////////////////////////

    // test BVH intersection code
    int hit_object = traverseBVH(ray);

    if (hit_object >= 0) {
        BVH_color = vec3(1, 0, 0); // Object hit → color red
    } else {
        // background
        vec3 unit_direction = normalize(ray.direction);
        float a = 0.5 * (unit_direction.y + 1.0);
        vec3 background_color = (1.0 - a) * vec3(1.0, 1.0, 1.0) + a * vec3(0.5, 0.7, 1.0);

        BVH_color = vec3(background_color);
    }

    lerp = mix(BVH_color, previous_color, alpha);

    fragColor = vec4(lerp, 1.0);

    return; 
    /////////////////////////////////////

    // linear interpolation between past frame and current frame based on current iteration
    lerp = mix(result_color, previous_color, alpha);

    fragColor = vec4(lerp, 1.0);
}`;

const f_Update = `
#version 300 es
precision mediump float;
in vec2 v_texcoord;
uniform sampler2D u_texture;
out vec4 fragColor;

void main() {
    vec4 texColor = texture(u_texture, v_texcoord);
    float r = texColor.r+0.004; if (r > 1.) r = 0.;
    float g = texColor.g+0.004; if (g > 1.) g = 0.;
    float b = 0.;//texColor.b+0.01; if (b > 1.) b = 0.;
    fragColor = vec4(r,g,b,1.0);
}`;

// initilization
const v_Init = `
    #version 300 es
    precision mediump float;
    in vec2 position;
    out vec2 v_position;

    void main() {
        v_position = 0.5 * position + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
    }`;

const f_Init = `
    #version 300 es
    precision mediump float;
    in vec2 v_position;
    out vec4 fragColor;
    void main() {
        fragColor = vec4(0., 0., 0., 1.);
    }`;

export default {
  v_Draw,
  f_Draw,
  v_Update,
  f_Update,
  f_update_tracer,
  v_Init,
  f_Init,
};
