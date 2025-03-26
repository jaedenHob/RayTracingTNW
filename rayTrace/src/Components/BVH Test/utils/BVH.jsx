import { AABB } from "./scene_objects";

// bvh node
export class BVH_Node {
  constructor(bbox, left, right, object_index = -1) {
    this.bbox = bbox;
    this.left = left;
    this.right = right;
    this.object_index = object_index; // Correctly store the object index for leaf nodes
  }
}

// function to recursively build a bvh tree from the root to leaf nodes
export function build_BVH(objects) {
  if (objects.length === 1) {
    // Leaf node (external node) - store the object's bounding box and index
    const { obj, index } = objects[0]; // Extract obj and its index
    return new BVH_Node(obj.bbox, null, null, index);
  } else {
    // Compute bounding box extents to determine split axis
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    for (const { obj } of objects) {
      minX = Math.min(minX, obj.bbox.bbox_interval_x[0]);
      maxX = Math.max(maxX, obj.bbox.bbox_interval_x[1]);
      minY = Math.min(minY, obj.bbox.bbox_interval_y[0]);
      maxY = Math.max(maxY, obj.bbox.bbox_interval_y[1]);
      minZ = Math.min(minZ, obj.bbox.bbox_interval_z[0]);
      maxZ = Math.max(maxZ, obj.bbox.bbox_interval_z[1]);
    }

    // Choose the axis with the largest extent
    let extentX = maxX - minX;
    let extentY = maxY - minY;
    let extentZ = maxZ - minZ;
    let selected_axis =
      extentX > extentY && extentX > extentZ ? 0 : extentY > extentZ ? 1 : 2;

    // Sort objects based on selected axis (use obj.center1 and obj.center2)
    objects.sort(
      (a, b) =>
        (a.obj.center1[selected_axis] + a.obj.center2[selected_axis]) / 2 -
        (b.obj.center1[selected_axis] + b.obj.center2[selected_axis]) / 2
    );

    const mid = Math.floor(objects.length / 2);
    const left_objects = objects.slice(0, mid);
    const right_objects = objects.slice(mid);

    // Recursively build BVH tree
    const left_node = build_BVH(left_objects);
    const right_node = build_BVH(right_objects);

    // Create bounding box for parent node (internal nodes)
    const bbox = new AABB(
      Math.min(
        left_node.bbox.bbox_interval_x[0],
        right_node.bbox.bbox_interval_x[0]
      ),
      Math.max(
        left_node.bbox.bbox_interval_x[1],
        right_node.bbox.bbox_interval_x[1]
      ),
      Math.min(
        left_node.bbox.bbox_interval_y[0],
        right_node.bbox.bbox_interval_y[0]
      ),
      Math.max(
        left_node.bbox.bbox_interval_y[1],
        right_node.bbox.bbox_interval_y[1]
      ),
      Math.min(
        left_node.bbox.bbox_interval_z[0],
        right_node.bbox.bbox_interval_z[0]
      ),
      Math.max(
        left_node.bbox.bbox_interval_z[1],
        right_node.bbox.bbox_interval_z[1]
      )
    );

    return new BVH_Node(bbox, left_node, right_node);
  }
}

// function to flatten bvh tree so it can be passed to the fragment shader as an array or texture.
export function flatten_BVH(node, nodes = []) {
  if (!node) return nodes; // return if not a node (null)

  // Store node in a flat array format
  nodes.push(
    node.bbox.bbox_interval_x[0],
    node.bbox.bbox_interval_x[1], // x interval bounds
    node.bbox.bbox_interval_y[0],
    node.bbox.bbox_interval_y[1], // y interval bounds
    node.bbox.bbox_interval_z[0],
    node.bbox.bbox_interval_z[1], // z interval bounds
    node.left ? nodes.length + 1 : -1, // Left child index
    node.right ? nodes.length + 2 : -1, // Right child index
    node.object_index // Object index (-1 if is a internal node)
  );

  if (node.left) flatten_BVH(node.left, nodes);
  if (node.right) flatten_BVH(node.right, nodes);

  return nodes;
}

// function to convert flattened tree into a 32float array to pass to fragment shader
// export function convert_flat_BVH(flatten_tree) {
//   let data = new Float32Array(flatten_tree.length * 9);

//   flatten_tree.forEach((node, i) => {
//     let index = i * 9;

//     data.set(
//       [
//         node.bbox.bbox_interval_x[0],
//         node.bbox.bbox_interval_y[0],
//         node.bbox.bbox_interval_z[0],
//         node.bbox.bbox_interval_x[1],
//         node.bbox.bbox_interval_y[1],
//         node.bbox.bbox_interval_z[1],
//         node.left,
//         node.right,
//         node.object_index,
//       ],
//       index
//     );
//   });

//   return data;
// }
