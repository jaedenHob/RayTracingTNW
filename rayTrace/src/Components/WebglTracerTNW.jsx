import React, { useState, useRef, useEffect } from 'react';
import * as twgl from 'twgl.js';


const WebglTracerTNW = () => {
    // variables local to Raytrace
    let width = 650;

    // canvas reference
    const canvasRef = useRef(null);

    const [cameraPosition, setCameraPosition] = useState([13.0, 2.0, -3.0]); // Initial camera position
    const [sliderValues, setSliderValues] = useState({
        posX: 13.0,
        posY: 2.0,
        posZ: -3.0
    });

    useEffect(() => {

    }, [cameraPosition, sliderValues]);

    // Event handler for slider value changes
    const handleSliderChange = (e) => {
        const { name, value } = e.target;
        setSliderValues(prevState => ({
            ...prevState,
            [name]: parseFloat(value)
        }));
    };

  return (
    <>
        <div>WebglTracerTNW</div>

        <div className='centered-container'>
                <div>fps: <span id="fps"></span></div>
                
                <canvas ref={canvasRef} width={width} height={width / (16.0 / 9.0)}></canvas>

                <div>
                    <br />

                    <p>Camera position:</p>

                    {/* Sliders for adjusting camera position */}
                    <label>Position X:</label>
                    <input
                        type="range"
                        min="-20"
                        max="20"
                        step="0.1"
                        name="posX"
                        value={sliderValues.posX}
                        onChange={handleSliderChange}
                    />
                    <label>Position Y:</label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.1"
                        name="posY"
                        value={sliderValues.posY}
                        onChange={handleSliderChange}
                    />
                    <label>Position Z:</label>
                    <input
                        type="range"
                        min="-20"
                        max="20"
                        step="0.1"
                        name="posZ"
                        value={sliderValues.posZ}
                        onChange={handleSliderChange}
                    />
                </div>
                
            </div>
    </>
  )
};

export default WebglTracerTNW;