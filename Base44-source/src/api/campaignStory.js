const chronicles = [
  { witness: 'the harbor archivist', object: 'a ledger bound in sealskin', omen: 'the tide climbs the stairs without leaving them wet',
    secret: 'the missing were erased from the harbor records before they disappeared', choice: 'write the erased names back into the book' },
  { witness: 'a bellmaker with salt on her sleeves', object: 'a cracked silver bell', omen: 'every bell tolls one note before it is struck',
    secret: 'each bell in the district was cast around a tooth taken from something still alive', choice: 'ring the one bell the creature cannot hear' },
  { witness: 'the keeper of the northern observatory', object: 'a star chart pricked through with a needle', omen: 'the same star appears in every pane of glass',
    secret: 'the stars were drawn from memories stolen from the people who charted them', choice: 'burn the chart before it can add another name' },
  { witness: 'a ferryman who refuses to look at the water', object: 'a lantern with no wick', omen: 'your reflection arrives on the opposite bank before you',
    secret: 'the lantern guides the dead toward a shore that was never meant to exist', choice: 'raise the lantern and guide them home' },
];

export function campaignStory({ week, chapterTitle, stageNumber, name, previous, enemy, parents }) {
  const weekNumber = Math.floor(Date.parse(week) / 604_800_000);
  const { witness, object, omen, secret, choice } = chronicles[weekNumber % chronicles.length];
  const approach = [
    `I met ${witness} at the last occupied house before the ${name}. Before shutting the door, they pressed ${object} into my hands. “If you see the gate open,” they said, “ask yourself which side you are standing on.” I took that for superstition until I crossed the threshold and found my own footprints walking toward me.`,
    `I carried ${object} out of the ${previous} and into the ${name}. Here, ${omen}. I stopped at a row of shuttered rooms and heard the same voice in each one, asking the same question. In the last room, it waited for me to answer.`,
    `In the ${name}, I found a letter addressed to ${witness}. The handwriting was mine, though the date was from before I was born. It explained what the locals had spent generations refusing to say aloud: ${secret}. I folded the letter twice before noticing that the ink had stained my hands from the inside.`,
    `The passage from the ${previous} ended at the ${name}. Above the door someone had carved “${chapterTitle}” and then gouged away their own signature. I put my hand against the wall and felt a heartbeat on the other side. It quickened when I took my hand away.`,
    `By the time I reached the ${name}, I understood why ${witness} had stayed behind. Someone had to remember where the path began. I set ${object} on the bare stone. On the far side of the chamber, someone set it down again a moment later.`,
  ];
  const reply = [
    'The door closed behind me, gently, like a parent who thinks a child has fallen asleep.',
    'Something beyond the next arch began to count, and missed a number I knew it had heard.',
    'Beyond the chamber, the road curved toward a place the letter had asked me never to visit.',
    'I left a mark on the doorframe so I could find my way back. The mark was already there.',
    `There was only one thing left to do: ${choice}. When the chamber fell quiet, I could still hear the hinges turning.`,
  ];
  const traces = [
    'A scrap of its voice followed me down the stairs, practicing the way I had said my name.',
    'Its shadow moved across the south wall a full breath before it stepped into the light.',
    'The letters on the page began to change as it drew near. I tucked the paper away before I could read what they spelled.',
    'It watched me from the threshold with the uneasy patience of someone expecting a guest.',
    'I had seen pieces of it along the entire road. Only here did I understand what they had belonged to.',
  ];
  const index = Math.min(stageNumber - 1, approach.length - 1);
  return [
    approach[index],
    `That was when ${enemy} came into view. I recognized the shape of ${parents[0]} and something of ${parents[1]}, though neither had ever moved like this. ${traces[index]}`,
    reply[index],
  ].join('\n\n');
}
