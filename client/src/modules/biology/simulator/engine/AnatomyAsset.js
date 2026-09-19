import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { groupSemanticNodes } from './assetSemantics.js';

export async function loadDracoAnatomyAsset(url, { onProgress = () => {} } = {}) {
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  try {
    const gltf = await loader.loadAsync(url, event => onProgress(event.total ? event.loaded / event.total : 0, event.loaded, event.total));
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    const semanticNodes = [];
    root.traverse(node => {
      if (!node.isMesh) return;
      if (!node.geometry.getAttribute('normal')) node.geometry.computeVertexNormals();
      semanticNodes.push(node);
    });
    const groups = groupSemanticNodes(semanticNodes);
    const box = new THREE.Box3().setFromObject(root);
    return { root, groups, box };
  } finally {
    draco.dispose();
  }
}
