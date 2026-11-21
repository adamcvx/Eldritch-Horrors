
const originTypeMap = {
    "The Void": "Void",
    "Sunken City": "Sunken",
    "Dreamlands": "Dream",
    "Flesh Pits": "Flesh",
    "Fomalhaut": "Dimension"
};

const synergyMatrix = {
    Void: {
        strong: "Dream",
        weak: "Dimension",
        resist: "Sunken",
        vulnerable: "Flesh"
    },
    Dream: {
        strong: "Flesh",
        weak: "Void",
        resist: "Dimension",
        vulnerable: "Sunken"
    },
    Flesh: {
        strong: "Sunken",
        weak: "Dream",
        resist: "Void",
        vulnerable: "Dimension"
    },
    Sunken: {
        strong: "Dimension",
        weak: "Flesh",
        resist: "Dream",
        vulnerable: "Void"
    },
    Dimension: {
        strong: "Void",
        weak: "Sunken",
        resist: "Flesh",
        vulnerable: "Dream"
    }
};

const multipliers = {
    strong: 1.25,      // Primary advantage
    weak: 1.25,        // Primary disadvantage (from opponent's perspective)
    resist: 0.75,      // Secondary resistance
    vulnerable: 1.5,   // Secondary vulnerability
    neutral: 1.0
};

export const getOriginType = (origin) => {
    return originTypeMap[origin] || null;
};

export const calculateDamageMultiplier = (attackerType, defenderType) => {
    if (!attackerType || !defenderType) return multipliers.neutral;

    const attackerSynergy = synergyMatrix[attackerType];

    // Primary Advantage
    if (attackerSynergy.strong === defenderType) {
        return multipliers.strong;
    }

    // Secondary Vulnerability (Defender is extra vulnerable to Attacker)
    const defenderSynergy = synergyMatrix[defenderType];
    if (defenderSynergy.vulnerable === attackerType) {
        return multipliers.vulnerable;
    }
    
    // Secondary Resistance (Defender is resistant to Attacker)
    if (defenderSynergy.resist === attackerType) {
        return multipliers.resist;
    }

    return multipliers.neutral;
};

export const getSynergyDetails = (originOrType) => {
    // If it's a full origin name (e.g., "The Void"), convert it to a type (e.g., "Void").
    // Otherwise, assume it's already a type.
    const type = originTypeMap[originOrType] || originOrType;
    
    if (!type || !synergyMatrix[type]) return {};
    
    return synergyMatrix[type];
};
