import * as THREE from 'three';
import { ellipsoid, material, tubeBetween } from './materials.js';
import { DEFAULT_SKIN_OPACITY, ORGAN_INFO } from './anatomyData.js';
import { loadSkeletonAsset } from './SkeletonAsset.js';
import { loadDracoAnatomyAsset } from './AnatomyAsset.js';
import anatomySkinUrl from '@/shared/assets/models/anatomy-skin.glb?url';
import anatomyOrgansUrl from '@/shared/assets/models/anatomy-organs.glb?url';
import { BODY_PARTS_DEPTH_REFERENCE, PROCEDURAL_VESSEL_DEPTH_ORIGIN, depthOffset, detailedSourceTranslation } from './alignment.js';
import { validateStagedOrganGroups } from './assetSemantics.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const ARM_VESSEL_CONTROL_POINTS = Object.freeze([
  Object.freeze([.08, 1.55, .2]),
  Object.freeze([.36, 2.18, .12]),
  Object.freeze([.62, 2.05, .07]),
  Object.freeze([.9, 1.2, .04]),
  Object.freeze([.96, .35, .03]),
]);

export function createArmVesselCurve(sign = 1) {
  return new THREE.CatmullRomCurve3(ARM_VESSEL_CONTROL_POINTS.map(([x,y,z])=>V(sign*x,y,z)),false,'centripetal');
}

export class HumanModel {
  constructor() {
    this.root = new THREE.Group();
    this.layers = { skin: new THREE.Group(), skeleton: new THREE.Group(), organs: new THREE.Group(), circulatory: new THREE.Group() };
    this.pickables = [];
    this.organMeshes = new Map();
    this.structureMeshes = new Map();
    this.selectedOrgan = null;
    this.hoveredOrgan = null;
    this.materialStates = new Map();
    this.layerOpacity = {skin:DEFAULT_SKIN_OPACITY,skeleton:1,organs:1,circulatory:1};
    this.actionLayers = null;
    this.disposed = false;
    Object.entries(this.layers).forEach(([name, group]) => { group.name = name; this.root.add(group); });
    this.buildSkin(); this.buildSkeleton(); this.buildOrgans(); this.buildVessels();
    this.highlightMaterial = material('#f2b56b',{roughness:.42,clearcoat:.25});
    this.hoverMaterial = material('#76a9c6',{roughness:.48,clearcoat:.2});
  }

  add(group, mesh, position, name) {
    mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
    if (name) mesh.name = name;
    group.add(mesh); return mesh;
  }

  buildSkin() {
    const g = this.layers.skin;
    this.fallbackSkin = new THREE.Group(); this.fallbackSkin.name='Procedural skin fallback'; g.add(this.fallbackSkin);
    const skin = material('#b9786d', { transparent: true, opacity: DEFAULT_SKIN_OPACITY, roughness: .62, depthWrite: false, side: THREE.FrontSide, sheen:.18, sheenColor:'#e0a39a' });
    const addE = (p, s, r = .5) => this.add(this.fallbackSkin, ellipsoid(r, s, skin), p);
    addE([0, 3.45, 0], [.78, 1, .82], .5); // head
    this.add(this.fallbackSkin, tubeBetween(V(0,2.83,0), V(0,2.62,0), .27, skin, 20), [0,0,0]);
    addE([0, 1.65, 0], [1.25, 1.65, .62], .78); // torso
    addE([0, .45, 0], [1.15, .65, .7], .7);
    [[-.82,2.35,0], [.82,2.35,0]].forEach((p,i)=>{
      const sign=i?1:-1;
      this.add(this.fallbackSkin,tubeBetween(V(sign*.7,2.35,0),V(sign*1.22,1.25,0),.22,skin,16),[0,0,0]);
      this.add(this.fallbackSkin,tubeBetween(V(sign*1.22,1.25,0),V(sign*1.18,.18,0),.18,skin,16),[0,0,0]);
      addE([sign*1.18,.02,0],[.6,.85,.45],.25);
      this.add(this.fallbackSkin,tubeBetween(V(sign*.43,.12,0),V(sign*.52,-1.55,0),.32,skin,18),[0,0,0]);
      this.add(this.fallbackSkin,tubeBetween(V(sign*.52,-1.55,0),V(sign*.48,-3.05,.02),.23,skin,18),[0,0,0]);
      addE([sign*.48,-3.25,.13],[.7,.48,1.35],.3);
    });
  }

