// imports
function degrees_to_radians(degrees) {
  return (degrees * 3.1415926538) / 180.0;
}

function distance(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  const dz = p1[2] - p2[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalize(vector) {
  // Calculate the magnitude of the vector
  const magnitude = Math.sqrt(
    vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2]
  );

  // Check if the magnitude is not zero to avoid division by zero
  if (magnitude !== 0) {
    // Divide each component by the magnitude to normalize the vector
    const normalizedVector = [
      vector[0] / magnitude,
      vector[1] / magnitude,
      vector[2] / magnitude,
    ];
    return normalizedVector;
  } else {
    // If the vector is already a zero vector, return the original vector
    return vector;
  }
}

function subtract_vectors(vec1, vec2) {
  return [vec1[0] - vec2[0], vec1[1] - vec2[1], vec1[2] - vec2[2]];
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
  return [-vec[0], -vec[1], -vec[2]];
}
export default {};
