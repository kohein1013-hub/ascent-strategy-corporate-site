/** セクション縦スライド中（Approach→Service 等のチラつき防止用） */
export const SECTION_TRACK_TRANSITIONING_CLASS = "is-transitioning";

export function setSectionTrackTransitioning(on: boolean) {
  document
    .querySelector(".section-track")
    ?.classList.toggle(SECTION_TRACK_TRANSITIONING_CLASS, on);
}

export function isSectionTrackTransitioning() {
  return (
    document
      .querySelector(".section-track")
      ?.classList.contains(SECTION_TRACK_TRANSITIONING_CLASS) ?? false
  );
}
