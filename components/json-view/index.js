import dynamic from 'next/dynamic'
import { useSelector, shallowEqual } from 'react-redux'

import { toJson } from '../../lib/utils'

export default (
  {
    value,
    useJSONView = false,
    tab = 4,
    className = 'max-w-xs sm:max-w-4xl max-h-96 overflow-y-auto whitespace-pre text-black dark:text-white text-sm',
  },
) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const ReactJSONView = typeof window !== 'undefined' && dynamic(import('react-json-view'))

  return typeof toJson(value) === 'object' && (
    <div className={className}>
      {useJSONView ?
        <ReactJSONView
          src={toJson(value)}
          theme={theme === 'dark' ? 'brewer' : 'bright:inverted'}
          style={{ background: 'transparent', borderRadius: '.75rem', padding: '.8rem .75rem' }}
        /> :
        JSON.stringify(toJson(value), null, tab)
      }
    </div>
  )
}