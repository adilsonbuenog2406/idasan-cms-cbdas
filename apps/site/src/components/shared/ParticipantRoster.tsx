import React, { memo, useMemo } from 'react';
import type { ParticipantProfile } from '../../config/eventData';
import { ParticipantItem } from './ParticipantItem';

type ParticipantRosterProps = {
  label?: string;
  participants: ParticipantProfile[];
  rosterId: string;
  className?: string;
};

const rosterClassName =
  'performance-surface-subtle rounded-[18px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(249,214,0,0.10)_100%)] p-3 shadow-[0_18px_48px_-36px_rgba(16,36,95,0.55)] md:p-4';

export const ParticipantRoster = memo(({
  label,
  participants,
  rosterId,
  className = '',
}: ParticipantRosterProps) => {
  if (participants.length === 0) {
    return null;
  }

  const participantItems = useMemo(
    () =>
      participants.map((participant, participantIndex) => (
        <ParticipantItem
          key={`${rosterId}-${participantIndex}`}
          participant={participant}
        />
      )),
    [participants, rosterId],
  );

  return (
    <div
      className={`${rosterClassName} ${className}`.trim()}
    >
      {label ? (
        <div className="type-eyebrow !text-[0.55rem] text-idasan-blue/70">
          {label}
        </div>
      ) : null}

      <div className={`${label ? 'mt-3 ' : ''}grid gap-2.5 md:grid-cols-2`}>
        {participantItems}
      </div>
    </div>
  );
});

ParticipantRoster.displayName = 'ParticipantRoster';
