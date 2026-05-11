export function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="animate-pulse">
            <table className="min-w-full">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                        {Array.from({ length: cols }).map((_, i) => (
                            <th key={i} className="px-6 py-3.5">
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                    {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r} className="bg-white dark:bg-[#1e293b]">
                            {Array.from({ length: cols }).map((_, c) => (
                                <td key={c} className="px-6 py-4">
                                    <div className={`h-4 bg-gray-100 dark:bg-gray-700 rounded ${c === 0 ? 'w-36' : c === cols - 1 ? 'w-16 ml-auto' : 'w-24'}`} />
                                    {c === 0 && <div className="h-3 bg-gray-100 dark:bg-gray-700/60 rounded w-20 mt-1.5" />}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
