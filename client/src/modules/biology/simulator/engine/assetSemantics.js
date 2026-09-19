export const SEMANTIC_NODE = /^([a-z][a-z0-9-]*)__([A-Z]+\d+)$/i;

export function parseSemanticNode(name = '') {
  const match = name.trim().match(SEMANTIC_NODE);
  return match ? { organId: match[1].toLowerCase(), fmaId: match[2].toUpperCase() } : null;
}

export function groupSemanticNodes(nodes) {
  const groups = new Map();
  nodes.forEach(node => {
    const semantic = parseSemanticNode(node.name);
    if (!semantic) return;
    if (!groups.has(semantic.organId)) groups.set(semantic.organId, []);
    groups.get(semantic.organId).push({ node, ...semantic });
  });
  return groups;
}

export const REQUIRED_ORGAN_GROUPS = Object.freeze({stomach:1,liver:1,kidneys:2,lungs:2,heart:1,intestines:1,brain:1});
export function validateStagedOrganGroups(groups, requirements = REQUIRED_ORGAN_GROUPS) {
  const missing=Object.entries(requirements).filter(([id,n])=>(groups.get(id)?.length||0)<n).map(([id,n])=>`${id} (need ${n})`);
  if(missing.length)throw new Error(`Missing semantic organ groups: ${missing.join(', ')}`);
  return new Map(Object.keys(requirements).map(id=>[id,[...groups.get(id)]]));
}
