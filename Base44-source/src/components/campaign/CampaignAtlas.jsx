import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Crown, Lock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WalletBadge from '@/components/user/WalletBadge';
import { getCampaignReplayFragments } from '@/components/loot/LootService';
import { createPageUrl } from '@/utils';

const trail = [64, 38, 58, 30, 46];

export default function CampaignAtlas({ stages, enemies, progress, onReadStory }) {
  const [selectedId, select] = useState(null);
  const scroller = useRef(null);
  const currentMarker = useRef(null);
  const active = stages.find(stage => stage.id === selectedId)
    ?? stages.find(stage => stage.stageNumber === progress + 1)
    ?? stages.at(-1);
  const enemy = enemies[active.id];
  const completed = active.stageNumber <= progress;
  const unlocked = active.stageNumber <= progress + 1;

  useEffect(() => {
    const map = scroller.current;
    const marker = currentMarker.current;
    if (map && marker && map.scrollWidth > map.clientWidth) {
      const left = marker.offsetLeft - map.clientWidth / 2;
      map.scrollLeft = Math.max(0, left);
    }
  }, [active.id]);

  const nodes = stages.map((stage, index) => ({
    stage,
    x: (index + .5) * 100 / stages.length,
    y: trail[index % trail.length],
  }));

  return <section className="campaign-atlas" aria-label="Chapter map">
    <p className="campaign-atlas__hint">Swipe to follow the trail</p>
    <div className="campaign-atlas__scroll" ref={scroller} tabIndex={0} aria-label="Scrollable trial map">
      <div className="campaign-atlas__chart">
        {nodes.slice(1).map(({ stage, x, y }, index) => {
          const previous = nodes[index];
          return <span key={stage.id} aria-hidden="true" className="campaign-atlas__route"
            style={{ clipPath: `polygon(${previous.x}% ${previous.y - .5}%, ${x}% ${y - .5}%, ${x}% ${y + .5}%, ${previous.x}% ${previous.y + .5}%)` }} />;
        })}
        {nodes.map(({ stage, x, y }) => {
          const portrait = enemies[stage.id];
          const done = stage.stageNumber <= progress;
          const locked = stage.stageNumber > progress + 1;
          const Status = locked ? Lock : done ? CheckCircle2 : stage.isBoss ? Crown : Play;
          return <button type="button" key={stage.id} ref={active.id === stage.id ? currentMarker : null}
            className="campaign-marker" style={{ left: x + '%', top: y + '%' }}
            data-status={locked ? 'locked' : done ? 'complete' : 'ready'}
            aria-pressed={active.id === stage.id}
            aria-label={`Stage ${stage.stageNumber}, ${stage.name}, ${locked ? 'locked' : done ? 'completed' : 'available'}`}
            onClick={() => select(stage.id)}>
            <span className="campaign-marker__portrait">
              {portrait?.generatedImage && <img src={portrait.generatedImage} alt="" />}
              <Status aria-hidden="true" size={17} />
            </span>
            <span className="campaign-marker__label">{stage.stageNumber}. {stage.name}</span>
          </button>;
        })}
      </div>
    </div>
    <div className="campaign-atlas__details" aria-live="polite">
      {enemy?.generatedImage && <img src={enemy.generatedImage} alt="" className="campaign-atlas__preview" />}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary">Stage {active.stageNumber}{active.isFinalBoss ? ' · Final boss' : active.isBoss ? ' · Boss' : ''}</p>
        <h3 className="text-2xl font-bold">{active.name}</h3>
        {enemy && <p className="text-sm text-muted-foreground">{enemy.fusedName} · Level {enemy.level} · {enemy.originType}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <WalletBadge amount={active.rewardShards} />
          <WalletBadge fragments amount={completed ? getCampaignReplayFragments(active) : active.rewardFragments} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {unlocked && active.story && <Button type="button" variant="outline" onClick={() => onReadStory(active)}>
          <BookOpen aria-hidden="true" /> Read story
        </Button>}
        {unlocked && enemy ? <Button asChild>
          <Link to={createPageUrl(`Battle?campaignId=${active.id}`)}><Play aria-hidden="true" /> {completed ? 'Replay trial' : 'Begin trial'}</Link>
        </Button> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock size={16} /> Complete the previous trial to unlock.</p>}
      </div>
    </div>
  </section>;
}
