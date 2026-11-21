
import { Quest } from '@/entities/Quest';
import { User } from '@/entities/User';

const QUEST_TEMPLATES = [
    { key: 'win_casual_1', description: 'Win 1 Casual Match', requirement: { type: 'win', matchType: 'casual', count: 1 }, reward: 10 },
    { key: 'win_ranked_1', description: 'Win 1 Ranked Match', requirement: { type: 'win', matchType: 'ranked', count: 1 }, reward: 25 },
    { key: 'play_any_3', description: 'Play 3 Matches (any type)', requirement: { type: 'play', count: 3 }, reward: 15 },
    { key: 'play_casual_2', description: 'Play 2 Casual Matches', requirement: { type: 'play', matchType: 'casual', count: 2 }, reward: 10 },
    { key: 'play_ranked_2', description: 'Play 2 Ranked Matches', requirement: { type: 'play', matchType: 'ranked', count: 2 }, reward: 20 },
    { key: 'win_any_2', description: 'Win 2 Matches (any type)', requirement: { type: 'win', count: 2 }, reward: 30 },
    { key: 'win_ranked_2', description: 'Win 2 Ranked Matches', requirement: { type: 'win', matchType: 'ranked', count: 2 }, reward: 50 },
    { key: 'play_any_5', description: 'Play 5 Matches (any type)', requirement: { type: 'play', count: 5 }, reward: 40 },
];

// Helper to shuffle an array
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// Generates 5 new daily quests for a user
export const generateDailyQuests = async (user) => {
    // 1. Delete old active/completed daily quests for the user
    const oldQuests = await Quest.filter({ user: user.id, type: 'daily' });
    for (const quest of oldQuests) {
        if (quest.status !== 'claimed') {
            await Quest.delete(quest.id);
        }
    }

    // 2. Select 5 unique random templates
    const selectedTemplates = shuffleArray([...QUEST_TEMPLATES]).slice(0, 5);

    // 3. Create new quest records with base rewards
    const newQuestsData = selectedTemplates.map(template => ({
        user: user.id,
        description: template.description,
        requirement: template.requirement,
        baseReward: template.reward, // Store the base reward
        type: 'daily',
        status: 'active',
        progress: { count: 0 }
    }));

    await Quest.bulkCreate(newQuestsData);
};

// Updates quest progress after a match
export const updateQuestProgress = async (user, { won, matchType }) => {
    const activeQuests = await Quest.filter({ user: user.id, status: 'active', type: 'daily' });

    for (const quest of activeQuests) {
        const { requirement } = quest;
        let progressMade = false;

        // Check 'play' quests
        if (requirement.type === 'play' && (!requirement.matchType || requirement.matchType === matchType)) {
            progressMade = true;
        }

        // Check 'win' quests
        if (won && requirement.type === 'win' && (!requirement.matchType || requirement.matchType === matchType)) {
            progressMade = true;
        }
        
        if (progressMade) {
            const newProgressCount = (quest.progress.count || 0) + 1;
            const isCompleted = newProgressCount >= requirement.count;
            
            await Quest.update(quest.id, {
                progress: { count: newProgressCount },
                status: isCompleted ? 'completed' : 'active'
            });
        }
    }
};
