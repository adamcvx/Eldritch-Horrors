import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skull, Eye, BookOpen, Star, Crown, Gem } from 'lucide-react';

const getRankInfo = (rank, points) => {
  const ranks = {
    Initiate: {
      color: 'bg-gray-600/20 text-gray-300 border-gray-600/50',
      icon: Eye,
      pointsRange: '0-1199'
    },
    Cultist: {
      color: 'bg-amber-600/20 text-amber-300 border-amber-600/50',
      icon: BookOpen,
      pointsRange: '1200-1499'
    },
    Acolyte: {
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      icon: Star,
      pointsRange: '1500-1799'
    },
    Occultist: {
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
      icon: Gem,
      pointsRange: '1800-2099'
    },
    Herald: {
      color: 'bg-red-500/20 text-red-300 border-red-500/50',
      icon: Skull,
      pointsRange: '2100-2399'
    },
    Elder: {
      color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      icon: Crown,
      pointsRange: '2400+'
    }
  };

  return ranks[rank] || ranks.Initiate;
};

export default function RankBadge({ rank, points, showPoints = false, size = "default" }) {
  const rankInfo = getRankInfo(rank, points);
  const IconComponent = rankInfo.icon;

  const sizeClasses = {
    small: "text-xs px-2 py-1",
    default: "text-sm px-3 py-1",
    large: "text-base px-4 py-2"
  };

  return (
    <Badge className="bg-gray-600/20 text-gray-300 py-1 text-base font-semibold rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-primary/80 border-gray-600/50 flex items-center gap-1">
            <IconComponent className={`${size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-5 h-5' : 'w-4 h-4'}`} />
            {rank}
            {showPoints && <span className="ml-1">({points})</span>}
        </Badge>);

}