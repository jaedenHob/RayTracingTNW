import { Suspense, useEffect, useRef} from 'react';
import { Routes, Route } from 'react-router-dom';

// Navigation and pages
import NavBar from './Header/NavBar.jsx';
import Home from './Pages/Home.jsx';
import About from './Pages/About.jsx';
import Rays from './Pages/Rays.jsx';
import Shadows from './Pages/Shadows.jsx';
import RTIOW from './Pages/RTIOW.jsx'
import Test from "./Components/Test.jsx"


import './App.css';


function App() {

  return (
    <>
      <NavBar />

      <br />
    
      <Suspense fallback={<div className="container">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/rays" element={<Rays />} />
          <Route path="/shadows" element={<Shadows />} />
          <Route path="/InOneWeekend" element={<RTIOW />} />
          <Route path="/test" element={<Test />} />

        </Routes>
      </Suspense>
      
    </>
  )
}

export default App
