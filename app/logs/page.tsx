import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const level = (params.level as string) || '';
  const search = (params.search as string) || '';

  const supabase = createAdminClient();
  let query = supabase
    .from('app_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (level) {
    query = query.eq('level', level);
  }
  if (search) {
    query = query.ilike('message', `%${search}%`);
  }

  const { data: logs, error } = await query;

  return (
    <main id="main-content" className="app-page text-gray-100">
      <div className="space-y-6">
        <div>
          <h1 className="app-title">System logs</h1>
          <p className="app-subtitle">Latest 100 application events.</p>
        </div>

        <form method="GET" action="/logs" className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <div className="flex-1 w-full">
            <label htmlFor="search" className="block text-sm font-medium text-gray-400 mb-1">Search Message</label>
            <input
              type="text"
              id="search"
              name="search"
              defaultValue={search}
              placeholder="e.g. timeout..."
              className="field"
            />
          </div>
          <div className="w-full sm:w-48">
            <label htmlFor="level" className="block text-sm font-medium text-gray-400 mb-1">Log Level</label>
            <select
              id="level"
              name="level"
              defaultValue={level}
              className="field appearance-none"
            >
              <option value="">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
          </div>
          <button
            type="submit"
            className="primary-action w-full sm:w-auto"
          >
            Filter
          </button>
        </form>

        {error ? (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-xl">
            Error loading logs: {error.message}
          </div>
        ) : (
          <div className="surface overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead data-ui="logs-table" className="bg-gray-800/80 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-300">Timestamp</th>
                  <th className="px-6 py-3 font-semibold text-gray-300">Level</th>
                  <th className="px-6 py-3 font-semibold text-gray-300">Message</th>
                  <th className="px-6 py-3 font-semibold text-gray-300">Metadata</th>
                </tr>
              </thead>
              <tbody data-ui="logs-table" className="divide-y divide-gray-700">
                {logs?.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-gray-400">
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.created_at))}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase
                        ${log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                          log.level === 'warn' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'}`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-medium break-words whitespace-normal max-w-md">
                      {log.message}
                    </td>
                    <td className="max-w-xs break-all px-6 py-4 text-xs text-gray-400" title={log.metadata ? JSON.stringify(log.metadata) : ''}>
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </td>
                  </tr>
                ))}
                {logs?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
