import { Bloom, EffectComposer, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

// Both tiers render into a linear buffer so glass and liquids blend correctly; Low skips MSAA and bloom (FXAA smeared dark blobs).
const RoomEffects = ({ high }) =>
  high ? (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.35} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  ) : (
    <EffectComposer multisampling={0}>
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
    </EffectComposer>
  );

export default RoomEffects;
