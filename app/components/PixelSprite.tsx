import type { CSSProperties } from "react";
import { SPRITE_FRAME, spriteIdFor, spriteSheetUrl } from "../../lib/sprites";
import "./pixel.css";

interface PixelSpriteProps {
  plantName: string;
  /** Screen pixels per sprite pixel. */
  scale?: number;
  /** "grow" plays seed → mature once, then sways; "sway" only sways; "still" shows the mature frame. */
  motion?: "grow" | "sway" | "still";
  /** Seconds before growing starts, to stagger a row of plants. */
  delay?: number;
  /** With motion "still": which frame to show (0 seed, 1 sprout, 2 young, 3 mature). */
  stage?: 0 | 1 | 2 | 3;
  className?: string;
}

/**
 * One plant from its sprite sheet (five frames: seed, sprout, young, mature, sway).
 * Frames are stepped with CSS background-position, so there is no JavaScript timer.
 */
export default function PixelSprite({ plantName, scale = 3, motion = "grow", delay = 0, stage = 3, className = "" }: PixelSpriteProps) {
  const style = {
    "--sprite-url": `url(${spriteSheetUrl(spriteIdFor(plantName))})`,
    "--sprite-w": `${SPRITE_FRAME.width * scale}px`,
    "--sprite-h": `${SPRITE_FRAME.height * scale}px`,
    "--sprite-delay": `${delay}s`,
    ...(motion === "still" ? { backgroundPosition: `${stage * 25}% 0` } : {}),
  } as CSSProperties;
  return <span className={`pixel-sprite motion-${motion} ${className}`.trim()} style={style} aria-hidden="true" />;
}
