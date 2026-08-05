import React, { memo } from 'react';
import type { ParticipantProfile } from '../../config/eventData';

type ParticipantItemProps = {
  participant: ParticipantProfile;
};

const participantItemClassName =
  'flex items-center gap-3 rounded-[14px] border border-white/80 bg-white/90 px-3 py-2.5 shadow-[0_16px_40px_-36px_rgba(16,36,95,0.85)]';

const avatarClassName =
  'relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-full ring-2 ring-idasan-yellow/35';

const nameClassName =
  'font-sans text-[0.76rem] leading-tight font-medium tracking-[-0.01em] text-[#081736] md:text-[0.8rem]';

const roleClassName =
  'mt-1 font-sans text-[0.66rem] leading-tight font-light tracking-[0.005em] text-[#081736]/70 md:text-[0.7rem]';

const ParticipantAvatar = memo(function ParticipantAvatar({
  photo,
  alt,
  photoPosition,
}: {
  photo: string;
  alt: string;
  photoPosition?: string;
}) {
  return (
    <img
      src={photo}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="block h-full w-full rounded-full object-cover"
      style={{ objectPosition: photoPosition ?? 'center top' }}
      data-cbdas-participant-photo="true"
    />
  );
});

export const ParticipantItem = memo(({ participant }: ParticipantItemProps) => {
  const fullName = `${participant.name} ${participant.surname}`.trim();

  return (
    <div className={participantItemClassName} data-cbdas-participant-item="true">
      <div className={avatarClassName}>
        <ParticipantAvatar
          photo={participant.photo}
          alt={fullName}
          photoPosition={participant.photoPosition}
        />
      </div>

      <div className="min-w-0">
        <p className={nameClassName}>{fullName}</p>
        <p className={roleClassName}>{participant.role}</p>
      </div>
    </div>
  );
});

ParticipantItem.displayName = 'ParticipantItem';
