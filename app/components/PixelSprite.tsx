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
  className?: string;
}

/**
 * One plant from its sprite sheet (five frames: seed, sprout, young, mature, sway).
 * Frames are stepped with CSS background-position, so there is no JavaScript timer.
 */
export default function PixelSprite({ plantName, scale = 3, motion = "grow", delay = 0, className = "" }: PixelSpriteProps) {
  const style = {
    "--sprite-url": `url(${spriteSheetUrl(spriteIdFor(plantName))})`,
    "--sprite-w": `${SPRITE_FRAME.width * scale}px`,
    "--sprite-h": `${SPRITE_FRAME.height * scale}px`,
    "--sprite-delay": `${delay}s`,
  } as CSSProperties;
  return <span className={`pixel-sprite motion-${motion} ${className}`.trim()} style={style} aria-hidden="true" />;
}
