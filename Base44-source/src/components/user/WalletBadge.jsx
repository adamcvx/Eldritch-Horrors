import { Gem, Star } from 'lucide-react';

export default function WalletBadge({ amount, fragments = false }) {
  const Icon = fragments ? Star : Gem;
  return (
    <span className={`wallet-badge${fragments ? ' wallet-badge--fragments' : ''}`}>
      <Icon size={17} aria-hidden="true" />
      <strong>{amount ?? 0}</strong>
      <span>{fragments ? 'Fragments' : 'Echoes'}</span>
    </span>
  );
}
