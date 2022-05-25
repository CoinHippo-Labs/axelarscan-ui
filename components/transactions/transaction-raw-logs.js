import dynamic from 'next/dynamic'
import { useSelector, shallowEqual } from 'react-redux'
import { to_json } from '../../lib/utils'

export default function TransactionRawLogs({ data }) {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const ReactJson = typeof window !== 'undefined' && dynamic(import('react-json-view'))

  return (
    <>
      <div className="text-gray-900 dark:text-white text-lg font-semibold mt-6">Raw logs</div>
      {data?.raw_log && (
        <div className="mt-2">
          {to_json(data.raw_log) ?
            <ReactJson src={to_json(data.raw_log)} theme={theme === 'dark' ? 'harmonic' : 'rjv-default'} />
            :
            <span>{data.raw_log}</span>
          }
        </div>
      )}
    </>
  )
}