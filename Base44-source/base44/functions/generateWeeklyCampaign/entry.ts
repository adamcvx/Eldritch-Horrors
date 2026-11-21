import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

// --- Constants and Helpers moved from frontend services ---

const BOSS_NAMES = [
    'Vorthak the Devourer', 'Nyth\'gotha the Writhing', 'Zephyros the Mad', 'Kythara the Whispered',
    'Mor\'dun the Flesh-Render', 'Yig\'thyss the Ancient', 'Vel\'koth the Screaming', 'Azathul the Hungering',
    'Nyar\'golem the Twisted', 'Thul\'gorath the Endless', 'Xal\'neth the Burning', 'Gorvak the Eyeless'
];
const MINION_NAMES = [
    'Nyxoth', 'Thyrrul', 'Gorvash', 'Xalthor', 'Druvnek', 'Ozyrak',
    'Klythos', 'Vorgath', 'Zyrrak', 'Choveth', 'Ixmor', 'Phornek'
];
const STAGE_NAME_PARTS = {
    prefix: ['Whispering', 'Sunken', 'Screaming', 'Eclipsed', 'Nameless', 'Blighted', 'Forsaken', 'Twisted'],
    location: ['Grove', 'Cathedral', 'Caverns', 'Citadel', 'Spire', 'Chasm', 'Labyrinth', 'Halls'],
    suffix: ['of the Damned', 'of a Thousand Eyes', 'of Forgotten Gods', 'of Eternal Night', 'of Shattered Dreams']
};
const CHAPTER_NAME_PARTS = {
    prefix: ['Chronicles of', 'Tome of', 'Legacy of', 'Rise of', 'Fall of', 'Echoes of'],
    theme: ['the Forgotten', 'the Abyss', 'the Damned', 'the Void', 'the Nameless Ones', 'Eternal Night']
};
const RARITY_CONFIG = {
    'Ephemeral': { multiplier: 1.0 },
    'Uncanny': { multiplier: 1.05 },
    'Abyssal': { multiplier: 1.12 },
    'Cosmic': { multiplier: 1.20 },
    'Outer': { multiplier: 1.30 }
};
const originTypeMap = {
    "The Void": "Void", "Sunken City": "Sunken", "Dreamlands": "Dream",
    "Flesh Pits": "Flesh", "Fomalhaut": "Dimension"
};
const getOriginType = (origin) => originTypeMap[origin] || null;
const calculateOrbSlots = (level) => {
  if (level >= 25) return 4;
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  return 1;
};
const generateStageTemplate = (isBoss = false) => ({
    name: `${STAGE_NAME_PARTS.prefix[Math.floor(Math.random() * STAGE_NAME_PARTS.prefix.length)]} ${STAGE_NAME_PARTS.location[Math.floor(Math.random() * STAGE_NAME_PARTS.location.length)]} ${STAGE_NAME_PARTS.suffix[Math.floor(Math.random() * STAGE_NAME_PARTS.suffix.length)]}`,
    description: isBoss ? 'A domain of unspeakable power.' : 'A twisted place where reality frays.',
    isBoss
});
const generateChapterTitle = () => `${CHAPTER_NAME_PARTS.prefix[Math.floor(Math.random() * CHAPTER_NAME_PARTS.prefix.length)]} ${CHAPTER_NAME_PARTS.theme[Math.floor(Math.random() * CHAPTER_NAME_PARTS.theme.length)]}`;
const determineStageRarity = (stageNumber, isBoss) => {
    if (isBoss) return 'Outer';
    if (stageNumber > 3) return 'Cosmic';
    if (stageNumber > 1) return 'Abyssal';
    return 'Uncanny';
};
const calculateLevelBonus = (level) => ({
    hp: level * 5, attack: level * 2,
    defense: level * 1, speed: level * 1
});
const getGlobalEconomySettings = async (client) => {
    const settings = await client.entities.EconomySettings.filter({ settingName: "global" });
    if (settings.length > 0) return settings[0];
    return await client.entities.EconomySettings.create({ settingName: "global" });
};

const generateStoryFragment = async (client, { chapter, chapterTitle, stageName, isBoss, bossName }) => {
    const prompt = `You are a Lovecraftian storyteller. Write 2-3 ominous, cryptic sentences for a video game campaign stage. Context: Chapter ${chapter}: ${chapterTitle}. Stage: ${stageName}. ${isBoss ? `Boss: ${bossName}.` : ''} Tone: Cosmic dread, ancient secrets.`;
    try {
        const result = await client.integrations.Core.InvokeLLM({ prompt });
        return typeof result === "string" ? result : "The silence itself feels alive, a presence gnawing at your sanity.";
    } catch (err) {
        console.error("Error generating story fragment:", err);
        return "Shadows twist with intent, watching from the corners of perception.";
    }
};

