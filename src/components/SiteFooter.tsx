export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Premier Energies Limited, Hyderabad, India.</p>
        <p>After-sales support for solar PV cells &amp; modules.</p>
      </div>
    </footer>
  );
}
