import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Eye, Waves, Star, Sparkles, Sun } from 'lucide-react';

const getRarityInfo = (rarity) => {
    const baseInfo = {
        Ephemeral: {
            color: 'border-gray-500/50 bg-gray-500/10 text-gray-300',
            icon: Eye,
            label: 'Ephemeral',
            multiplier: '1.00x',
        },
        Uncanny: {
            color: 'border-green-500/50 bg-green-500/10 text-green-300',
            icon: Waves,
            label: 'Uncanny',
            multiplier: '1.05x',
        },
        Abyssal: {
            color: 'border-blue-500/50 bg-blue-500/10 text-blue-300',
            icon: Star,
            label: 'Abyssal',
            multiplier: '1.12x',
        },
        Cosmic: {
            color: 'border-purple-500/50 bg-purple-500/10 text-purple-300',
            icon: Sparkles,
            label: 'Cosmic',
            multiplier: '1.20x',
        },
        Outer: {
            color: 'border-orange-500/50 bg-orange-500/10 text-orange-300',
            icon: Sun,
            label: 'Outer',
            multiplier: '1.30x',
        }
    };

    return baseInfo[rarity] || baseInfo.Ephemeral;
};

export default function RarityBadge({ rarity, size = 'default', showMultiplier = false }) {
    const info = getRarityInfo(rarity);
    const IconComponent = info.icon;
    
    const sizeClasses = {
        small: "text-xs px-2 py-1 gap-1",
        default: "text-sm px-3 py-2 gap-1.5",
        large: "text-base px-4 py-3 gap-2",
    };
    
    const iconSizeClasses = {
        small: "w-3 h-3",
        default: "w-4 h-4",
        large: "w-5 h-5",
    };

    return (
        <Badge 
            className={`${info.color} ${sizeClasses[size]} flex items-center font-semibold hover:bg-transparent`}
        >
            <IconComponent className={iconSizeClasses[size]} />
            <span>{info.label}</span>
            {showMultiplier && (
                <span className="ml-1 text-xs opacity-80">({info.multiplier})</span>
            )}
        </Badge>
    );
}