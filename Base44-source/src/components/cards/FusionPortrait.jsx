import { isLocalPreview } from '@/api/base44Client';
import { fusionParents } from '@/api/fusionIdentity';

export default function FusionPortrait({ fusion, className, decorative = false, fill = false }) {
  const parents = isLocalPreview && fusionParents(fusion);
  if (!parents) {
    return <img src={fusion.generatedImage} alt={decorative ? '' : fusion.fusedName} className={className} />;
  }

  return <div className={`flex items-center justify-center overflow-hidden ${className}`}
    role={decorative ? undefined : 'img'}
    aria-hidden={decorative || undefined}
    aria-label={decorative ? undefined : parents.map(parent => parent.name).join(' and ')}>
    <div className={`flex overflow-hidden ${fill ? 'h-full w-full' : 'h-full max-w-full aspect-square'}`}>
      {parents.map((parent, index) => <img key={parent.id} src={parent.image} alt=""
        className={`h-full w-1/2 object-cover ${index === 0 ? 'border-r border-purple-300/50' : ''}`} />)}
    </div>
  </div>;
}
