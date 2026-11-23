import { campaignStory } from './campaignStory.js';
import { chooseFusionArtwork, conjureName } from './fusionIdentity.js';

const day = 86_400_000;
const eastern = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric',
  timeZoneName: 'longOffset',
});

export function campaignWeek(now = Date.now()) {
  const parts = Object.fromEntries(eastern.formatToParts(now).map(({ type, value }) => [type, value]));
  const date = Date.UTC(+parts.year, +parts.month - 1, +parts.day);
  const monday = date - ((new Date(date).getUTCDay() + 6) % 7) * day;
  const nextMonday = monday + 7 * day;
  // Noon UTC on Monday is always on the same Eastern date as the reset.
  const offset = eastern.formatToParts(nextMonday + 12 * 3_600_000)
    .find(part => part.type === 'timeZoneName').value;
  return {
    key: new Date(monday).toISOString().slice(0, 10),
    resetAt: Date.parse(new Date(nextMonday).toISOString().slice(0, 10) + 'T00:00:00' + offset.slice(3)),
  };
}

export function createWeeklyCampaign(catalog, horrors, week) {
  let seed = Number(week.replaceAll('-', ''));
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pick = options => options[Math.floor(random() * options.length)];
  const places = ['Citadel', 'Labyrinth', 'Catacombs', 'Shrine', 'Spire', 'Halls', 'Vault'];
  const omens = ['the Drowned Stars', 'the Devouring Moon', 'the Hollow Choir', 'the Shattered Veil', 'the Silent Tide', 'the Nameless Flame', 'the Last Eclipse'];
  const headings = ['Descent beneath', 'Whispers from', 'The Curse of', 'Pilgrimage to'];
  const weekNumber = Math.floor(Date.parse(week) / (7 * day));
  const chapterTitle = headings[Math.floor(weekNumber / omens.length) % headings.length] +
    ' ' + omens[weekNumber % omens.length];
  const stageTemplates = [...catalog.Campaign].sort((a, b) => a.stageNumber - b.stageNumber);
  const stages = [];
  const enemies = [];
  for (const template of stageTemplates) {
    const basis = catalog.Fusion.find(enemy => enemy.id === template.enemyFusionId);
    const first = pick(horrors);
    const second = pick(horrors.filter(horror => horror !== first));
    const fusedName = conjureName(first.name, second.name, random);
    const [place] = places.splice(Math.floor(random() * places.length), 1);
    const name = place + ' of ' + pick(omens);
    const id = 'weekly-' + week + '-' + template.stageNumber;
    enemies.push({
      ...basis,
      id: id + '-enemy',
      parents: [first.id, second.id],
      fusedName,
      generatedImage: chooseFusionArtwork(first.name, second.name, random),
      stats: Object.fromEntries(Object.entries(basis.stats).map(([stat, value]) =>
        [stat, Math.max(1, Math.round(value * (0.95 + random() * 0.1)))])),
    });
    stages.push({
      ...template, id, campaignWeek: week, chapterTitle, name, enemyFusionId: id + '-enemy',
      description: 'A trial in the ' + name + '.',
      story: campaignStory({ week, chapterTitle, stageNumber: template.stageNumber, name,
        previous: stages.at(-1)?.name, enemy: fusedName, parents: [first.name, second.name] }),
    });
  }
  return { stages, enemies };
}
