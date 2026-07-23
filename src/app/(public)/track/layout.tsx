import TrackGlobe from "./track-globe";

// The globe lives in the layout (not the page) so it stays mounted across
// lookups — the page re-renders on each search via soft navigation, but this
// layout, and the globe, do not re-mount or reload their texture.
export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-start">
      <div className="min-w-0 lg:max-w-2xl">{children}</div>
      <div className="hidden lg:block">
        <TrackGlobe />
      </div>
    </div>
  );
}
