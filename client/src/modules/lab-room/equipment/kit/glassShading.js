// Premultiplied glass: reflections stay full strength, alpha rises at grazing angles, liquids inside stay visible.
const OUTPUT = /* glsl */ `
float kitFresnel = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), 5.0 );
float kitAlpha = clamp( diffuseColor.a + kitFresnel * kitFresnelAlpha, 0.0, 1.0 );
gl_FragColor = vec4( ( totalDiffuse + totalEmissiveRadiance ) * kitAlpha + totalSpecular, kitAlpha );
`;

export const applySpecularAlpha = (material, fresnelAlpha) => {
  material.transparent = true;
  material.premultipliedAlpha = true;
  material.depthWrite = false;
  const uniform = { value: fresnelAlpha };
  material.userData.kitFresnelAlpha = uniform;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.kitFresnelAlpha = uniform;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float kitFresnelAlpha;")
      .replace("#include <opaque_fragment>", OUTPUT)
      .replace("#include <premultiplied_alpha_fragment>", "");
  };
  material.customProgramCacheKey = () => "kit-specular-alpha";
  return material;
};
