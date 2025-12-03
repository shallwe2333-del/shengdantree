import React, { Suspense } from 'react';
import { OrbitControls, Environment, PerspectiveCamera, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';

export const Experience: React.FC = () => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 35]} fov={35} />
      
      {/* Camera Controller - Restricted vertical angle to keep the floor clean */}
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 2.5} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={20}
        maxDistance={50}
        rotateSpeed={0.5}
      />

      {/* Lighting: Mood is key */}
      <ambientLight intensity={0.2} color="#001a10" />
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.5} 
        penumbra={1} 
        intensity={200} 
        color="#fffae6" 
        castShadow 
      />
      <pointLight position={[-10, -5, -10]} intensity={50} color="#d4af37" />
      <pointLight position={[0, 10, 5]} intensity={80} color="#ffffff" />

      {/* Environment for Reflections */}
      <Environment preset="city" environmentIntensity={0.5} />

      {/* Content */}
      <group position={[0, -2, 0]}>
         <Float 
            speed={2} // Animation speed
            rotationIntensity={0.1} // XYZ rotation intensity
            floatIntensity={0.2} // Up/down float intensity
         >
            <Suspense fallback={null}>
              <Foliage />
              <Ornaments />
            </Suspense>
         </Float>
      </group>

      {/* Post Processing for the "Cinematic" Look */}
      <EffectComposer disableNormalPass>
        {/* Bloom: Creates the "glow" of the lights and gold */}
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        {/* Noise: Film grain for texture */}
        <Noise opacity={0.05} />
        {/* Vignette: Focus eyes on center */}
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
      </EffectComposer>
    </>
  );
};