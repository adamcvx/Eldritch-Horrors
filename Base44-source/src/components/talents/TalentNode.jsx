import { Lock, Check } from 'lucide-react';
import { 
  Heart, Swords, Shield, Wind, Zap, BrainCircuit, HeartPulse, Sparkles, Star, Anchor, Atom, Feather, Scale, Sun, Moon, HelpCircle 
} from 'lucide-react';

const iconMap = {
  Heart,
  Swords,
  Shield,
  Wind,
  Zap,
  BrainCircuit,
  HeartPulse,
  Sparkles,
  Star,
  Anchor,
  Atom,
  Feather,
  Scale,
  Sun,
  Moon,
  HelpCircle, // Fallback
};

export default function TalentNode({ talent, isLearned, isLocked, onSelect, onUnlearn }) {
  const Icon = iconMap[talent.icon] || HelpCircle;
  const state = isLearned ? 'learned' : isLocked ? 'locked' : 'available';
  return <button type="button" className="talent-node" data-state={state}
    aria-label={talent.name + ', ' + state}
    onClick={() => isLearned ? onUnlearn() : onSelect(talent)}>
    <span className="talent-node__sigil">
      <Icon aria-hidden="true" size={23} />
      {isLocked && !isLearned && <Lock aria-hidden="true" size={12} className="talent-node__status" />}
      {isLearned && <Check aria-hidden="true" size={12} className="talent-node__status" />}
    </span>
    <span className="talent-node__name">{talent.name}</span>
  </button>;
}
