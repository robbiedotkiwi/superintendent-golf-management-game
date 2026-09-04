import { useState } from 'react';
import { CONFIRM_DAMAGING_LABEL } from '../data/constants.js';
import { canPlanTask } from '../engine/gameState.js';

export default function PlanConfirmButton({
  state,
  taskId,
  holes,
  onPlan,
  className,
  children,
  titleWhenBlocked,
}) {
  const [confirming, setConfirming] = useState(false);
  const check = canPlanTask(state, taskId, undefined, { holes });
  const blocked = !check.ok && !check.needsConfirm;

  return (
    <div>
      {check.needsConfirm ? <p className="mt-2 text-sm text-[var(--sand)]">{check.reason}</p> : null}
      <button
        type="button"
        disabled={blocked}
        onClick={() => {
          if (check.needsConfirm && !confirming) {
            setConfirming(true);
            return;
          }
          onPlan(taskId, holes, { confirmDamaging: Boolean(check.needsConfirm) });
        }}
        className={className}
        title={blocked ? titleWhenBlocked ?? check.reason : undefined}
      >
        {confirming && check.needsConfirm ? CONFIRM_DAMAGING_LABEL : children}
      </button>
    </div>
  );
}
