import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { HumanModel } from "./engine/HumanModel";
// A component that manages the engine instance and animation loop
const EngineRunner = ({ modelRef, setLoaded, speed, paused, selectedOrgan, hoveredOrgan, opacities, layers }) => {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    // Setup camera initially (similar to how the original app did it, or just use OrbitControls defaults)
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    const model = new HumanModel();
    modelRef.current = model;

    // Load assets
    Promise.all([
      model.loadDetailedSkeleton(),
      model.loadScannedSkin(),
      model.loadDetailedOrgans(),
    ]).then(() => {
      setLoaded(true);
      invalidate();
    });

    return () => {
      model.dispose();
      modelRef.current = null;
    };
  }, [setLoaded, invalidate, modelRef]);

  // Sync state to the model
  useEffect(() => {
    if (!modelRef.current) return;
    const m = modelRef.current;
    
    // Set layer opacities and visibility
    Object.entries(opacities).forEach(([layer, opacity]) => {
      m.setOpacity(layer, opacity);
    });
    Object.entries(layers).forEach(([layer, visible]) => {
      m.setVisibility(layer, visible);
    });

    // Handle selection and hover
    m.setSelected(selectedOrgan);
    m.setHovered(hoveredOrgan);
    
    invalidate();
  }, [opacities, layers, selectedOrgan, hoveredOrgan, invalidate, modelRef]);

  // Animation Loop
  useFrame(({ clock }) => {
    if (!modelRef.current) return;
    const scales = animationScales(clock.elapsedTime, speed, paused);
    modelRef.current.animate(scales);
    invalidate(); // Needed if we want continuous animation rendering
  });

  if (!modelRef.current) return null;

  return (
    <primitive object={modelRef.current.root} />
  );
};

// We need a separate state module function ported or recreated:
// But wait, the state functions are simple. Let's provide them here.
export function clampSpeed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(2, Math.max(0.25, number));
}

export function animationScales(time, speed = 1, paused = false) {
  if (paused) return { breath: 1, heartbeat: 1, pulse: 0 };
  const t = time * clampSpeed(speed);
  const breath = 1 + Math.sin(t * 1.7) * 0.035;
  const phase = (t * 1.25) % 1;
  const beat = Math.exp(-Math.pow((phase - 0.08) / 0.055, 2)) + 0.45 * Math.exp(-Math.pow((phase - 0.22) / 0.075, 2));
  return { breath, heartbeat: 1 + beat * 0.12, pulse: Math.min(1, beat) };
}

export default function SimulatorCanvas({ speed, paused, selectedOrgan, hoveredOrgan, opacities, layers }) {
  const modelRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="w-full h-full relative">
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-white">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-emerald-400 font-medium">Batafsil anatomiya yuklanmoqda...</p>
        </div>
      )}
      <Canvas shadows frameloop="demand">
        <color attach="background" args={["#0a0a0a"]} />
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={1024} 
        />
        <directionalLight position={[-5, -5, -5]} intensity={0.5} />
        
        {/* The Simulator Engine */}
        <EngineRunner 
          modelRef={modelRef}
          setLoaded={setLoaded}
          speed={speed}
          paused={paused}
          selectedOrgan={selectedOrgan}
          hoveredOrgan={hoveredOrgan}
          opacities={opacities}
          layers={layers}
        />
        
        <OrbitControls 
          enablePan={false}
          minDistance={1.5}
          maxDistance={15}
          autoRotate={false}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
