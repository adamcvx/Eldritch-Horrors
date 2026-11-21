/**
 * SoundService - Manages all audio playback for the application.
 * This helps centralize sound effects and control volume/playback from one place.
 */

// A collection of pre-loaded audio objects to avoid re-creating them.
const sounds = {
  // UI Sounds
  menuClick: new Audio(''),
  menuHover: new Audio(''),
  buttonClick: new Audio(''),
  
  // Game Action Sounds
  fusionSuccess: new Audio('https://base44.app/api/apps/68aa514c64fc4f9604746607/files/a32e48e53_fusion_success.mp3'),
  fusionStart: new Audio(''),
  levelUp: new Audio(''),
  orbEquip: new Audio(''),
  abilityEquip: new Audio(''),
  
  // Battle Sounds
  battleHit: new Audio(''),
  abilityUse: new Audio(''),
  battleStart: new Audio(''),
  victory: new Audio(''),
  defeat: new Audio(''),
  
  // Quest and Reward Sounds
  questComplete: new Audio(''),
  lootDrop: new Audio(''),
  currencyGain: new Audio(''),
};

// Background ambient tracks for different areas
const ambientTracks = {
  sanctum: new Audio(''),
  maw: new Audio(''),
  battle: new Audio(''),
  menu: new Audio(''),
};

// Set default volumes for sound effects
Object.keys(sounds).forEach(key => {
  sounds[key].volume = 0.4;
});

// Set specific volumes for certain sounds
sounds.menuHover.volume = 0.2;
sounds.buttonClick.volume = 0.3;
sounds.fusionSuccess.volume = 0.6;
sounds.victory.volume = 0.7;
sounds.defeat.volume = 0.5;

// Set ambient track volumes (lower for background)
Object.keys(ambientTracks).forEach(key => {
  ambientTracks[key].volume = 0.15;
  ambientTracks[key].loop = true;
});

// Current playing ambient track
let currentAmbient = null;

/**
 * A generic function to play a sound from the collection.
 * It resets the sound's current time to allow for rapid playback.
 * @param {string} soundName - The key of the sound in the `sounds` object.
 */
const playSound = (soundName) => {
  if (sounds[soundName]) {
    sounds[soundName].currentTime = 0;
    sounds[soundName].play().catch(error => {
      console.log(`Could not play sound "${soundName}":`, error.message);
    });
  } else {
    console.warn(`Sound "${soundName}" not found.`);
  }
};

/**
 * Play ambient background music for a specific area
 * @param {string} trackName - The key of the ambient track
 */
const playAmbient = (trackName) => {
  // Stop current ambient if playing
  if (currentAmbient) {
    currentAmbient.pause();
    currentAmbient.currentTime = 0;
  }

  if (ambientTracks[trackName]) {
    currentAmbient = ambientTracks[trackName];
    currentAmbient.play().catch(error => {
      console.log(`Could not play ambient "${trackName}":`, error.message);
    });
  } else {
    console.warn(`Ambient track "${trackName}" not found.`);
    currentAmbient = null;
  }
};

/**
 * Stop currently playing ambient music
 */
const stopAmbient = () => {
  if (currentAmbient) {
    currentAmbient.pause();
    currentAmbient.currentTime = 0;
    currentAmbient = null;
  }
};

/**
 * Fade out current ambient and fade in new one
 * @param {string} newTrackName - The new ambient track to play
 */
const crossfadeAmbient = (newTrackName) => {
  if (currentAmbient && ambientTracks[newTrackName]) {
    const oldTrack = currentAmbient;
    const newTrack = ambientTracks[newTrackName];
    
    // Fade out old track
    const fadeOut = setInterval(() => {
      if (oldTrack.volume > 0.01) {
        oldTrack.volume = Math.max(0, oldTrack.volume - 0.02);
      } else {
        oldTrack.pause();
        oldTrack.currentTime = 0;
        oldTrack.volume = 0.15; // Reset volume
        clearInterval(fadeOut);
      }
    }, 50);

    // Start new track at low volume and fade in
    newTrack.volume = 0;
    newTrack.play().catch(error => {
      console.log(`Could not play ambient "${newTrackName}":`, error.message);
    });
    
    const fadeIn = setInterval(() => {
      if (newTrack.volume < 0.14) {
        newTrack.volume = Math.min(0.15, newTrack.volume + 0.02);
      } else {
        clearInterval(fadeIn);
      }
    }, 50);

    currentAmbient = newTrack;
  } else {
    playAmbient(newTrackName);
  }
};

// UI Sound exports
export const playMenuClick = () => playSound('menuClick');
export const playMenuHover = () => playSound('menuHover');
export const playButtonClick = () => playSound('buttonClick');

// Game Action Sound exports
export const playFusionSuccess = () => playSound('fusionSuccess');
export const playFusionStart = () => playSound('fusionStart');
export const playLevelUp = () => playSound('levelUp');
export const playOrbEquip = () => playSound('orbEquip');
export const playAbilityEquip = () => playSound('abilityEquip');

// Battle Sound exports
export const playBattleHit = () => playSound('battleHit');
export const playAbilityUse = () => playSound('abilityUse');
export const playBattleStart = () => playSound('battleStart');
export const playVictory = () => playSound('victory');
export const playDefeat = () => playSound('defeat');

// Quest and Reward Sound exports
export const playQuestComplete = () => playSound('questComplete');
export const playLootDrop = () => playSound('lootDrop');
export const playCurrencyGain = () => playSound('currencyGain');

// Ambient Sound exports
export const playAmbientSanctum = () => crossfadeAmbient('sanctum');
export const playAmbientMaw = () => crossfadeAmbient('maw');
export const playAmbientBattle = () => crossfadeAmbient('battle');
export const playAmbientMenu = () => crossfadeAmbient('menu');
export const stopAllAmbient = stopAmbient;

// Volume control functions
export const setSoundVolume = (volume) => {
  Object.keys(sounds).forEach(key => {
    sounds[key].volume = Math.max(0, Math.min(1, volume));
  });
};

export const setAmbientVolume = (volume) => {
  const newVolume = Math.max(0, Math.min(1, volume));
  Object.keys(ambientTracks).forEach(key => {
    ambientTracks[key].volume = newVolume;
  });
};