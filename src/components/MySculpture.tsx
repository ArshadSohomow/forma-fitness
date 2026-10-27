import { useApp } from '../store';
import { Sculpture } from './Sculpture';
import { stageIndex, STAGES } from '../logic/calc';

export function MySculpture({ celebrate, override }: { celebrate?: 'refined' | 'restored' | null; override?: Partial<{ stage: number; weathering: number; repaired: boolean; vitality: number; neglect: number; wrappers: number }> }) {
  const { state } = useApp();
  const sc = state.sculpture; const p = state.profile;
  const stage = override?.stage ?? stageIndex(sc.refinement);
  const weathering = override?.weathering ?? sc.weathering;
  const label = `Marble sculpture, stage ${stage + 1} of 6: ${STAGES[stage].name}.${weathering ? ` Weathering level ${weathering} of 3, reversible.` : ''}${sc.repairs && !weathering ? ' Shows a mended seam from a restored week.' : ''}`;
  return (
    <Sculpture style={p.sculptureStyle} build={p.sculptureBuild} detail={p.sculptureDetail} stage={stage} weathering={weathering}
      repaired={override?.repaired ?? (sc.repairs > 0 || !!sc.milestones['comeback'])} vitality={override?.vitality ?? sc.vitality} neglect={override?.neglect ?? (p.nutritionEffects === 'off' ? 0 : sc.neglect)}
      wrappers={override?.wrappers ?? (p.wrappersEnabled ? sc.wrappers : 0)} milestones={sc.milestones} celebrate={celebrate} label={label} />
  );
}
