import React from 'react'

import RayTracerTNW from '../Components/WebglTracerTNW'

const RTTNW = () => {
  return (
    <>
      <div className='centered-container'>
        <h2 className='p-4'>Ray Tracing Part Two</h2>

        <RayTracerTNW />
        
        <p className='p-1'>x: forward and back</p>
        <p className='p-1'>y: up and down</p>
        <p className='p-1'>z: left and right</p>

        <p>
          Final render of the scene with slider components that allow the user to see different angles 
          in real time. Still takes a load on a computers gpu. If the frames ever get to low refreshing 
          the page helps.
        </p>
      </div>
    </>
  )
}

export default RTTNW;