"use client";

import PixelSprite from "../PixelSprite";
import { deleteAlbum, openAlbum, useSavedAlbums } from "./store";
import "./albums.css";

interface AlbumShelfProps {
  /** Hide the album that's open right now (on the results page). */
  currentId?: string;
  heading?: string;
}

function formatSaved(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Saved plans on this device; renders nothing until there is at least one. */
export default function AlbumShelf({ currentId, heading = "Your albums" }: AlbumShelfProps) {
  const albums = useSavedAlbums().filter((album) => album.id !== currentId);
  if (!albums.length) {
    return null;
  }
  return (
    <section className="album-shelf no-print" aria-labelledby="album-shelf-title">
      <h2 id="album-shelf-title">{heading}</h2>
      <ul>
        {albums.map((album) => {
          const firstPlant = album.result.plan?.layout.plants[0]?.name ?? "Basil";
          return (
            <li key={album.id} className="album-shelf-item">
              <button type="button" className="album-shelf-open" onClick={() => openAlbum(album)}>
                <span className="album-shelf-art" aria-hidden="true">
                  <PixelSprite plantName={firstPlant} scale={2} motion="still" />
                </span>
                <span className="album-shelf-title">{album.title}</span>
                <span className="album-shelf-date">Saved {formatSaved(album.savedAt)}</span>
              </button>
              <button
                type="button"
                className="album-shelf-remove"
                onClick={() => deleteAlbum(album.id)}
                aria-label={`Remove album ${album.title}`}
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
