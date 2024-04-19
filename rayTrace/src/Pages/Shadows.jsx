import React from 'react'

import Webgl2D from '../Components/webgl2D'

const Shadows = () => {
  return (
    <>
      <div className='center-container max-w-[800px]'>
        <Webgl2D />

        <p className='p-3'>
          Something that pained me was how in previous projects where I have made a shadow protrude from an object useing shadow mapping.
          Shadows appeared, but where hard shadows that appeared blocky so in a 2D situation I was doing a little research into soft shadows.
          This way is a little more complicated and involved calculations for the three parts of a shodow. The umbra, penumbra, and antumbra. 
          For my implementation I may go for try to use RNG to mix/blend the background color with the shadow color to make this affect. 
        </p>
      </div>
    </>
  )
}

export default Shadows