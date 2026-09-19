export const SYSTEMS = {
  skin: { name: 'Body silhouette', short: 'Skin', color: '#d89b8f', defaultVisible: true },
  skeleton: { name: 'Skeletal system', short: 'Skeleton', color: '#e6dfc7', defaultVisible: true },
  organs: { name: 'Major organs', short: 'Organs', color: '#e85d75', defaultVisible: true },
  circulatory: { name: 'Circulatory system', short: 'Vessels', color: '#df4d64', defaultVisible: true },
};

export const ORGAN_INFO = {
  brain: { name: 'Brain', system: 'Nervous system', color: '#ef9aaa', summary: 'The body’s command center, coordinating sensation, movement, memory, emotion, and vital automatic functions.', fact: 'It contains roughly 86 billion neurons and uses about 20% of the body’s resting energy.' },
  heart: { name: 'Heart', system: 'Circulatory system', color: '#d93652', summary: 'A muscular four-chambered pump that circulates blood through the lungs and the rest of the body.', fact: 'At rest, an adult heart commonly beats 60–100 times per minute.' },
  lungs: { name: 'Lungs', system: 'Respiratory system', color: '#e9939e', summary: 'Paired organs that exchange oxygen and carbon dioxide between inhaled air and the bloodstream.', fact: 'The right lung has three lobes; the smaller left lung has two to make room for the heart.' },
  liver: { name: 'Liver', system: 'Digestive system', color: '#8c3541', summary: 'A large metabolic organ that processes nutrients, produces bile, stores energy, and detoxifies the blood.', fact: 'The liver can regenerate significant lost tissue, although repeated injury can overwhelm this ability.' },
  stomach: { name: 'Stomach', system: 'Digestive system', color: '#d87971', summary: 'A muscular sac that mechanically mixes food and begins chemical digestion using acid and enzymes.', fact: 'Its protective mucus layer helps keep gastric acid from damaging the stomach wall.' },
  kidneys: { name: 'Kidneys', system: 'Urinary system', color: '#99505d', summary: 'Paired organs that filter blood, balance fluids and electrolytes, and help regulate blood pressure.', fact: 'Each kidney contains around a million microscopic filtering units called nephrons.' },
  intestines: { name: 'Intestines', system: 'Digestive system', color: '#d99070', summary: 'The small intestine absorbs most nutrients; the large intestine absorbs water and forms stool.', fact: 'The adult small intestine is several metres long, folded compactly within the abdomen.' },
};

export const DEFAULT_VISIBILITY = Object.fromEntries(
  Object.entries(SYSTEMS).map(([key, value]) => [key, value.defaultVisible]),
);

export const DEFAULT_SKIN_OPACITY = .3;
export const defaultLayerOpacity = system => system === 'skin' ? DEFAULT_SKIN_OPACITY : 1;

export const DISCLAIMER = 'This simplified visualization is for education only. It is not a diagnostic tool and does not replace professional medical advice.';
