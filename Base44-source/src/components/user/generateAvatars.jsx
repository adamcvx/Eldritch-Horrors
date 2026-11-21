import { GenerateImage } from '@/integrations/Core';

// 50 unique cultist avatar prompts in the same style as fusion generation
const CULTIST_AVATAR_PROMPTS = [
  "Hooded cultist portrait, shadowed face partially visible, dark robes with eldritch symbols, mysterious aura, H.P. Lovecraft inspired, gothic horror portrait, Todd McFarlane comic book style only",
  "Masked cultist with ornate ceremonial mask, glowing eyes visible through mask, dark ritual attire, cosmic horror atmosphere, Lovecraftian cult member, Todd McFarlane comic book style only",
  "Ancient cultist elder with weathered face, piercing eyes, flowing dark beard, ritualistic scarification, otherworldly wisdom, H.P. Lovecraft inspired portrait, Todd McFarlane comic book style only",
  "Female cultist with pale skin, dark circled eyes, flowing black hair, ceremonial headdress, eldritch tattoos on forehead, gothic horror, Todd McFarlane comic book style only",
  "Cultist with tentacle-like appendages for hair, partially human face, cosmic horror mutation, dark ritual clothing, H.P. Lovecraft Dagon inspired, Todd McFarlane comic book style only",
  "Blind cultist prophet with white eyes, ritual scars across face, ornate dark robes, holding eldritch tome, mystical aura, Lovecraftian seer, Todd McFarlane comic book style only",
  "Young cultist initiate with innocent face but dark eyes, simple dark robes, pendant with strange symbol, beginning corruption, cosmic horror, Todd McFarlane comic book style only",
  "Cultist with multiple eyes covering face, cosmic horror mutation, dark hood, otherworldly appearance, H.P. Lovecraft inspired abomination, Todd McFarlane comic book style only",
  "Skeletal cultist with exposed skull portions, dark robes, glowing purple eyes in sockets, undead servant, eldritch necromancy, Todd McFarlane comic book style only",
  "Cultist high priest with elaborate headdress, golden eldritch symbols, commanding presence, dark ceremonial armor, cosmic horror leadership, Todd McFarlane comic book style only",
  "Shadow-wreathed cultist, face partially dissolved into darkness, ethereal appearance, void touched follower, H.P. Lovecraft shadow realm, Todd McFarlane comic book style only",
  "Cultist with crystalline growths on face, cosmic horror infection, dark robes with gem inserts, otherworldly transformation, eldritch mineral corruption, Todd McFarlane comic book style only",
  "Ancient cultist mummy with bandaged face, glowing runes on wrappings, preserved by eldritch rituals, undead devotee, Lovecraftian preservation, Todd McFarlane comic book style only",
  "Cultist with fish-like features, scaled skin, gills on neck, Deep One hybrid, dark aquatic robes, H.P. Lovecraft Dagon cult, Todd McFarlane comic book style only",
  "Insectoid cultist with compound eyes, chitinous face plates, dark ritual garb, cosmic horror mutation, eldritch insect transformation, Todd McFarlane comic book style only",
  "Cultist oracle with third eye on forehead, all-seeing gaze, flowing mystical robes, cosmic wisdom corruption, H.P. Lovecraft prescient horror, Todd McFarlane comic book style only",
  "Plague cultist with diseased skin, ritual pustules, dark medical robes, cosmic horror contagion, eldritch disease bearer, Todd McFarlane comic book style only",
  "Cultist with molten lava veins visible under skin, fire-touched devotee, heat-resistant robes, volcanic cult member, eldritch flame corruption, Todd McFarlane comic book style only",
  "Ice-touched cultist with frost covering face, blue-tinted skin, frozen breath, arctic cult robes, cosmic winter horror, Todd McFarlane comic book style only",
  "Cultist with plant growths emerging from skin, nature horror corruption, bark-like patches, eldritch botanical mutation, dark druid robes, Todd McFarlane comic book style only",
  "Mechanical cultist with clockwork face parts, steampunk eldritch fusion, brass gears visible, cosmic horror technology, dark inventor robes, Todd McFarlane comic book style only",
  "Cultist with void-black skin, star-like points of light across face, cosmic horror touched by space, nebula robes, H.P. Lovecraft cosmic void, Todd McFarlane comic book style only",
  "Mirror-faced cultist with reflective surface for face, reality distortion effect, dark robes, eldritch mirror magic, dimensional horror servant, Todd McFarlane comic book style only",
  "Cultist with smoke constantly emanating from eyes and mouth, ethereal presence, dark ritual attire, spirit-touched devotee, ghostly corruption, Todd McFarlane comic book style only",
  "Blood cultist with ritual scarification, crimson stained robes, sacrificial implements, dark devotion, H.P. Lovecraft blood magic practitioner, Todd McFarlane comic book style only",
  "Bone cultist with skull accessories, ivory ritual armor, death magic practitioner, necromantic devotee, eldritch bone crafting, Todd McFarlane comic book style only",
  "Storm cultist with lightning scars, electrically charged hair, tempest robes, weather magic corruption, cosmic storm devotee, Todd McFarlane comic book style only",
  "Dream cultist with constantly shifting facial features, ethereal appearance, sleep realm touched, nightmare robes, H.P. Lovecraft dreamlands horror, Todd McFarlane comic book style only",
  "Serpentine cultist with snake-like eyes, scaled patches on skin, ophidian cult member, dark scaled robes, reptilian eldritch corruption, Todd McFarlane comic book style only",
  "Avian cultist with feathered hair, bird-like features, dark wing-like robes, sky cult devotee, eldritch aerial transformation, Todd McFarlane comic book style only",
  "Stone cultist with rocky skin texture, earth-touched devotee, mineral robes, geological horror corruption, eldritch stone transformation, Todd McFarlane comic book style only",
  "Liquid cultist with partially fluid face, shape-shifting abilities, dark flowing robes, aqueous eldritch corruption, H.P. Lovecraft liquid horror, Todd McFarlane comic book style only",
  "Time-touched cultist with aging and youth flickering across face, temporal distortion, chronos robes, eldritch time magic corruption, Todd McFarlane comic book style only",
  "Gravity cultist with hair and robes defying physics, reality bending around them, cosmic force manipulation, dimensional horror devotee, Todd McFarlane comic book style only",
  "Sound cultist with visible sonic waves around head, hearing enhanced beyond human, acoustic robes, vibration magic practitioner, Todd McFarlane comic book style only",
  "Light cultist with radiant aura, too-bright eyes, solar robes, cosmic illumination corruption, eldritch light bearer, Todd McFarlane comic book style only",
  "Dark matter cultist with reality bending around them, invisible force manipulation, void-touched appearance, cosmic dark energy devotee, Todd McFarlane comic book style only",
  "Probability cultist with multiple potential faces overlapping, quantum horror corruption, reality uncertainty robes, eldritch chance manipulation, Todd McFarlane comic book style only",
  "Memory cultist with ghostly faces of others flickering behind them, psychic horror corruption, mind theft robes, eldritch memory absorption, Todd McFarlane comic book style only",
  "Emotion cultist with face showing multiple feelings simultaneously, empathic horror corruption, mood-shifting robes, psychological eldritch manipulation, Todd McFarlane comic book style only",
  "Dimension cultist with portal-like wounds on face showing other realities, planar horror corruption, multidimensional robes, cosmic travel devotee, Todd McFarlane comic book style only",
  "Energy cultist with pure power crackling across skin, elemental horror corruption, force-channeling robes, cosmic energy manipulation, Todd McFarlane comic book style only",
  "Void priest with complete darkness where face should be, cosmic horror leadership, reality negation robes, H.P. Lovecraft void worship, Todd McFarlane comic book style only",
  "Chaos cultist with constantly changing features, disorder magic corruption, ever-shifting robes, eldritch randomness devotee, Todd McFarlane comic book style only",
  "Order cultist with perfectly geometric face, mathematical horror corruption, precise pattern robes, cosmic structure worship, Todd McFarlane comic book style only",
  "Flesh cultist with exposed muscle and sinew, body horror corruption, anatomical robes, H.P. Lovecraft flesh magic practitioner, Todd McFarlane comic book style only",
  "Mind cultist with brain tissue visible through translucent skull, psychic horror corruption, telepathic robes, eldritch mental enhancement, Todd McFarlane comic book style only",
  "Soul cultist with spiritual energy visibly leaking from body, essence magic corruption, ethereal robes, cosmic soul manipulation, Todd McFarlane comic book style only",
  "Reality cultist with existence itself warping around them, fundamental horror corruption, truth-bending robes, eldritch reality manipulation, Todd McFarlane comic book style only",
  "Nightmare cultist with fear made manifest around them, terror magic corruption, horror-inducing robes, H.P. Lovecraft fear incarnate, Todd McFarlane comic book style only"
];

export const generateCultistAvatars = async () => {
  console.log('Starting generation of 50 cultist avatars...');
  const generatedUrls = [];
  
  for (let i = 0; i < CULTIST_AVATAR_PROMPTS.length; i++) {
    try {
      console.log(`Generating avatar ${i + 1}/50...`);
      const result = await GenerateImage({ prompt: CULTIST_AVATAR_PROMPTS[i] });
      
      if (result && result.url) {
        generatedUrls.push(result.url);
        console.log(`✓ Avatar ${i + 1} generated successfully`);
      } else {
        console.error(`✗ Avatar ${i + 1} failed - no URL returned`);
        // Add a fallback/placeholder
        generatedUrls.push("https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80");
      }
      
      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`✗ Avatar ${i + 1} failed:`, error);
      // Add a fallback/placeholder for failed generations
      generatedUrls.push("https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80");
    }
  }
  
  console.log('Avatar generation complete!');
  console.log('Generated URLs:', generatedUrls);
  return generatedUrls;
};