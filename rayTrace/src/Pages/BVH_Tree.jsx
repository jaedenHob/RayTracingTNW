import React from "react";
import BVH_tutorial from "../Components/BVH_tautorial.jsx";
import diagram from "../assets/BVH_Diagram.png";

const codeSnippet = `
  class BVH_Node {
    constructor() {
      this.Bounding_Box = null;
      this.left = null;
      this.right = null;
      this.objects = [];
    }
  }

  function build_BVH(objects) {
    if (objects.length == 0) // terminate if an empty array
      return null;

    let node = new BVH_Node();
    node.Bounding_Box = create_bounding_box(objects);
    
    // base case (create leaf node)
    if (objects.length == 1) { // only one object in array
      node.objects = objects;
      return node;
    }

    // determine midpoint to halve current group of objects
    mid = calculate_midpoint(objects);
    left_objects = objects.slice(0, mid);
    right_objects = objects.slice(mid);

    // Recursively build BVH tree (assign left and right children)
    node.left = build_BVH(left_objects);
    node.right = build_BVH(right_objects);

  }`;

const BVH_Tree = () => {
  return (
    <>
      <div className="centered-container">
        <h2 className="p-4">Learning Bounding Volume hierarchy</h2>

        <h2 className="p-4">Background</h2>

        <p className="p-2">
          As of now in my ray tracer project everything being rendered is from
          testing if a ray collides with an object such as a sphere. If a ray
          has to iterate through every object to handle collision checking then
          that results in O(N) intersection test per ray, where N is the number
          of objects. Including how rays can bounce, reflect, and refract in the
          scene means the number of intersection tests can grow exponentially.
        </p>

        <p className="p-2">
          A common technique to improve performance is using an acceleration
          structure that reduces the number of collision checks. Instead of
          testing each object individually for ray intersections—a costly
          operation—objects are grouped into spatial regions. These regions are
          then combined into larger regions, and the process is repeated
          recursively. The result is a Bounding Volume Hierarchy (BVH), a
          tree-like data structure that allows for efficient traversal and
          significantly reduces the number of intersection tests required.
        </p>

        <h2 className="p-4">Creating the tree</h2>

        <pre className="bg-gray-850 text-white m-3 p-4 rounded-lg overflow-x-auto text-xs">
          <code>{codeSnippet}</code>
        </pre>

        <div className="max-w-md m-3">
          <figure className="border rounded-lg p-4 bg-gray-100">
            <img src={diagram} alt="Sample Image" className="w-full rounded" />
            <figcaption className="mt-2 text-sm text-gray-600">
              Credit to Erin Catto:{" "}
              <a
                href="https://box2d.org/files/ErinCatto_DynamicBVH_Full.pdf"
                className="text-blue-500 hover:underline no-style"
              >
                ErinCatto_DynamicBVH PDF
              </a>
            </figcaption>
          </figure>
        </div>

        <p className="p-2">
          As we can see from its structure the BVH tree resembles a binary tree,
          but the big difference is how a BVH tree handles spatial partioning by
          storing bounding volumes, and objects. From moving over to a tree
          structure can improve performance by only checking nodes in the tree
          where a ray intersects at a bounded region giving a time complexity of
          O(log N).
        </p>

        <h2 className="m-3">WebGL Attempt</h2>

        <div className="m-3">
          <BVH_tutorial />
        </div>

        <p className="m-3">
          At trying to incorporate a BVH acceleration into my project I was
          faced with some limitations that made it not worth to continue
          further. Using webGL which is a web friendly version of OpenGL, but
          lacks some of the originals functionality such as compute shaders,
          multi-threading, full GPU access. To fully utilize an accelerated
          structure it would be best to build the tree on cpu to handle
          recursion, but once built there are not many options to pass the tree
          to the fragment shader. WebGL does not have Shader Storage Buffer
          Object (SSBO) which is an object for input / output to and from the
          shaders. I tried passing the tree data as a texture but although it
          works cannot pass all tree information. Then trying to use the passed
          texture in glsl was more complex and didn't yeild an accurate result.
          The best I could do was visulaize one bounding box volume.
        </p>
      </div>
    </>
  );
};

export default BVH_Tree;
