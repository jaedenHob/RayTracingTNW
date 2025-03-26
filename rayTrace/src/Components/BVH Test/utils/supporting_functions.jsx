// supporting_functions.jsx
export function degrees_to_radians(degrees) {
  return (degrees * 3.1415926538) / 180.0;
}

export function distance(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  const dz = p1[2] - p2[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function normalize(vector) {
  const magnitude = Math.sqrt(
    vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2]
  );
  if (magnitude !== 0) {
    return [
      vector[0] / magnitude,
      vector[1] / magnitude,
      vector[2] / magnitude,
    ];
  } else {
    return vector;
  }
}

export function subtract_vectors(vec1, vec2) {
  return [vec1[0] - vec2[0], vec1[1] - vec2[1], vec1[2] - vec2[2]];
}

export function cross_product(vec1, vec2) {
  let x = vec1[1] * vec2[2] - vec1[2] * vec2[1];
  let y = vec1[2] * vec2[0] - vec1[0] * vec2[2];
  let z = vec1[0] * vec2[1] - vec1[1] * vec2[0];
  return [x, y, z];
}

export function multiply_a_vector(vec1, multiple) {
  let x = vec1[0] * multiple;
  let y = vec1[1] * multiple;
  let z = vec1[2] * multiple;
  return [x, y, z];
}

export function negative_vector(vec) {
  return [-vec[0], -vec[1], -vec[2]];
}

// export default {
//   degrees_to_radians,
//   distance,
//   normalize,
//   subtract_vectors,
//   cross_product,
//   multiply_a_vector,
//   negative_vector,
// };