const createEnemyFusion = async (client, stageName, stageNumber, isBoss) => {
    const [availableAbilities, availableOrbs, availableHorrors] = await Promise.all([
        client.entities.Ability.list(),
        client.entities.Orb.list(),
        client.entities.Horror.list()
    ]);
    if (availableHorrors.length < 2) throw new Error('Not enough base Horrors to generate campaign enemies.');

    const shuffledHorrors = [...availableHorrors].sort(() => 0.5 - Math.random());
    const horrorA = shuffledHorrors[0];
    const horrorB = shuffledHorrors[1];

    const namePrompt = `Generate a single, terrifying, Lovecraftian name for a new eldritch horror. It is a fusion of a ${horrorA.origin}-origin horror named "${horrorA.name}" and a ${horrorB.origin}-origin horror named "${horrorB.name}". Respond with ONLY the name.`;
    const nameResponse = await client.integrations.Core.InvokeLLM({ prompt: namePrompt, response_json_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } });
    const fusedName = nameResponse?.name || `${horrorA.name} Amalgam`;
    
    const originType = getOriginType(horrorA.origin);
    const rarity = determineStageRarity(stageNumber, isBoss);
    const multiplier = RARITY_CONFIG[rarity].multiplier;

    const baseStats = {
        hp: Math.round(((horrorA.baseStats.hp + horrorB.baseStats.hp) / 2) * multiplier),
        attack: Math.round(((horrorA.baseStats.attack + horrorB.baseStats.attack) / 2) * multiplier),
        defense: Math.round(((horrorA.baseStats.defense + horrorB.baseStats.defense) / 2) * multiplier),
        speed: Math.round(((horrorA.baseStats.speed + horrorB.baseStats.speed) / 2) * multiplier)
    };
    
    const level = Math.max(1, Math.floor(stageNumber / 2) + (isBoss ? 2 : 0));
    const levelBonus = calculateLevelBonus(level);
    
    const imagePrompt = `An eldritch abomination named "${fusedName}", cosmic horror, lovecraftian, surreal, dark fantasy, unsettling, detailed, Todd McFarlane comicbook style only, no text.`;
    const imageResult = await client.integrations.Core.GenerateImage({ prompt: imagePrompt });
    const imageUrl = imageResult?.url || "https://images.unsplash.com/photo-1505527299942-502069a2da3c?w=500&q=80";

    const numAbilities = Math.min(3, availableAbilities.length);
    const selectedAbilities = availableAbilities.sort(() => 0.5 - Math.random()).slice(0, numAbilities).map(a => a.id);
    
    const orbSlots = calculateOrbSlots(level);
    const numOrbs = Math.min(orbSlots, availableOrbs.length);
    const equippedOrbs = availableOrbs.sort(() => 0.5 - Math.random()).slice(0, numOrbs).map(o => o.id);

    return await client.entities.Fusion.create({
        parents: [horrorA.id, horrorB.id],
        fusedName, level, levelBonus, stats: baseStats, rarity, originType,
        generatedImage: imageUrl, playerOwner: null, abilities: selectedAbilities, equippedOrbs
    });
};

// Main generation logic
async function runCampaignGeneration(client) {
    console.log("Starting weekly campaign generation...");

    const existingStages = await client.entities.Campaign.list();
    for (const stage of existingStages) {
        await client.entities.Campaign.delete(stage.id);
    }
    console.log(`Deleted ${existingStages.length} old campaign stages.`);

    const allUsers = await client.entities.User.list();
    for (const user of allUsers) {
        await client.entities.User.update(user.id, { campaignProgress: 0 });
    }
    console.log(`Reset campaign progress for ${allUsers.length} users.`);

    const economySettings = await getGlobalEconomySettings(client);
    const baseFragmentReward = Math.floor(Math.random() * 20) + economySettings.campaignBossRewardFragments;

    const newStages = [];
    const totalChapters = 1;
    let globalStage = 1;

    for (let chapter = 1; chapter <= totalChapters; chapter++) {
        const chapterTitle = generateChapterTitle();
        const stagesInChapter = Math.floor(Math.random() * 3) + 4; // 4 to 6 stages

        for (let i = 1; i <= stagesInChapter; i++) {
            const isBoss = i === stagesInChapter;
            const template = generateStageTemplate(isBoss);
            const enemyFusion = await createEnemyFusion(client, template.name, globalStage, isBoss);
            
            const isFinalBoss = isBoss && chapter === totalChapters;
            const rewardShards = 50 + (globalStage * 10) + (chapter * 20) + (isBoss ? 50 : 0) * (isFinalBoss ? 2 : 1);
            
            const story = await generateStoryFragment(client, { chapter, chapterTitle, stageName: template.name, isBoss, bossName: enemyFusion.fusedName });

            const stageData = {
                chapter, chapterTitle, stageNumber: globalStage, name: template.name, description: template.description,
                story, enemyFusionId: enemyFusion.id, rewardShards, rewardFragments: isBoss ? baseFragmentReward : 0,
                isBoss, isFinalBoss
            };

            const newStage = await client.entities.Campaign.create(stageData);
            newStages.push(newStage);
            globalStage++;
        }
    }
    console.log(`Successfully generated ${newStages.length} new campaign stages.`);
    return newStages;
}

// --- Deno Serve Handler (No Authentication Required) ---

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const newStages = await runCampaignGeneration(base44.asServiceRole);
        return new Response(JSON.stringify({
            success: true,
            message: `Campaign generated successfully with ${newStages.length} stages.`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Campaign generation failed:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});