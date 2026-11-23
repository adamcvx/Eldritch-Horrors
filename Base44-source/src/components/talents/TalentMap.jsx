import TalentNode from './TalentNode';

const tierSpacing = 103;
const stagger = [50, 36, 64, 40, 60];

export default function TalentMap({ talents, learned, onSelect, onUnlearn }) {
  const tierOf = talent => Math.max(1, Number(talent.tier) || 1);
  const schools = [...new Set(talents.map(talent => talent.tree || 'General'))].sort();
  const maxTier = Math.max(1, ...talents.map(tierOf));

  return <div className="talent-atlas">
    {schools.map(school => {
      const branch = talents.filter(talent => (talent.tree || 'General') === school);
      const nodes = [];
      for (let tier = 1; tier <= maxTier; tier++) {
        const group = branch.filter(talent => tierOf(talent) === tier);
        group.forEach((talent, index) => nodes.push({
          talent,
          x: group.length === 1 ? stagger[(tier - 1) % stagger.length] : (index + 1) * 100 / (group.length + 1),
          y: (tier - 1) * tierSpacing + 32,
        }));
      }
      const byName = new Map(nodes.map(node => [node.talent.name, node]));
      return <section key={school} className="talent-branch" aria-label={school + ' talents'}>
        <h2>{school}</h2>
        <div className="talent-branch__map" style={{ minHeight: maxTier * tierSpacing }}>
          {nodes.flatMap(node => (node.talent.dependencies ?? []).map(dependency => {
            const parent = byName.get(dependency);
            if (!parent) return null;
            const points = [`calc(${parent.x}% - 1px) ${parent.y}px`, `calc(${parent.x}% + 1px) ${parent.y}px`,
              `calc(${node.x}% + 1px) ${node.y}px`, `calc(${node.x}% - 1px) ${node.y}px`];
            return <span key={node.talent.id + ':' + dependency} aria-hidden="true"
              className={learned.has(dependency) ? 'talent-path talent-path--lit' : 'talent-path'}
              style={{ clipPath: `polygon(${points.join(',')})` }} />;
          }))}
          {nodes.map(({ talent, x, y }) => <div key={talent.id} className="talent-placement" style={{ left: x + '%', top: y }}>
            <TalentNode talent={talent} isLearned={learned.has(talent.name)}
              isLocked={!(talent.dependencies ?? []).every(dependency => learned.has(dependency))}
              onSelect={onSelect} onUnlearn={() => onUnlearn(talent)} />
          </div>)}
        </div>
      </section>;
    })}
  </div>;
}
