import React, { memo, useEffect, useRef } from 'react';
import type { ParticipantProfile } from '../../config/eventData';

type ParticipantItemProps = {
  participant: ParticipantProfile;
};

const AVATAR_SIZE_PX = 64;

const participantItemClassName =
  'flex items-center gap-3 rounded-[14px] border border-white/80 bg-white/90 px-3 py-2.5 shadow-[0_16px_40px_-36px_rgba(16,36,95,0.85)]';

const avatarClassName =
  'relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-full ring-2 ring-idasan-yellow/35';

const nameClassName =
  'font-sans text-[0.76rem] leading-tight font-medium tracking-[-0.01em] text-[#081736] md:text-[0.8rem]';

const roleClassName =
  'mt-1 font-sans text-[0.66rem] leading-tight font-light tracking-[0.005em] text-[#081736]/70 md:text-[0.7rem]';

function parseObjectPosition(value: string | undefined): { x: number; y: number } {
  const raw = (value ?? 'center top').trim().toLowerCase();
  const parts = raw.split(/\s+/);
  const mapAxis = (token: string, fallback: number) => {
    if (token === 'center' || token === 'centre') return 0.5;
    if (token === 'left' || token === 'top') return 0;
    if (token === 'right' || token === 'bottom') return 1;
    if (token.endsWith('%')) return Number.parseFloat(token) / 100;
    return fallback;
  };

  if (parts.length === 1) {
    return { x: 0.5, y: mapAxis(parts[0], 0) };
  }

  return {
    x: mapAxis(parts[0], 0.5),
    y: mapAxis(parts[1], 0),
  };
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  size: number,
  position: string | undefined,
) {
  const { x: posX, y: posY } = parseObjectPosition(position);
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const dx = (size - drawWidth) * posX;
  const dy = (size - drawHeight) * posY;

  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
}

const ParticipantAvatar = memo(function ParticipantAvatar({
  photo,
  alt,
  photoPosition,
}: {
  photo: string;
  alt: string;
  photoPosition?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const image = new Image();
    let cancelled = false;

    image.onload = () => {
      if (cancelled) {
        return;
      }

      const dpr = Math.max(2, window.devicePixelRatio || 1);
      const pixelSize = Math.round(AVATAR_SIZE_PX * dpr);
      canvas.width = pixelSize;
      canvas.height = pixelSize;
      canvas.style.width = `${AVATAR_SIZE_PX}px`;
      canvas.style.height = `${AVATAR_SIZE_PX}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCoverImage(ctx, image, AVATAR_SIZE_PX, photoPosition);
    };

    image.src = photo;

    return () => {
      cancelled = true;
    };
  }, [photo, photoPosition]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className="block h-full w-full rounded-full"
    />
  );
});

export const ParticipantItem = memo(({ participant }: ParticipantItemProps) => {
  const fullName = `${participant.name} ${participant.surname}`.trim();

  return (
    <div className={participantItemClassName}>
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
