import React, { memo } from 'react';
import { ArrowUpRight, Clock } from 'lucide-react';
import { ParticipantRoster } from '../shared/ParticipantRoster';
import type { ParticipantProfile } from '../../config/eventData';
import { sectionVisibility } from '../../config/sectionVisibility';

type WorkshopCardView = {
  id: string;
  time: string;
  title: string;
  participants?: ParticipantProfile[];
};

type WorkshopCardProps = {
  workshop: WorkshopCardView;
};

const workshopCardClassName =
  'performance-surface group rounded-xl border border-transparent bg-gray-50 p-6 transition-transform duration-300 lg:hover:-translate-y-1.5 lg:hover:border-gray-100 lg:hover:bg-white lg:hover:shadow-[0_18px_40px_-24px_rgba(16,36,95,0.22)]';

export const WorkshopCard = memo(({ workshop }: WorkshopCardProps) => (
  <article className={workshopCardClassName}>
    <div className="flex items-start gap-4">
      <div className="rounded-lg bg-white p-3 shadow-sm transition-colors lg:group-hover:bg-idasan-blue lg:group-hover:text-white">
        <ArrowUpRight className="h-6 w-6" />
      </div>

      <div className="min-w-0">
        <div className="type-eyebrow mb-2 flex items-center gap-2 !text-[0.68rem] text-gray-500">
          <Clock className="h-3 w-3" />
          {workshop.time}
        </div>

        <h4 className="type-card-title !text-[1.1rem] text-gray-900 transition-colors lg:group-hover:text-idasan-blue">
          {workshop.title}
        </h4>
      </div>
    </div>

    {sectionVisibility.blocks.showWorkshopParticipants &&
      workshop.participants &&
      workshop.participants.length > 0 && (
      <ParticipantRoster
        participants={workshop.participants}
        rosterId={workshop.id}
        className="mt-5"
      />
    )}
  </article>
));

WorkshopCard.displayName = 'WorkshopCard';

export type { WorkshopCardView };
