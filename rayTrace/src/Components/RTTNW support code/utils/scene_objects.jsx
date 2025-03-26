export class AABB {
  constructor(min_x, max_x, min_y, max_y, min_z, max_z) {
    this.bbox_interval_x = [min_x, max_x];
    this.bbox_interval_y = [min_y, max_y];
    this.bbox_interval_z = [min_z, max_z];
  }
}

export class Sphere {
  constructor(object_type, center1, center2, radius, material, bbox) {
    this.object_type = object_type;
    this.center1 = center1;
    this.center2 = center2;
    this.radius = radius;
    this.material = material;

    this.bbox = new AABB(
      Math.min(center1[0] - radius, center2[0] - radius),
      Math.max(center1[0] + radius, center2[0] + radius),
      Math.min(center1[1] - radius, center2[1] - radius),
      Math.max(center1[1] + radius, center2[1] + radius),
      Math.min(center1[2] - radius, center2[2] - radius),
      Math.max(center1[2] + radius, center2[2] + radius)
    );
  }
}

export const scene_objects = [
  // stationary sphere (ground)
  // new Sphere(0, [0.0, -1000.0, 0.0], [0.0, -1000.0, 0.0], 1000.0, {
  //   type: 0,
  //   albedo: [0.5, 0.5, 0.5],
  //   fuzzyness: parseFloat(0.0),
  //   refraction_index: parseFloat(0.0),
  // }),
  // // stationary sphere (glass ball)
  // new Sphere(0, [0.0, 1.0, 0.0], [0.0, 1.0, 0.0], 1.0, {
  //   type: 2,
  //   albedo: [0.0, 0.0, 0.0],
  //   fuzzyness: parseFloat(0.0),
  //   refraction_index: parseFloat(1.5),
  // }),
  // // stationary sphere (diffuse ball)
  new Sphere(0, [-4.0, 1.0, 0.0], [-4.0, 1.0, 0.0], 1.0, {
    type: 0,
    albedo: [0.4, 0.2, 0.1],
    fuzzyness: parseFloat(0.0),
    refraction_index: parseFloat(0.0),
  }),
  // // stationary sphere (metal ball)
  // new Sphere(0, [4.0, 1.0, 0.0], [4.0, 1.0, 0.0], 1.0, {
  //   type: 1,
  //   albedo: [0.7, 0.6, 0.5],
  //   fuzzyness: parseFloat(0.0),
  //   refraction_index: parseFloat(0.0),
  // }),
];
