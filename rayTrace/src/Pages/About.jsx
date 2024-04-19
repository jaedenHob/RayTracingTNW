import React from 'react'

import CanvasTriangle from '../Components/CanvasTriangle'

const About = () => {
  return (
    <>
      <div className='centered-container'>
        <h1> Skills and Interests</h1>

        <p>
          When it comes to programing I have done projects revolving around
          full stack development covering mobile and web, machine learning and AI, Coputer graphics,
          as well as a small bit of firmware programming in C when initailly starting out as a computer
          engineer major.
        </p>

        <h1>Triangle Webgl Render</h1>

        <CanvasTriangle />

        <p>
          I have never used webgl in reactjs before so going full circle I am applying the very
          first time I learned webgl and created a triangle back when I was learning computer
          graphics back at the University of Central Florida.
        </p>
      </div>
    </>
  )
}

export default About