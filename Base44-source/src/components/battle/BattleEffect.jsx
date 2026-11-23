import { ShieldPlus, Sparkles, Swords } from 'lucide-react';
import './BattleEffect.css';

const effects = {
  attack: { Icon: Swords, label: 'Attack' },
  buff: { Icon: ShieldPlus, label: 'Buff' },
  debuff: { Icon: Sparkles, label: 'Debuff' },
};

export function battleEffectFor(action, side) {
  if (!action || !Object.hasOwn(effects, action.type)) return null;
  const cast = action.actor === side;
  if (action.type === 'buff') return cast ? 'buff' : null;
  return cast ? 'cast' : action.type;
}

export default function BattleEffect({ effect }) {
  if (!effect) return null;
  const { Icon, label } = effects[effect] ?? { Icon: Sparkles, label: 'Cast' };
  return <div className={`battle-effect battle-effect--${effect}`} aria-hidden="true">
    <span className="battle-effect__ring" />
    {effect !== 'cast' && <span className="battle-effect__label"><Icon size={18} />{label}</span>}
  </div>;
}
