import * as THREE from 'three';

export function material(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: options.roughness ?? 0.66,
    metalness: 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    depthWrite: options.depthWrite ?? true,
    side: options.side ?? THREE.FrontSide,
    clearcoat: options.clearcoat ?? 0.05,
    clearcoatRoughness: options.clearcoatRoughness ?? .65,
    transmission: options.transmission ?? 0,
    thickness: options.thickness ?? 0,
    ior: options.ior ?? 1.4,
    sheen: options.sheen ?? 0,
    sheenColor: options.sheenColor ?? new THREE.Color(color),
  });
}

export function tubeBetween(a, b, radius, mat, radialSegments = 8) {
  const delta = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), radialSegments), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  return mesh;
}

export function ellipsoid(radius, scale, mat, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(12, segments / 2)), mat);
  mesh.scale.set(...scale);
  return mesh;
}
