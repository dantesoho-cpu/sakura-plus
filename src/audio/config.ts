// ONE place to change the soundtrack: the album, in tracklist order, played end-to-end and looping back to track 1.
// Files: public/assets/music/<file>.ogg + .mp3 (mp3 = Safari/iOS fallback).
export const PLAYLIST: { file: string; title: string }[] = [
  { file: '1-zoom_8bit', title: 'Zoom' },
  { file: '2-dualshock_8bit', title: 'Dualshock' },
  { file: '3-2023_8bit', title: '2023' },
  { file: '4-loml_8bit', title: 'LOML' },
  { file: '5-overkill_8bit', title: 'Overkill' },
  { file: '6-child_of_paper_8bit', title: 'Child of Paper' },
  { file: '7-law_of_attraction_8bit', title: 'Law of Attraction' },
];
export const DEFAULTS = { music: 0.6, sfx: 0.8, mute: false };
