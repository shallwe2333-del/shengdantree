import React, { useLayoutEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { TreeState } from '../types';

const tempObject = new THREE.Object3D();
const vec3_a = new THREE.Vector3();
const vec3_b = new THREE.Vector3();

interface OrnamentLayerProps {
  count: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  scaleRange: [number, number];
  colorSet: string[];
}

const OrnamentLayer: React.FC<OrnamentLayerProps> = ({ count, geometry, material, scaleRange, colorSet }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const treeState = useStore((state) => state.treeState);

  // Data generation
  const { data } = useMemo(() => {
    const items = [];
    const height = 14;
    const baseRadius = 5.5; // Slightly wider than foliage

    for (let i = 0; i < count; i++) {
      // Tree Position
      const t = Math.random(); 
      // Bias randomness towards bottom for more natural look (cone volume)
      const y = (t * height) - (height / 2);
      const radiusAtHeight = (1 - t) * baseRadius;
      
      // Random angle
      const angle = Math.random() * Math.PI * 2;
      const r = radiusAtHeight * Math.sqrt(Math.random()); // Even distribution in circle slice
      
      // Push it to the edge of the tree primarily
      const edgeR = radiusAtHeight * (0.8 + Math.random() * 0.3);
      
      const treePos = new THREE.Vector3(
        edgeR * Math.cos(angle),
        y,
        edgeR * Math.sin(angle)
      );

      // Scatter Position
      const scatterR = 20 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const scatterPos = new THREE.Vector3(
        scatterR * Math.sin(phi) * Math.cos(theta),
        scatterR * Math.sin(phi) * Math.sin(theta),
        scatterR * Math.cos(phi)
      );

      // Rotation & Scale
      const rotation = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      const scale = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
      
      // Random Color from set
      const colorHex = colorSet[Math.floor(Math.random() * colorSet.length)];
      const color = new THREE.Color(colorHex);

      items.push({ treePos, scatterPos, rotation, scale, color });
    }
    return { data: items };
  }, [count, scaleRange, colorSet]);

  // Apply colors once
  useLayoutEffect(() => {
    if (meshRef.current) {
      data.forEach((item, i) => {
        meshRef.current?.setColorAt(i, item.color);
      });
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [data]);

  // Animation Loop
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Use a spring-like logic or simple lerp for the "global" progress
    // But since we can't easily pass a uniform to standard InstancedMesh material without patching,
    // we update matrices here. For < 1000 items, this is fine.
    
    // We maintain a "current progress" ref conceptually
    // To keep it simple, we'll calculate the mix based on a smoothed store value
    // For a real production app, we'd use a spring library hook for the value, but here we do simple damping:
    
    // NOTE: In a real "World Class" app, we might move this calculation to Vertex Shader for performance.
    // However, JS JIT is fast enough for 500 objects.
    
    const target = treeState === TreeState.TREE_SHAPE ? 1 : 0;
    // We reuse a static property on the mesh to store current progress to avoid react state render loop
    const mesh = meshRef.current as any;
    if (typeof mesh.userData.progress === 'undefined') mesh.userData.progress = 0;
    
    // Lerp progress
    const speed = 2.5;
    const diff = target - mesh.userData.progress;
    mesh.userData.progress += diff * speed * delta;

    const p = mesh.userData.progress;
    const time = state.clock.getElapsedTime();

    data.forEach((item, i) => {
      // Interpolate position
      // Add some "float" noise based on time
      const noise = Math.sin(time + i) * 0.2 * (1 - p); // Float more when scattered

      vec3_a.copy(item.scatterPos);
      vec3_b.copy(item.treePos);
      
      // Cubic easing for luxury feel
      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

      tempObject.position.lerpVectors(vec3_a, vec3_b, ease);
      tempObject.position.y += noise;

      // Rotate constantly
      tempObject.rotation.copy(item.rotation);
      tempObject.rotation.x += time * 0.2;
      tempObject.rotation.y += time * 0.3;

      tempObject.scale.setScalar(item.scale * (0.8 + 0.2 * Math.sin(time * 2 + i))); // Pulsate slightly

      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      castShadow
      receiveShadow
    />
  );
};

export const Ornaments: React.FC = () => {
  // Geometries
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  // Materials - Physical for PBR realism + Bloom interaction
  const goldMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#FFD700",
    metalness: 1.0,
    roughness: 0.15,
    envMapIntensity: 1.5,
  }), []);
  
  const redMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#8B0000",
    metalness: 0.6,
    roughness: 0.2,
    envMapIntensity: 1.0,
  }), []);

  // Color Sets
  const goldPalette = ['#F9A602', '#FFD700', '#DAA520', '#C5B358'];
  const mixPalette = ['#8B0000', '#560319', '#F9A602', '#DAA520'];

  return (
    <group>
      {/* Golden Baubles */}
      <OrnamentLayer 
        count={200}
        geometry={sphereGeo}
        material={goldMaterial}
        scaleRange={[0.2, 0.4]}
        colorSet={goldPalette}
      />
      {/* Gift Boxes / Red Ornaments */}
      <OrnamentLayer 
        count={150}
        geometry={boxGeo}
        material={redMaterial}
        scaleRange={[0.25, 0.5]}
        colorSet={mixPalette}
      />
      {/* Tiny light dots/stars (High emission) */}
       <OrnamentLayer 
        count={300}
        geometry={sphereGeo}
        material={new THREE.MeshStandardMaterial({
           color: "#FFF",
           emissive: "#FFD700",
           emissiveIntensity: 4, // High emission for bloom
           toneMapped: false
        })}
        scaleRange={[0.05, 0.1]}
        colorSet={['#FFFFFF']}
      />
    </group>
  );
};