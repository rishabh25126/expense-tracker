export default function GroupLoading() {
  return (
    <main id="main-content" className="app-page has-nav" role="status" aria-label="Loading section">
      <div className="mb-6 h-9 w-44 animate-pulse rounded bg-gray-800" />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="surface h-32 animate-pulse" />
        <div className="surface h-32 animate-pulse" />
      </div>
    </main>
  );
}
