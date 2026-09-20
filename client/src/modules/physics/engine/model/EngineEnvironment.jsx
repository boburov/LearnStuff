import { Environment, Lightformer } from "@react-three/drei";

// Offline studio reflections: softboxes + strips so machined metal reads as metal.
const EngineEnvironment = () => (
  <Environment resolution={256}>
    <color attach="background" args={["#0d111b"]} />
    <Lightformer form="rect" intensity={4} position={[0, 6, 4]} scale={[8, 4, 1]} color="#ffffff" />
    <Lightformer form="rect" intensity={3} position={[-6, 3, -5]} scale={[4, 7, 1]} color="#b9d0ff" />
    <Lightformer form="rect" intensity={1.8} position={[6, 1.5, 2]} scale={[4, 5, 1]} color="#ffe2c2" />
    <Lightformer form="rect" intensity={5} position={[0, 2.5, 7]} scale={[14, 0.35, 1]} color="#ffffff" />
    <Lightformer form="rect" intensity={2.5} position={[-5, 1, 5]} scale={[0.4, 10, 1]} color="#eef3ff" />
    <Lightformer form="ring" intensity={1.6} position={[4, 4, -6]} scale={3} color="#a78bfa" />
    <Lightformer form="circle" intensity={0.5} position={[0, -6, 0]} scale={10} color="#3b2a66" />
  </Environment>
);

export default EngineEnvironment;