  buildSkeleton() {
    const g=this.layers.skeleton, bone=material('#d8d2bb',{roughness:.75});
    this.fallbackSkeleton = new THREE.Group(); this.fallbackSkeleton.name='Procedural skeleton fallback'; g.add(this.fallbackSkeleton);
    const original=g; this.layers.skeleton=this.fallbackSkeleton; const target=this.layers.skeleton;
    this.add(target,ellipsoid(.42,[.83,1,.8],bone),[0,3.45,0]);
    this.add(target,tubeBetween(V(0,3.05,0),V(0,-.05,0),.075,bone,10),[0,0,0]);
    for(let y=2.35;y>.65;y-=.26){
      const width=.62-(2.35-y)*.1;
      const curve=new THREE.CatmullRomCurve3([V(0,y,.03),V(width*.75,y-.04,.22),V(width,y-.12,0),V(width*.55,y-.19,-.24),V(0,y-.21,-.27)]);
      const rib=new THREE.Mesh(new THREE.TubeGeometry(curve,20,.035,6,false),bone); target.add(rib);
      const rib2=rib.clone(); rib2.scale.x=-1; target.add(rib2);
    }
    this.add(target,tubeBetween(V(-.65,2.48,0),V(.65,2.48,0),.055,bone),[0,0,0]);
    const bones=[[V(-.55,.2,0),V(-.48,-1.5,0),.09],[V(.55,.2,0),V(.48,-1.5,0),.09],[V(-.48,-1.5,0),V(-.45,-3.05,0),.07],[V(.48,-1.5,0),V(.45,-3.05,0),.07],[V(-.63,2.4,0),V(-1.2,1.25,0),.065],[V(.63,2.4,0),V(1.2,1.25,0),.065],[V(-1.2,1.25,0),V(-1.17,.22,0),.05],[V(1.2,1.25,0),V(1.17,.22,0),.05]];
    bones.forEach(([a,b,r])=>target.add(tubeBetween(a,b,r,bone)));
    const pelvis=new THREE.Mesh(new THREE.TorusGeometry(.46,.09,8,24,Math.PI),bone); pelvis.rotation.z=Math.PI; pelvis.position.y=.15; target.add(pelvis);
    this.layers.skeleton=original;
  }

  async loadDetailedSkeleton(onProgress) {
    const asset=await loadSkeletonAsset({onProgress});
    if(this.disposed){disposeObjectResources(asset.root);return {...asset,ignored:true};}
    this.layers.skeleton.add(asset.root); this.fallbackSkeleton.visible=false;
    asset.pickables.forEach(mesh=>{this.pickables.push(mesh);this.structureMeshes.set(mesh.userData.structureId,mesh);mesh.userData.baseMaterial=mesh.material;});
    this.skeletonAsset=asset.root;
    return asset;
  }

  organ(id, mesh, p) {
    mesh.userData={organId:id}; mesh.name=ORGAN_INFO[id].name; this.add(this.layers.organs,mesh,p,id);
    this.registerPickable(mesh); this.organMeshes.set(id,mesh); return mesh;
  }

  registerPickable(mesh) {
    this.pickables.push(mesh);
    this.captureMaterialState(mesh.material);
    return mesh;
  }
  captureMaterialState(mat){if(!this.materialStates.has(mat))this.materialStates.set(mat,{opacity:mat.opacity,transparent:mat.transparent,depthWrite:mat.depthWrite,emissive:mat.emissive?.clone(),emissiveIntensity:mat.emissiveIntensity,pulseEmissive:new THREE.Color(0),pulseIntensity:0});return this.materialStates.get(mat);}

