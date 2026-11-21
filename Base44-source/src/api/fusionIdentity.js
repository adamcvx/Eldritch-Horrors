import { horrors } from '../../../game.mjs';

const names = {
  'Veil Serpent': [['Veiled', 'Coiling', 'Eclipsed', 'Sable'], ['Worldcoil', 'Veilfang', 'Riftwyrm', 'Shadowcoil']],
  'Gibbering Shambler': [['Gibbering', 'Many-Mouthed', 'Fleshwoven', 'Gnashing'], ['Fleshmass', 'Whispermaw', 'Carrion Choir', 'Shamble']],
  'Dream-Eater': [['Dreaming', 'Sleepless', 'Nightwoven', 'Phantasmal'], ['Nightfeeder', 'Dreamwraith', 'Sleepbane', 'Dreadshade']],
  'Deep Lurker': [['Drowned', 'Abyssal', 'Many-Eyed', 'Sunken'], ['Reefmaw', 'Depthcrawler', 'Tide Horror', 'Drownspawn']],
  'Faceless Watcher': [['Faceless', 'Hollow', 'Starless', 'Silent'], ['Voidseer', 'Nullgaze', 'Starwatcher', 'Hollow Eye']],
};

const primeHorrors = horrors.map((horror, index) => ({
  id: 'starter-' + index,
  name: horror.name,
  image: '/Artwork/' + encodeURIComponent(horror.origin + '.png'),
}));

export function fusionParents(fusion) {
  const parents = fusion.parents?.map(id => primeHorrors.find(horror => horror.id === id));
  return parents?.length === 2 && parents.every(Boolean) && parents[0] !== parents[1] ? parents : null;
}

export function conjureName(first, second, random = Math.random) {
  const [prefix, subject] = random() < 0.5 ? [first, second] : [second, first];
  const pick = options => options[Math.floor(random() * options.length)];
  return 'The ' + pick(names[prefix][0]) + ' ' + pick(names[subject][1]);
}

export function upgradeFusionName(fusion) {
  const parents = fusionParents(fusion);
  if (!parents) return fusion;
  const [a, b] = parents.map(parent => parent.name);
  if (fusion.fusedName !== a + ' / ' + b && fusion.fusedName !== b + ' / ' + a) return fusion;

  // Keep the name stable across devices before the next autosave.
  let seed = 0;
  for (const letter of fusion.id) seed = (Math.imul(seed, 31) + letter.charCodeAt(0)) >>> 0;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return { ...fusion, fusedName: conjureName(a, b, next) };
}
