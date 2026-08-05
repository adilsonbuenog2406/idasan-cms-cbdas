import React, { memo } from 'react';
import { Clock } from 'lucide-react';
import { ParticipantRoster } from '../shared/ParticipantRoster';
import type { ParticipantProfile, ScheduleEventType } from '../../config/eventData';
import { sectionVisibility } from '../../config/sectionVisibility';

type ScheduleCardView = {
  id: string;
  title: string;
  formattedTime: string;
  type: ScheduleEventType;
  typeLabel: string | null;
  accentClassName: string;
  speakers?: ParticipantProfile[];
};

type ScheduleCardProps = {
  event: ScheduleCardView;
};

const scheduleCardBaseClassName =
  'performance-surface group relative rounded-[18px] border-l-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:p-[18px]';

export const ScheduleCard = memo(({ event }: ScheduleCardProps) => (
  <article
    data-program-card
    data-program-card-title={event.title}
    data-program-card-time={event.formattedTime}
    data-program-card-type={event.typeLabel ?? event.type}
    className={`${scheduleCardBaseClassName} ${event.accentClassName}`}
  >
    <div className="grid gap-3 sm:grid-cols-[minmax(9.25rem,max-content)_minmax(0,1fr)] sm:items-start sm:gap-4 md:gap-5">
      <div className="type-eyebrow inline-flex min-w-fit shrink-0 items-center gap-1.5 whitespace-nowrap !text-[0.62rem] text-idasan-blue sm:min-w-[9.25rem]">
        <Clock className="h-[0.92rem] w-[0.92rem] shrink-0 text-idasan-yellow" />
        <span className="whitespace-nowrap">{event.formattedTime}</span>
      </div>

      <div className="min-w-0">
        <h3
          className={`type-card-title !text-[0.92rem] leading-snug md:!text-[0.98rem] ${
            event.type === 'break' ? 'text-gray-600 italic' : 'text-gray-900'
          }`}
        >
          {event.title}
        </h3>

        {event.typeLabel && (
          <span className="type-button mt-1.5 inline-flex rounded bg-gray-100 px-2 py-[5px] text-[0.56rem] text-gray-500">
            {event.typeLabel}
          </span>
        )}

        {sectionVisibility.blocks.showPanelSpeakers &&
          (event.type === 'panel' ||
            event.type === 'conference' ||
            event.type === 'special') &&
          event.speakers &&
          event.speakers.length > 0 && (
          <ParticipantRoster
            participants={event.speakers}
            rosterId={event.id}
            className="mt-4"
          />
        )}
      </div>
    </div>
  </article>
));

ScheduleCard.displayName = 'ScheduleCard';

export type { ScheduleCardView };
