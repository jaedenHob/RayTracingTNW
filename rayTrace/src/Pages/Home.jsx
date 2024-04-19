import React from 'react'

import render_image from '../assets/FinalRenderQuick.png'

const Home = () => {
  return (
      <div className="centered-container">

        <br /> 
        
        <h1>Ray Tracing Project</h1>

        <br />

        <img src={render_image} alt="A Final Render Image" />

        <br />

        <p>
          After my computer graphics course in college I enjoyed the process of designing a game using all
          the techniques that was learned. However, I felt that there was a valuable learning  experience I missed
          out on building a ray tracer. So this project will aim to do just that. My process begun by reading
          up on it in {" "}
          <a href='https://raytracing.github.io/books/RayTracingInOneWeekend.html#overview'>ray tracing in one weekend</a>.  The reference material is in C++, but I will stick to what
          I'm accustomed  to with javascript and webgl. Ray tracing is a complex subject so I don't expect
          to complete this in one weekend, but lets see I how far I can get.
        </p>
      </div>
  );
}

export default Home