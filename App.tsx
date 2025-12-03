import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/Experience';
import { Overlay } from './components/Overlay';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-[#020403] relative overflow-hidden">
      <Overlay />
      <div className="w-full h-full z-0">
        <Canvas
          shadows
          dpr={[1, 2]} // Support high-res displays
          gl={{ 
            antialias: false, // Post-processing handles this or we turn it off for perf with bloom
            powerPreference: "high-performance",
            alpha: false,
            stencil: false,
            depth: true
          }}
        >
          <Experience />
        </Canvas>
      </div>
      
      {/* Texture Overlay for Grain/Luxury Paper Feel */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay z-20"></div>
    </div>
  );
};

export default App;