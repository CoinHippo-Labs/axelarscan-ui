import dynamic from 'next/dynamic'
import { useSelector, shallowEqual } from 'react-redux'
import { to_json } from '../../lib/utils'

export default ({ data }) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const ReactJson = typeof window !== 'undefined' && dynamic(import('react-json-view'))

  return (
    <div className="space-y-2">
      <div className="text-lg font-bold">
        Logs
      </div>
      {data?.raw_log && (
        <div className="text-xs lg:text-base font-semibold">
          {to_json(data.raw_log) ?
            <ReactJson
              src={to_json(data.raw_log)}
              theme={theme === 'dark' ? 'harmonic' : 'rjv-default'}
            />
            :
            <span>
              {data.raw_log}
            </span>
          }
        </div>
      )}
    </div>
  )
}