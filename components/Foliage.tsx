import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { TreeState } from '../types';

// Custom Shader Material for the Foliage
// Handles the morphing logic on the GPU for maximum performance with 10k+ particles
const FoliageMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uProgress: { value: 0 }, // 0 = Scattered, 1 = Tree
    uColorBase: { value: new THREE.Color('#023825') }, // Deep Emerald
    uColorHighlight: { value: new THREE.Color('#D4AF37') }, // Gold
  },
  vertexShader: `
    uniform float uTime;
    uniform float uProgress;
    attribute vec3 aScatterPos;
    attribute vec3 aTreePos;
    attribute float aRandom;
    
    varying float vRandom;
    varying vec3 vPos;

    // Simplex noise function (simplified)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      vRandom = aRandom;
      
      // Interpolate positions
      // Add a slight curve to the interpolation for "cinematic" movement
      float ease = smoothstep(0.0, 1.0, uProgress);
      vec3 pos = mix(aScatterPos, aTreePos, ease);

      // Add breathing/float animation
      float noiseVal = snoise(pos * 0.5 + uTime * 0.5);
      pos += noiseVal * 0.2 * (1.0 - uProgress * 0.8); // More chaotic when scattered

      vPos = pos;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      gl_PointSize = (15.0 * aRandom + 5.0) * (10.0 / -mvPosition.z);
    }
  `,
  fragmentShader: `
    uniform vec3 uColorBase;
    uniform vec3 uColorHighlight;
    varying float vRandom;
    
    void main() {
      // Circular particle
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      float r = dot(cxy, cxy);
      if (r > 1.0) discard;

      // Soft glow edge
      float glow = 1.0 - r;
      glow = pow(glow, 2.0);

      // Mix colors based on randomness and radial position
      vec3 color = mix(uColorBase, uColorHighlight, vRandom * 0.3);
      
      // Add a very bright core
      if (r < 0.2) {
        color = mix(color, vec3(1.0, 1.0, 0.9), 0.5);
      }

      gl_FragColor = vec4(color, glow * 0.9); // Slight transparency
    }
  `
};

const COUNT = 12000;
const RADIUS_BASE = 5;
const HEIGHT = 14;

export const Foliage: React.FC = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const treeState = useStore((state) => state.treeState);

  // Generate Geometry Data
  const { positions, scatterPositions, randoms } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const scat = new Float32Array(COUNT * 3);
    const rnd = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      
      // Tree Shape (Spiral Cone)
      const t = i / COUNT;
      const angle = t * 120.0; // Many spirals
      const y = t * HEIGHT - (HEIGHT / 2); 
      const radius = (1 - t) * RADIUS_BASE;
      // Add some fuzziness to the tree shape so it's not perfect lines
      const fuzzX = (Math.random() - 0.5) * 0.5;
      const fuzzZ = (Math.random() - 0.5) * 0.5;
      const fuzzY = (Math.random() - 0.5) * 0.5;

      pos[i3] = (radius * Math.cos(angle)) + fuzzX;
      pos[i3 + 1] = y + fuzzY;
      pos[i3 + 2] = (radius * Math.sin(angle)) + fuzzZ;

      // Scattered Shape (Spherical Cloud)
      const r = 15 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      scat[i3] = r * Math.sin(phi) * Math.cos(theta);
      scat[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      scat[i3 + 2] = r * Math.cos(phi);

      rnd[i] = Math.random();
    }
    return { positions: pos, scatterPositions: scat, randoms: rnd };
  }, []);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value += delta;
      
      // Smooth transition logic
      const target = treeState === TreeState.TREE_SHAPE ? 1 : 0;
      // Simple lerp for uniforms is often enough, but let's make it snappy
      const current = shaderRef.current.uniforms.uProgress.value;
      const step = (target - current) * 2.0 * delta; // Speed 2.0
      
      shaderRef.current.uniforms.uProgress.value += step;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position" // This serves as the 'tree' position conceptually in fallback, but shader uses attributes below
          count={COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTreePos"
          count={COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPos"
          count={COUNT}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={COUNT}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        attach="material"
        args={[FoliageMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};