  buildOrgans() {
    this.fallbackOrgans = new THREE.Group(); this.fallbackOrgans.name='Procedural organ fallback'; this.layers.organs.add(this.fallbackOrgans);
    const realLayer=this.layers.organs; this.layers.organs=this.fallbackOrgans;
    const mat=id=>material(ORGAN_INFO[id].color,{roughness:.7,clearcoat:.12});
    const brain=this.organ('brain',ellipsoid(.38,[.92,.52,.88],mat('brain'),28),[0,3.02,-.08]); this.cerebrum=brain;
    const grooveMat=material('#b85f72'); for(let i=-2;i<=2;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.25-Math.abs(i)*.025,.012,6,24),grooveMat);ring.rotation.x=Math.PI/2;ring.position.set(i*.09,3.48,.32);ring.scale.y=.75;this.layers.organs.add(ring);}
    const lungs=[]; [-1,1].forEach(sign=>{const lung=this.organ('lungs',ellipsoid(.42,[.72,1.35,.55],mat('lungs')),[sign*.4,1.92,0]); lung.rotation.z=sign*.1; lungs.push(lung);}); this.organMeshes.set('lungs',lungs);
    const heart=this.organ('heart',ellipsoid(.3,[.75,1,.7],mat('heart')),[.08,1.55,.34]); heart.rotation.z=-.28;
    const liver=this.organ('liver',ellipsoid(.42,[1.28,.55,.64],mat('liver')),[.2,.86,.12]); liver.rotation.z=-.1;
    const stomach=this.organ('stomach',ellipsoid(.3,[.78,1.05,.58],mat('stomach')),[ -.27,.55,.18]); stomach.rotation.z=-.35;
    const kidneys=[];[-1,1].forEach(sign=>{const k=this.organ('kidneys',ellipsoid(.2,[.65,1,.5],mat('kidneys')),[sign*.4,.48,-.2]);k.rotation.z=sign*.18;kidneys.push(k)});this.organMeshes.set('kidneys',kidneys);
    const intestineMat=mat('intestines'), curves=[];
    for(let row=0;row<4;row++){const y=.18-row*.18;curves.push(new THREE.CatmullRomCurve3([V(-.42,y,.23),V(-.18,y+(row%2?.08:-.08),.34),V(.18,y+(row%2?-.08:.08),.34),V(.42,y,.23)]));}
    const intestineGroup=new THREE.Group(); curves.forEach(c=>intestineGroup.add(new THREE.Mesh(new THREE.TubeGeometry(c,30,.07,8,false),intestineMat))); intestineGroup.userData={organId:'intestines'}; intestineGroup.name='Intestines'; this.layers.organs.add(intestineGroup); intestineGroup.children.forEach(m=>{m.userData={organId:'intestines'};this.registerPickable(m)}); this.organMeshes.set('intestines',intestineGroup);
    this.animated={heart,lungs};
    this.layers.organs=realLayer;
  }

  async loadScannedSkin(onProgress,loadAsset=loadDracoAnatomyAsset) {
    const asset=await loadAsset(anatomySkinUrl,{onProgress});
    if(this.disposed){disposeObjectResources(asset.root);return {...asset,ignored:true};}
    const entries=asset.groups.get('skin');
    if (!entries?.length){disposeObjectResources(asset.root);throw new Error('FMA7163 skin node is missing');}
    const sourceMaterials=new Set(entries.flatMap(({node})=>Array.isArray(node.material)?node.material:[node.material]).filter(Boolean));
    const skinMaterial=new THREE.MeshPhysicalMaterial({color:0xc9877b,roughness:.68,transparent:true,opacity:DEFAULT_SKIN_OPACITY,depthWrite:false,side:THREE.FrontSide,transmission:0,thickness:0,sheen:.16,sheenColor:new THREE.Color(0xe1aaa0)});
    asset.root.position.copy(detailedSourceTranslation());
    entries.forEach(({node,fmaId})=>{node.material=skinMaterial;node.castShadow=false;node.receiveShadow=false;node.renderOrder=10;node.userData={...node.userData,structureId:'skin',fmaId,baseOpacity:DEFAULT_SKIN_OPACITY};});
    sourceMaterials.forEach(mat=>mat.dispose());
    this.layers.skin.add(asset.root); this.fallbackSkin.visible=false; this.skinAsset=asset.root;
    this.alignVesselsToDetailedAnatomy();
    return {...asset, count:entries.length};
  }

  async loadDetailedOrgans(onProgress,loadAsset=loadDracoAnatomyAsset) {
    const asset=await loadAsset(anatomyOrgansUrl,{onProgress});
    const materials={
      stomach:material('#c97870',{roughness:.58,clearcoat:.08}), liver:material('#7d3039',{roughness:.66,clearcoat:.1}),
      kidneys:material('#8f4854',{roughness:.62,clearcoat:.08}), lungs:material('#d98e98',{roughness:.7,clearcoat:.06}),
      heart:material('#bd3046',{roughness:.5,clearcoat:.18}), intestines:material('#d08a69',{roughness:.68,clearcoat:.06}),
      brain:material('#d98599',{roughness:.72,clearcoat:.04}),
    };
    let staged;
    try{staged=validateStagedOrganGroups(asset.groups);}catch(error){disposeObjectResources(asset.root);Object.values(materials).forEach(mat=>mat.dispose());throw error;}
    if(this.disposed){disposeObjectResources(asset.root);Object.values(materials).forEach(mat=>mat.dispose());return {...asset,ignored:true};}
    asset.root.position.copy(detailedSourceTranslation());
    const stagedPickables=[],sourceMaterials=new Set();
    staged.forEach((entries,id)=>entries.forEach(({node,fmaId})=>{for(const mat of Array.isArray(node.material)?node.material:[node.material])if(mat)sourceMaterials.add(mat);node.material=materials[id];node.name=ORGAN_INFO[id].name;node.castShadow=true;node.receiveShadow=true;node.userData={...node.userData,organId:id,fmaId,baseMaterial:node.material};stagedPickables.push(node);}));
    sourceMaterials.forEach(mat=>mat.dispose());
    stagedPickables.forEach(node=>this.registerPickable(node));
    staged.forEach((entries,id)=>this.organMeshes.set(id,entries.map(entry=>entry.node)));
    this.layers.organs.add(asset.root);
    this.fallbackOrgans.visible=false;
    this.alignVesselsToDetailedAnatomy();
    const heartParts=this.organMeshes.get('heart'), lungParts=this.organMeshes.get('lungs');
    this.animated={heart:heartParts,lungs:lungParts};
    this.detailedMotionMaterials={heart:[...new Set(heartParts.map(n=>n.material))],lungs:[...new Set(lungParts.map(n=>n.material))]};
    this.organAsset=asset.root;
    return asset;
  }

  buildVessels() {
    const g=this.layers.circulatory, artery=material('#c92e47',{roughness:.5}), vein=material('#286ca8',{roughness:.5});
    const paths=[[V(.1,1.6,.22),V(.08,.5,.18),V(.05,-.1,.1)],[V(.05,-.1,.1),V(-.48,-1.5,.05),V(-.43,-3,.04)],[V(.05,-.1,.1),V(.48,-1.5,.05),V(.43,-3,.04)]];
    paths.forEach((points,i)=>{const curve=new THREE.CatmullRomCurve3(points);g.add(new THREE.Mesh(new THREE.TubeGeometry(curve,32,i? .025:.045,7,false),i%2?vein:artery));});
    [-1,1].forEach((sign,i)=>g.add(new THREE.Mesh(new THREE.TubeGeometry(createArmVesselCurve(sign),40,.025,7,false),i?artery:vein)));
    const headCurve=new THREE.CatmullRomCurve3([V(.08,1.7,.12),V(0,2.85,.05),V(0,3.15,.03)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(headCurve,32,.025,7,false),vein));
    this.pulseMaterials=[artery,vein];
  }

  alignVesselsToDetailedAnatomy() {
    this.layers.circulatory.position.z=depthOffset(PROCEDURAL_VESSEL_DEPTH_ORIGIN,BODY_PARTS_DEPTH_REFERENCE);
  }

  setVisibility(key, visible){ if(this.layers[key]) this.layers[key].visible=visible; }
  setOpacity(key, opacity){
    const layer=this.layers[key];if(!layer)return;this.layerOpacity[key]=opacity;layer.visible=opacity>0;
    const normal=new Set(),faded=new Set();
    layer.traverse(mesh=>{if(!mesh.isMesh)return;const current=Array.isArray(mesh.material)?mesh.material:[mesh.material];const stored=mesh.userData.actionMaterial?(Array.isArray(mesh.userData.actionMaterial)?mesh.userData.actionMaterial:[mesh.userData.actionMaterial]):null;if(stored){stored.forEach(mat=>mat&&normal.add(mat));current.forEach(mat=>mat&&faded.add(mat));}else current.forEach(mat=>mat&&normal.add(mat));});
    normal.forEach(mat=>{const state=this.captureMaterialState(mat),base=state.opacity;mat.transparent=key==='skin'||opacity<.995||base<.995;mat.opacity=key==='skin'?opacity:Math.min(base,opacity);mat.depthWrite=key==='skin'?false:opacity>.75&&base>.75;if(key==='skin'){mat.transmission=0;mat.thickness=0;mat.side=THREE.FrontSide;}});
    faded.forEach(mat=>{mat.transparent=true;mat.opacity=Math.min(opacity,.08);mat.depthWrite=false;});
    this.syncBoneInteractionOpacity();
  }
  applyBoneInteraction(mesh,template){if(!mesh)return;if(mesh.userData.interactionMaterial){mesh.userData.interactionMaterial.dispose();delete mesh.userData.interactionMaterial;}const clone=template.clone();const opacity=this.layerOpacity.skeleton;clone.opacity=Math.min(template.opacity,opacity);clone.transparent=opacity<.995;clone.depthWrite=opacity>.75;mesh.material=clone;mesh.userData.interactionMaterial=clone;}
  restoreBoneMaterial(mesh){if(!mesh)return;if(mesh.userData.interactionMaterial){mesh.userData.interactionMaterial.dispose();delete mesh.userData.interactionMaterial;}mesh.material=mesh.userData.baseMaterial;}
  syncBoneInteractionOpacity(){if(this.selectedMesh)this.applyBoneInteraction(this.selectedMesh,this.highlightMaterial);if(this.hoveredMesh&&this.hoveredMesh!==this.selectedMesh)this.applyBoneInteraction(this.hoveredMesh,this.hoverMaterial);}
  setStructureSelected(id){
    this.restoreBoneMaterial(this.selectedMesh);
    this.selectedMesh=this.structureMeshes.get(id)||null;
    if(this.selectedMesh)this.applyBoneInteraction(this.selectedMesh,this.highlightMaterial);
    if(this.hoveredMesh&&this.hoveredMesh!==this.selectedMesh)this.applyBoneInteraction(this.hoveredMesh,this.hoverMaterial);
  }
  setStructureHovered(id){
    if(this.hoveredMesh!==this.selectedMesh)this.restoreBoneMaterial(this.hoveredMesh);
    this.hoveredMesh=this.structureMeshes.get(id)||null;
    if(this.hoveredMesh&&this.hoveredMesh!==this.selectedMesh)this.applyBoneInteraction(this.hoveredMesh,this.hoverMaterial);
  }
  hideStructure(id, hidden=true){const bone=this.structureMeshes.get(id);if(bone)bone.visible=!hidden;else this.getOrganParts(id).forEach(mesh=>mesh.visible=!hidden);}
  getOrganParts(id){const value=this.organMeshes.get(id);return value?[...(Array.isArray(value)?value:value.isGroup?value.children:[value])]:[];}
  isolate(id){
    this.restoreAll();
    const targetLayer=id?.startsWith('bone:')?'skeleton':'organs';
    Object.entries(this.layers).forEach(([key,layer])=>{layer.visible=key===targetLayer;});
    this.pickables.forEach(mesh=>{mesh.visible=(mesh.userData.structureId||mesh.userData.organId)===id;});
  }
  fadeOthers(id){this.restoreAll();const targetLayer=id?.startsWith('bone:')?'skeleton':'organs';this.actionLayers=new Map(Object.entries(this.layers).map(([key,layer])=>[key,layer.visible]));Object.entries(this.layers).forEach(([key,layer])=>{if(key!==targetLayer)this.fadeObject(layer);});this.pickables.forEach(mesh=>{if((mesh.userData.structureId||mesh.userData.organId)!==id)this.fadeObject(mesh);});}
  fadeObject(object){object.traverse(node=>{if(!node.isMesh||node.userData.actionMaterial)return;node.userData.actionMaterial=node.material;const clone=node.material.clone();clone.transparent=true;clone.opacity=Math.min(clone.opacity,.08);clone.depthWrite=false;node.material=clone;});}
  restoreAll(){Object.entries(this.layers).forEach(([key,layer])=>{layer.visible=this.layerOpacity[key]>0;});this.root.traverse(node=>{if(!node.isMesh)return;node.visible=true;if(node.userData.actionMaterial){node.material.dispose();node.material=node.userData.actionMaterial;delete node.userData.actionMaterial;}});this.actionLayers=null;this.syncBoneInteractionOpacity();}
  animate(scales){if(this.detailedMotionMaterials){this.detailedMotionMaterials.heart.forEach(mat=>{const s=this.captureMaterialState(mat);s.pulseEmissive.setRGB(scales.pulse*.09,0,0);s.pulseIntensity=.55;});this.detailedMotionMaterials.lungs.forEach(mat=>{const s=this.captureMaterialState(mat),a=Math.abs(scales.breath-1)/.035;s.pulseEmissive.setRGB(.018*a,.008*a,.012*a);s.pulseIntensity=0;});this.updateHighlights();for(const mat of [...this.detailedMotionMaterials.heart,...this.detailedMotionMaterials.lungs])if(!this.pickables.some(mesh=>mesh.material===mat)){const s=this.materialStates.get(mat);mat.emissive.copy(s.emissive).add(s.pulseEmissive);mat.emissiveIntensity=s.pulseIntensity||s.emissiveIntensity;}}else{this.animated.heart.scale.set(.75*scales.heartbeat,scales.heartbeat,.7*scales.heartbeat);this.animated.lungs.forEach(lung=>lung.scale.set(.72*scales.breath,1.35*scales.breath,.55*scales.breath));}this.pulseMaterials[0].emissive.setRGB(scales.pulse*.25,0,0);}
  updateHighlights(){
    const materialOrganIds = new Map();
    this.pickables.forEach(mesh=>{
      if (!materialOrganIds.has(mesh.material)) materialOrganIds.set(mesh.material, new Set());
      materialOrganIds.get(mesh.material).add(mesh.userData.organId);
    });
    materialOrganIds.forEach((ids, mat)=>{
      const base=this.materialStates.get(mat), selected=ids.has(this.selectedOrgan), hovered=ids.has(this.hoveredOrgan);
      if(mat.emissive&&base?.emissive){mat.emissive.copy(base.emissive);if(selected)mat.emissive.add(new THREE.Color(0x55202a));else if(hovered)mat.emissive.add(new THREE.Color(0x164b55));else mat.emissive.add(base.pulseEmissive||new THREE.Color(0));}
      mat.emissiveIntensity=selected?.65:hovered?.48:(base?.pulseIntensity||(base?.emissiveIntensity??1));
    });
  }
  setSelected(id){ this.selectedOrgan=id; this.updateHighlights(); }
  setHovered(id){ this.hoveredOrgan=id; this.updateHighlights(); }
  dispose(){if(this.disposed)return;this.disposed=true;this.restoreBoneMaterial(this.selectedMesh);this.restoreBoneMaterial(this.hoveredMesh);disposeObjectResources(this.root,new Set([this.highlightMaterial,this.hoverMaterial,...this.materialStates.keys()]));}
}

export function disposeObjectResources(root,extraMaterials=new Set()){const geometries=new Set(),materials=new Set(extraMaterials);root?.traverse(node=>{if(!node.isMesh)return;if(node.geometry)geometries.add(node.geometry);for(const mat of Array.isArray(node.material)?node.material:[node.material])if(mat)materials.add(mat);if(node.userData?.actionMaterial)materials.add(node.userData.actionMaterial);if(node.userData?.baseMaterial)materials.add(node.userData.baseMaterial);if(node.userData?.interactionMaterial)materials.add(node.userData.interactionMaterial);});geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());}
