import { Suspense, useEffect, useRef } from "react";
import { Routes, Route } from "react-router-dom";

// Navigation and pages
import NavBar from "./Header/NavBar.jsx";
import Home from "./Pages/Home.jsx";
import About from "./Pages/About.jsx";
import Rays from "./Pages/Rays.jsx";
// import Shadows from './Pages/Shadows.jsx';
import RTIOW from "./Pages/RTIOW.jsx";
import BVH_Tree from "./Pages/BVH_Tree.jsx";
import RTTNW from "./Pages/RTTNW.jsx";
import Ping_pong_animation from "./Components/Test.jsx";

import "./App.css";

function App() {
  return (
    <>
      <div>
        <div className="">
          <NavBar />
        </div>

        <br />

        <Suspense
          fallback={<div className="centered-container">Loading...</div>}
        >
          <div className="flex justify-center items-center w-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/rays" element={<Rays />} />
              <Route path="/ping" element={<Ping_pong_animation />} />
              <Route path="/InOneWeekend" element={<RTIOW />} />
              <Route path="/BVH_Test" element={<BVH_Tree />} />
              <Route path="/NextWeekend" element={<RTTNW />} />
            </Routes>
          </div>
        </Suspense>
      </div>
    </>
  );
}

export default App;
