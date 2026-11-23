import { useState } from 'react';
import { Aperture, Star, TrendingUp, X } from 'lucide-react';
import { ascendFusion } from '@/api/localBase44';
import { ascensionOffer } from '@/api/ascension';
import PopupDialog, { PopupSection, PopupCostBreakdown } from '@/components/ui/PopupDialog';

const labels = { hp: 'HP', attack: 'Attack', defense: 'Defense', speed: 'Speed' };

export default function AscendDialog({ fusion, fragments, onClose, onAscended }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const offer = ascensionOffer(fusion);
  if (!offer) return null;
  const canAfford = fragments >= offer.cost;

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      const result = await ascendFusion(fusion.id);
      onAscended(result);
    } catch (failure) {
      setError(failure.message || 'The ascension could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return <PopupDialog open onClose={onClose} title={'Ascend ' + fusion.fusedName} titleIcon={Aperture}
    loading={busy} actions={[
      { text: 'Cancel', icon: X, variant: 'outline', onClick: onClose },
      { text: 'Ascend to ' + offer.stars + (offer.stars === 1 ? ' Star' : ' Stars'), icon: Star,
        onClick: confirm, disabled: !canAfford, loading: busy, loadingText: 'Ascending…' },
    ]}>
    <PopupSection title="Stat enhancement (+10% per star)" titleIcon={TrendingUp}>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {Object.entries(offer.bonuses).map(([stat, bonus]) => <div key={stat} className="flex gap-2">
          <dt>{labels[stat]}</dt><dd className="text-emerald-300">+{bonus}</dd>
        </div>)}
      </dl>
    </PopupSection>
    <PopupSection title="Ritual cost" titleIcon={Star}>
      <PopupCostBreakdown items={[
        { label: 'Required Void Fragments', value: offer.cost },
        { label: 'Your Void Fragments', value: fragments },
      ]} totalLabel="After ascension" totalValue={fragments - offer.cost}
        totalColor={canAfford ? 'text-emerald-300' : 'text-red-300'} />
    </PopupSection>
    {!canAfford && <p className="text-sm text-muted-foreground">Defeat Forbidden Path bosses to earn more Void Fragments.</p>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </PopupDialog>;
}
