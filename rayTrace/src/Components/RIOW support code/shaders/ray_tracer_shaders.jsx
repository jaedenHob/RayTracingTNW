const ray_tracer_vs = `
#version 300 es
precision mediump float;

in vec2 position;

out vec2 v_position;

void main() {
    v_position = 0.5 * position + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

const ray_tracer_fs = `
#version 300 es
precision mediump float;

in vec2 v_position;

out vec4 fragColor;

// uniforms
uniform vec3 pixel00_loc; 
uniform vec3 pixel_delta_u;
uniform vec3 pixel_delta_v;
uniform vec3 camera_center;

// constants
#define PI 3.1415926538
#define INFINITY 1.0 / 0.00000000001
#define MAX_SPHERE 2
#define RAND_MAX 2147483647.0
#define SAMPLES_PER_PIXEL 100.0
#define MAX_RAY_BOUNCES 5

// auxilary functions
float degrees_to_radians(float degrees) {
    return degrees * PI / 180.;
}

// structs

// defining a ray
struct Ray {
    vec3 origin;
    vec3 direction;
};

// defining records of what rays hit
struct hit_record {
    vec3 p;
    vec3 normal;
    
    float t;

    bool front_face;
};

// defining a sphere
struct Sphere {
    vec3 center;

    float radius;
};

// defining an interval
struct interval {
    float min;
    float max;
};

// interval functions

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

// hitting a sphere
float hit_sphere(vec3 center ,float radius, Ray r) {
    vec3 oc = center - r.origin;
    float a = dot(r.direction, r.direction);
    float h = dot(r.direction, oc);
    float c = dot(oc, oc) - pow(radius, 2.);
    float discriminant = h * h - a * c;

    if (discriminant < 0.) {
        return -1.0;
    } else {
        return (h - sqrt(discriminant)) / a;
    }
}

// hitting a sphere within a valid interval
bool hit(vec3 center, float radius, Ray r, interval ray_t, out hit_record rec) {
    vec3 oc = center - r.origin;
    float a = dot(r.direction, r.direction);
    float h = dot(r.direction, oc);
    float c = dot(oc, oc) - pow(radius, 2.);

    float discriminant = h * h - a * c;

    if (discriminant < 0.)
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
    vec3 outward_normal = (rec.p - center) / radius;
    set_face_normal(r, outward_normal, rec);
    // rec.normal = (rec.p - center) / radius;

    return true;
}

bool hit_list(Sphere world[MAX_SPHERE], Ray r, interval ray_t, out hit_record rec) {
    hit_record temp_rec;
    bool hit_anything = false;
    float closest_so_far = ray_t.max;

    for (int i = 0; i < MAX_SPHERE; i++) {
        if (hit(world[i].center, world[i].radius, r, interval(ray_t.min, closest_so_far), temp_rec)) {
            hit_anything = true;
            closest_so_far = temp_rec.t;
            rec = temp_rec;
        }   
    }

    return hit_anything;
}

vec3 ray_color(Ray r, Sphere world[MAX_SPHERE]) {
    hit_record rec;

    if (hit_list(world, r, interval(0., INFINITY), rec)) {
        return 0.5 * (rec.normal + vec3(1.,1.,1.));
    }

    vec3 unit_direction = normalize(r.direction);
    float a = 0.5 * (unit_direction.y + 1.0);
    return (1.0 - a) * vec3(1.0, 1.0, 1.0) + a * vec3(0.5, 0.7, 1.0);
}

void main() {
    // generate the world
    Sphere world[MAX_SPHERE];

    // ground
    world[0] = Sphere(vec3(0., -100.5, -1.), 100.);
    // sphere1
    world[1] = Sphere(vec3(0., 0., -1.), 0.5);
    

    vec3 pixel_center = pixel00_loc + (gl_FragCoord.x * pixel_delta_u) + (gl_FragCoord.y * pixel_delta_v);
    vec3 ray_direction = pixel_center - camera_center;
    Ray r = Ray(camera_center, ray_direction);

    vec3 pixel_color = ray_color(r, world);

    fragColor = vec4(pixel_color, 1.);
}`;

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
const v_Update = `#version 300 es
    precision mediump float;

    in vec2 position;
    out vec2 v_texcoord;
    
    void main() {
      v_texcoord = 0.5 * position + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }`;

const f_Update = `#version 300 es
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
        fragColor = vec4(v_position, 0.0, 1.0);
    }`;

export default {
  ray_tracer_vs,
  ray_tracer_fs,
  v_Draw,
  f_Draw,
  v_Update,
  f_Update,
  v_Init,
  f_Init,
};
