import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, Bounds, Center } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

const GLTFModel: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
};

const OBJModel: React.FC<{ url: string }> = ({ url }) => {
  const obj = useLoader(OBJLoader, url);
  return <primitive object={obj} />;
};

const STLModel: React.FC<{ url: string }> = ({ url }) => {
  const geom = useLoader(STLLoader, url);
  return (
    <mesh geometry={geom as THREE.BufferGeometry}>
      <meshStandardMaterial color="#c9a04c" metalness={0.2} roughness={0.6} />
    </mesh>
  );
};

interface Props { url: string; ext: string; }

export const Model3DViewer: React.FC<Props> = ({ url, ext }) => {
  const e = ext.toLowerCase();
  const Model = useMemo(() => {
    if (e === 'glb' || e === 'gltf') return <GLTFModel url={url} />;
    if (e === 'obj') return <OBJModel url={url} />;
    if (e === 'stl') return <STLModel url={url} />;
    return null;
  }, [url, e]);

  if (!Model) return <div className="p-4 text-sm text-destructive">صيغة غير مدعومة: {ext}</div>;

  return (
    <div className="w-full h-[500px] rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 overflow-hidden">
      <Canvas shadows camera={{ position: [3, 3, 3], fov: 50 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.6}>
            <Bounds fit clip observe margin={1.2}>
              <Center>{Model}</Center>
            </Bounds>
          </Stage>
          <OrbitControls makeDefault enableDamping />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Model3DViewer;
