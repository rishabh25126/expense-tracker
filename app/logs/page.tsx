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
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Logs</h1>
          <p className="text-gray-400 mt-2">Internal application logs (Latest 100). Do not share this URL.</p>
        </div>

        <form method="GET" action="/logs" className="flex flex-col sm:flex-row gap-4 bg-gray-800 p-4 rounded-xl items-end">
          <div className="flex-1 w-full">
            <label htmlFor="search" className="block text-sm font-medium text-gray-400 mb-1">Search Message</label>
            <input
              type="text"
              id="search"
              name="search"
              defaultValue={search}
              placeholder="e.g. timeout..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-full sm:w-48">
            <label htmlFor="level" className="block text-sm font-medium text-gray-400 mb-1">Log Level</label>
            <select
              id="level"
              name="level"
              defaultValue={level}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Filter
          </button>
        </form>

        {error ? (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-xl">
            Error loading logs: {error.message}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl overflow-hidden overflow-x-auto border border-gray-700">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-800/80 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-300">Timestamp</th>
                  <th className="px-6 py-3 font-semibold text-gray-300">Level</th>
                  <th className="px-6 py-3 font-semibold text-gray-300">Message</th>
                  <th className="px-6 py-3 font-semibold text-gray-300">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {logs?.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
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
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs max-w-xs truncate" title={log.metadata ? JSON.stringify(log.metadata) : ''}>
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
    </div>
  );
}
