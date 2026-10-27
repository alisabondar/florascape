"use client";

import Link from "next/link";
import { useSavedAlbums } from "./store";
import "./albums.css";

/** "Your albums (3)" in the top bar, shown once a plan has been saved on this device. */
export default function NavAlbumsLink() {
  const albums = useSavedAlbums();
  if (!albums.length) {
    return null;
  }
  return (
    <Link className="nav-albums-link" href="/#albums">
      Your albums <span className="px">({albums.length})</span>
    </Link>
  );
}
