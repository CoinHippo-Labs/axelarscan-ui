import dynamic from 'next/dynamic'
import { useSelector, shallowEqual } from 'react-redux'
import { to_json } from '../../lib/utils'

export default ({
  data,
}) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const ReactJson = typeof window !== 'undefined' &&
    dynamic(import('react-json-view'))

  const {
    tx,
    raw_log,
  } = { ...data }
  const {
    messages,
  } = { ...tx?.body }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="text-lg font-bold">
          Transaction
        </div>
        {tx && (
          <div className="text-sm lg:text-base font-semibold">
            {to_json(messages || tx) ?
              <ReactJson
                src={to_json(messages || tx)}
                theme={theme === 'dark' ?
                  'harmonic' :
                  'rjv-default'
                }
              /> :
              <span>
                {messages || tx}
              </span>
            }
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div className="text-lg font-bold">
          Events
        </div>
        {raw_log && (
          <div className="text-sm lg:text-base font-semibold">
            {to_json(raw_log) ?
              <ReactJson
                src={to_json(raw_log)}
                theme={theme === 'dark' ?
                  'harmonic' :
                  'rjv-default'
                }
              /> :
              <span>
                {raw_log}
              </span>
            }
          </div>
        )}
      </div>
    </div>
  )
}