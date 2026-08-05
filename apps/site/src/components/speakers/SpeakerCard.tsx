import React, { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';
import { type Speaker } from '../../data/speakers';
import { useInScrollContainer } from './useInScrollContainer';

type SpeakerCardProps = {
  speaker: Speaker;
  index: number;
  container: HTMLDivElement | null;
};

export const SpeakerCard: React.FC<SpeakerCardProps> = ({ speaker, index, container }) => {
  const [hasImageError, setHasImageError] = useState(false);
  const { targetRef, isVisible } = useInScrollContainer<HTMLElement>({
    root: container,
    threshold: 0.16,
    rootMargin: '0px 0px -10% 0px',
  });

  useEffect(() => {
    setHasImageError(false);
  }, [speaker.image]);

  const shouldRenderImage = Boolean(speaker.image) && !hasImageError;
  const isFallbackImage = speaker.usesFallbackImage;

  return (
    <article
      ref={targetRef}
      data-cbdas-speaker-card="true"
      role="listitem"
      className={cn(
        'group relative overflow-hidden rounded-[28px] border border-[#10224f]/12 bg-[#071736] shadow-[0_32px_80px_-46px_rgba(6,21,57,0.72)] transition-all duration-700 ease-out hover:-translate-y-1 hover:shadow-[0_34px_90px_-42px_rgba(6,21,57,0.82)]',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
      )}
      style={{
        transitionDelay: `${Math.min(index % 4, 3) * 80}ms`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18)_0%,_transparent_34%)]" />

      {shouldRenderImage ? (
        <div
          className={cn(
            'relative h-[483px] w-full overflow-hidden',
            isFallbackImage &&
              'bg-[linear-gradient(160deg,rgba(243,246,251,0.96)_0%,rgba(209,221,237,0.96)_46%,rgba(16,34,79,0.92)_100%)]',
          )}
        >
          <img
            src={speaker.image ?? undefined}
            alt={`Retrato de ${speaker.name}, ${speaker.role}.`}
            loading="lazy"
            decoding="async"
            className={cn(
              'h-full w-full',
              'object-cover',
            )}
            style={{
              objectPosition: isFallbackImage ? 'center center' : speaker.imagePosition ?? 'center top',
              transform: speaker.imageScale ? `scale(${speaker.imageScale})` : undefined,
              transformOrigin: isFallbackImage
                ? 'center center'
                : speaker.imagePosition ?? 'center top',
            }}
            onError={() => setHasImageError(true)}
          />
        </div>
      ) : (
        <div
          role="img"
          aria-label={`Espaço reservado para a foto de ${speaker.name}.`}
          className="relative flex h-[483px] w-full items-center justify-center overflow-hidden bg-[linear-gradient(160deg,rgba(243,246,251,0.96)_0%,rgba(209,221,237,0.96)_46%,rgba(16,34,79,0.92)_100%)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(255,255,255,0.58)_0%,transparent_26%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.22)_0%,transparent_24%),radial-gradient(circle_at_50%_100%,rgba(6,21,57,0.28)_0%,transparent_54%)]" />
          <div className="pointer-events-none absolute inset-x-10 top-8 h-px bg-gradient-to-r from-transparent via-white/56 to-transparent" />
          <div className="pointer-events-none absolute inset-x-12 bottom-14 h-px bg-gradient-to-r from-transparent via-[#10224f]/28 to-transparent" />
          <div className="relative flex flex-col items-center gap-4 text-center">
            <span
              aria-hidden="true"
              className="text-[8.5rem] font-semibold leading-none text-white/92 drop-shadow-[0_18px_36px_rgba(6,21,57,0.18)] sm:text-[9.5rem]"
            >
              ?
            </span>
            <span className="rounded-full border border-[#10224f]/10 bg-white/72 px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#10224f]/72 shadow-[0_12px_30px_-18px_rgba(6,21,57,0.4)]">
              Espaço para foto
            </span>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[#061539]/88 via-[#061539]/28 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#061539]/84 via-[#061539]/32 to-transparent" />

      <div className="absolute bottom-3 left-3 right-3 overflow-hidden rounded-[24px] border border-white/20 bg-white/12 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-5">
        <div className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-white/18 blur-2xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/0 via-white/60 to-white/0" />

        <div className="relative min-w-0">
          <h3 className="text-base font-semibold tracking-[0.01em] text-white">
            {speaker.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-white/90">
            {speaker.role}
          </p>
          {speaker.description ? (
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              {speaker.description}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
};
