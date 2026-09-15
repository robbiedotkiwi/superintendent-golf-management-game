import {
  TURF_TAB_IRRIGATION,
  TURF_TAB_PATTERNS,
  TURF_TAB_WEEK,
} from '../data/constants.ts';
import SectionTabs from './SectionTabs.tsx';
import DayPlanner from './DayPlanner.tsx';
import IrrigationWeekTab from './IrrigationWeekTab.tsx';
import CutPatternsTab from './CutPatternsTab.tsx';
import { turfTabLabels, visibleTurfTabs } from '../engine/section.ts';

export default function Turf({
  state,
  tab = TURF_TAB_WEEK,
  onTab,
  onBack,
  onPlaceBlock,
  onMoveBlock,
  onResizeBlock,
  onSetBlockMachine,
  onRemove,
  onSelectDay,
  onSetHoc,
  onSetPattern,
  onSetAngle,
  onSetAutoRotate,
  onSetIrrigation,
  onCopyYesterday,
  onSaveTemplate,
  onApplyTemplate,
  onBuyAerator,
  onBuyGreensSensors,
  onBuyTurfRad,
  onBuyWeatherStation,
}) {
  return (
    <div className="h-full overflow-y-auto bg-[var(--soil)] px-6 py-5 text-[var(--paint)]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-condensed text-5xl font-bold">Turf</h1>
        <button type="button" onClick={onBack} className="border border-[var(--sand)] px-4 py-2">
          Back to the course
        </button>
      </div>
      <SectionTabs tabs={visibleTurfTabs()} labels={turfTabLabels()} value={tab} onChange={onTab} />

      {tab === TURF_TAB_WEEK ? (
        <DayPlanner
          state={state}
          onPlaceBlock={onPlaceBlock}
          onMoveBlock={onMoveBlock}
          onResizeBlock={onResizeBlock}
          onSetBlockMachine={onSetBlockMachine}
          onRemove={onRemove}
          onSelectDay={onSelectDay}
          onCopyYesterday={onCopyYesterday}
          onSaveTemplate={onSaveTemplate}
          onApplyTemplate={onApplyTemplate}
        />
      ) : null}

      {tab === TURF_TAB_IRRIGATION ? (
        <IrrigationWeekTab
          state={state}
          onSetIrrigation={onSetIrrigation}
          onSelectDay={onSelectDay}
          onBuyAerator={onBuyAerator}
          onBuyGreensSensors={onBuyGreensSensors}
          onBuyTurfRad={onBuyTurfRad}
          onBuyWeatherStation={onBuyWeatherStation}
        />
      ) : null}

      {tab === TURF_TAB_PATTERNS ? (
        <CutPatternsTab
          state={state}
          onSetHoc={onSetHoc}
          onSetPattern={onSetPattern}
          onSetAngle={onSetAngle}
          onSetAutoRotate={onSetAutoRotate}
        />
      ) : null}
    </div>
  );
}
