import React from 'react'

import Raytrace from '../Components/webglTracer'

const RTIOW = () => {
  return (
    <>
      <div className='centered-container'>
        <h2 className='p-4'>Ray Tracing Part one</h2>
        <Raytrace />
      </div>
    </>
  )
}

export default RTIOW;