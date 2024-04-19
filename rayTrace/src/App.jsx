import { useEffect, useRef} from 'react';
import { Routes, Route } from 'react-router-dom';

// Navigation and pages
import NavBar from './Header/NavBar.jsx';
import Home from './Pages/Home.jsx';
import About from './Pages/About.jsx';
import Rays from './Pages/Rays.jsx';
import Shadows from './Pages/Shadows.jsx';
import RTIOW from './Pages/RTIOW.jsx';

import './App.css';


function App() {

  return (
    <>
      <NavBar />

      <br />
    
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/rays" element={<Rays />} />
        <Route path="/shadows" element={<Shadows />} />
        <Route path="/InOneWeekend" element={<RTIOW />} />
      </Routes>

      {/* <h1>Ray Tracing Project</h1> */}

      <div className='centered-container'>
        {/* <p>
          After my computer graphics course in college I enjoyed the process of designing a game using all
          the techniques that was learned. However, I felt that there was a valuable learning  experience I missed
          out on building a ray tracer. So this project will aim to do just that. My process begun by reading
          up on it in {" "}
          <a href='https://raytracing.github.io/books/RayTracingInOneWeekend.html#overview'>ray tracing in one weekend</a>.  The reference material is in C++, but I will stick to what
          I'm accustomed  to with javascript and webgl. Ray tracing is a complex subject so I don't expect
          to complete this in one weekend, but lets see I how far I can get.
        </p> */}

        {/* <br />

        <br /> */}

        {/* <Webgl2D />  */}

        {/* <p>
          Something that pained me was how in previous projects where I have made a shadow protrude from an object useing shadow mapping.
          Shadows appeared, but where hard shadows that appeared blocky so in a 2D situation I was doing a little research into soft shadows.
          This way is a little more complicated and involved calculations for the three parts of a shodow. The umbra, penumbra, and antumbra. 
          For my implementation I may go for try to use RNG to mix/blend the background color with the shadow color to make this affect. 
        </p> */}

        {/* <br /> */}

        {/* <Raytrace /> */}
        
      </div>


    </>
  )
}

export default App
