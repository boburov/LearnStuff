import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mirroredNodeName, isRightSideNode } from './skeletonNodes.js';
import { detailedSkeletonTransform } from './alignment.js';
import overviewSkeletonUrl from '@/shared/assets/models/overview-skeleton.glb?url';

function configureBone(mesh, name, material, pickables, structures) {
  mesh.name = name;
  mesh.material = material;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.structureId = `bone:${name}`;
  mesh.userData.structureName = name;
  pickables.push(mesh);
  structures.push(name);
}

export async function loadSkeletonAsset({ onProgress = () => {} } = {}) {
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  try {
    const gltf = await loader.loadAsync(overviewSkeletonUrl, event => {
      onProgress(event.total ? event.loaded / event.total : 0, event.loaded, event.total);
    });
    const source = gltf.scene;
    source.updateMatrixWorld(true);
    const initialBox = new THREE.Box3().setFromObject(source);
    const root = new THREE.Group();
    root.name = 'Anatomist-reviewed skeleton';
    const material = new THREE.MeshPhysicalMaterial({ color: 0xd8d2c2, roughness: .67, clearcoat: .08, clearcoatRoughness: .72 });
    const cartilageMaterial = new THREE.MeshPhysicalMaterial({ color: 0xb7aca0, roughness: .74, transmission: .04, transparent: true, opacity: .9 });
    const pickables = [], structures = [];
    const originals = [];
    source.traverse(node => { if (node.isMesh) originals.push(node); });
    originals.forEach(mesh => {
      const nodeIndex=gltf.parser.associations.get(mesh)?.nodes;
      const sourceName=nodeIndex==null?mesh.name:gltf.parser.json.nodes[nodeIndex]?.name||mesh.name;
      configureBone(mesh,sourceName,/costal cart/i.test(sourceName)?cartilageMaterial:material,pickables,structures);
    });
    const mirrored = new THREE.Group();
    mirrored.name = 'Generated left-side bones';
    originals.filter(mesh => isRightSideNode(mesh.name)).forEach(mesh => {
      const clone = mesh.clone();
      const name = mirroredNodeName(mesh.name);
      clone.geometry = mesh.geometry;
      clone.material = mesh.material;
      mesh.updateWorldMatrix(true, false);
      clone.matrix.copy(mesh.matrixWorld);
      clone.matrix.premultiply(new THREE.Matrix4().makeScale(-1, 1, 1));
      clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
      configureBone(clone, name, clone.material, pickables, structures);
      mirrored.add(clone);
    });
    root.add(source,mirrored);
    const transform = detailedSkeletonTransform(initialBox);
    root.scale.setScalar(transform.scale);
    root.position.set(transform.position.x, transform.position.y, transform.position.z);
    root.userData.ownedMaterials = [material, cartilageMaterial];
    return { root, pickables, structures: [...new Set(structures)].sort((a, b) => a.localeCompare(b)), fallback: false };
  } finally {
    draco.dispose();
  }
}
