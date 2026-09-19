// Full-bleed Sketchfab 3D model viewer. Sketchfab's iframe brings its own
// rotate/zoom controls, so the workspace toolbar just sits harmlessly on top.
const SketchfabEmbed = ({ id, title }) => (
  <div className="absolute inset-0 bg-slate-900">
    <iframe
      title={title}
      src={`https://sketchfab.com/models/${id}/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_hint=0&dnt=1`}
      className="h-full w-full border-0"
      allow="autoplay; fullscreen; xr-spatial-tracking"
      allowFullScreen
      mozallowfullscreen="true"
      webkitallowfullscreen="true"
    />
  </div>
);

export default SketchfabEmbed;
