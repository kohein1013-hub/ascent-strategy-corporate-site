import {
  isSectionTrackTransitioning,
} from "@/lib/sectionTrackTransition";

/** SP: セクション縦スライド（globals 0.72s） */
const TRACK_TRANSITION_MS = 720;
/** SP: 十字フォーカス移動（--cross-focus-duration と同長） */
const CROSS_FOCUS_MS = 720;

export function isSectionTrackAnimating(): boolean {
  return (
    document
      .querySelector(".section-track")
      ?.getAnimations()
      .some((anim) => anim.playState === "running") ?? false
  );
}

function isCrossFocusAnimating(cross: Element): boolean {
  return cross
    .getAnimations()
    .some((anim) => anim.playState === "running");
}

function shouldWaitForTrackTransition(): boolean {
  return isSectionTrackTransitioning() || isSectionTrackAnimating();
}

/**
 * SP タイトル帯リビール: トラック transform 完了後、十字フォーカス移動完了後に callback。
 * getAnimations() だけだと遷移開始直後に false になり初回だけガタつくため、is-transitioning を優先する。
 */
export function scheduleAfterTrackAndCrossFocus(callback: () => void): () => void {
  let cancelled = false;
  const cleanups: Array<() => void> = [];

  const register = (cleanup: () => void) => {
    cleanups.push(cleanup);
  };

  const runAfterCross = () => {
    if (cancelled) return;

    const cross = document.querySelector(".cross-focus");
    if (!cross) {
      const id = window.setTimeout(() => {
        if (!cancelled) callback();
      }, CROSS_FOCUS_MS);
      register(() => window.clearTimeout(id));
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished || cancelled) return;
      finished = true;
      cross.removeEventListener("transitionend", onCrossEnd);
      callback();
    };

    const onCrossEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (te.propertyName !== "top" && te.propertyName !== "left") return;
      finish();
    };

    cross.addEventListener("transitionend", onCrossEnd);
    register(() => cross.removeEventListener("transitionend", onCrossEnd));

    const fallbackId = window.setTimeout(finish, CROSS_FOCUS_MS + 80);
    register(() => window.clearTimeout(fallbackId));

    /* トラック終了時点で十字も終わっていることが多い → 即 finish */
    requestAnimationFrame(() => {
      if (finished || cancelled) return;
      if (!isCrossFocusAnimating(cross)) {
        finish();
      }
    });
  };

  const track = document.querySelector(".section-track");

  if (shouldWaitForTrackTransition() && track) {
    let trackDone = false;
    const proceedAfterTrack = () => {
      if (trackDone || cancelled) return;
      trackDone = true;
      track.removeEventListener("transitionend", onTrackEnd);
      runAfterCross();
    };

    const onTrackEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (te.propertyName !== "transform" || te.target !== track) return;
      proceedAfterTrack();
    };

    track.addEventListener("transitionend", onTrackEnd);
    register(() => track.removeEventListener("transitionend", onTrackEnd));

    const trackFallbackId = window.setTimeout(
      proceedAfterTrack,
      TRACK_TRANSITION_MS + 80,
    );
    register(() => window.clearTimeout(trackFallbackId));
  } else {
    runAfterCross();
  }

  return () => {
    cancelled = true;
    cleanups.forEach((fn) => fn());
  };
}
