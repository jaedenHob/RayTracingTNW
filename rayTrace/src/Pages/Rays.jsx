import React from 'react'

import Raycast from '../Components/raycast'

const Rays = () => {
  return (
    <>
      <div className='centered-container'>
        <h2>Light Source and rays (Ray Casting) </h2>

        <p>
          So first to simplify things to get the concepts and the logic down. I'll do ray casting.
          Both ray tracing and ray casting involve sending rays out through every pixel of an image
          mimmicing the behavior of light. The difference is that ray casting will stop at the first hit,
          while the latter is calculated recursively since when a ray of light hits it reflects or splits
          many times which is very expensive computationally. Doing it in 2D also simplifies things as well.
        </p>

        <br />

        <Raycast />

        <br />

        <p>
          Here is we have a point giving rays in all directions and follows the users cursor.
          when a ray contacts a wall it no longer draws further than the contact point.
        </p>
      </div>
    </>
  )
}

export default Rays