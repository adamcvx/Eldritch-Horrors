import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Shield, Heart, Wind, Plus, Minus, Loader2 } from 'lucide-react';

const getAbilityTypeIcon = (type) => {
  const icons = {
    attack: <Zap className="w-4 h-4" />,
    defense: <Shield className="w-4 h-4" />,
    buff: <Heart className="w-4 h-4" />,
    debuff: <Wind className="w-4 h-4" />,
  };
  return icons[type] || <Zap className="w-4 h-4" />;
};

const getAbilityTypeColor = (type) => {
  const colors = {
    attack: 'border-yellow-500/50 text-yellow-300 bg-yellow-500/10',
    defense: 'border-blue-500/50 text-blue-300 bg-blue-500/10',
    buff: 'border-green-500/50 text-green-300 bg-green-500/10',
    debuff: 'border-purple-500/50 text-purple-300 bg-purple-500/10',
  };
  return colors[type] || 'border-gray-500/50 text-gray-300 bg-gray-500/10';
};

export default function AbilityCard({
  ability,
  fusion,
  onAction,
  isEquipped = false,
  disabled = false,
  mode = 'equip',
  activeCooldown = 0,
}) {
  if (!ability) return null;

  const isBattleMode = mode === 'battle';
  const isDisabledInBattle = isBattleMode && activeCooldown > 0;
  const isActionable = !isDisabledInBattle && (!disabled || isEquipped);

  let description = ability.effect || '';

  // Replace ability values
  description = description.replace(/\{power\}/g, `${ability.power}`);

  // Replace fusion values
  if (fusion) {
    if (fusion.attack) {
      description = description.replace(/\{attack\}/g, `${fusion.attack}`);
    }
    if (fusion.hp) {
      description = description.replace(/\{health\}/g, `${fusion.hp}`);
    }
    if (fusion.defense) {
      description = description.replace(/\{defense\}/g, `${fusion.defense}`);
    }
    if (fusion.speed) {
      description = description.replace(/\{speed\}/g, `${fusion.speed}`);
    }
  }

  const cardClasses = [
    'bg-gray-900/50 border-2 border-gray-700 transition-all h-full flex flex-col',
    isBattleMode && isActionable && 'cursor-pointer hover:border-purple-400',
    isBattleMode && !isActionable && 'cursor-not-allowed opacity-60',
    !isBattleMode && disabled && !isEquipped && 'opacity-50'
  ].filter(Boolean).join(' ');

  return (
    <div
      className="relative h-full"
      onClick={() => isBattleMode && isActionable && onAction(ability)}
    >
      <Card className={cardClasses}>
        <CardContent className="p-3 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-white flex-1 text-sm">{ability.name}</h3>
            <Badge className={`ml-2 text-xs ${getAbilityTypeColor(ability.type)}`}>
              {getAbilityTypeIcon(ability.type)}
              <span className="ml-1">{ability.type}</span>
            </Badge>
          </div>
          <p className="text-xs text-gray-400 flex-grow mb-3">{description}</p>
          <div className="flex justify-between text-xs text-gray-300">
            <span>Power: <span className="font-bold text-yellow-300">{ability.power}</span></span>
            <span>Cooldown: <span className="font-bold text-blue-300">{ability.cooldown} turns</span></span>
          </div>
          
          {mode === 'equip' && (
            <Button
              onClick={() => onAction(ability)}
              disabled={disabled}
              variant={isEquipped ? 'destructive' : 'default'}
              size="sm"
              className={`w-full mt-4 ${isEquipped ? 'bg-red-600/80 hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {disabled && !isEquipped && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEquipped ? <Minus className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {isEquipped ? 'Unequip' : 'Equip'}
            </Button>
          )}
        </CardContent>
      </Card>
      
      {isDisabledInBattle && (
        <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center pointer-events-none">
          <span className="font-bold text-2xl text-white drop-shadow-md">
            {activeCooldown}
          </span>
        </div>
      )}
    </div>
  );
}