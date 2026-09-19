const RIGHT_SUFFIX = /\.r\.?$/i;

export function isRightSideNode(name = '') {
  return RIGHT_SUFFIX.test(name.trim());
}

export function mirroredNodeName(name) {
  return isRightSideNode(name) ? name.trim().replace(RIGHT_SUFFIX, '.l') : name;
}

export function displayAnatomyName(name = '') {
  return name.replace(/\.r\.?$/i, ' — right').replace(/\.l$/i, ' — left').replaceAll('_', ' ');
}

export function searchableStructures(organs, boneNames) {
  return [
    ...Object.entries(organs).map(([id, item]) => ({ id, name: item.name, type: 'organ', system: item.system })),
    ...boneNames.map(name => ({ id: `bone:${name}`, name: displayAnatomyName(name), type: 'bone', system: 'Skeletal system' })),
  ];
}

export function filterStructures(items, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return items;
  return items.filter(item => terms.every(term => `${item.name} ${item.system} ${item.type}`.toLocaleLowerCase().includes(term)));
}
