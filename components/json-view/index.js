import { toJson } from '../../lib/utils'

export default (
  {
    value,
    tab = 4,
    className = 'max-w-xs sm:max-w-4xl max-h-96 overflow-y-auto whitespace-pre text-black dark:text-white text-sm',
  },
) => {
  return typeof toJson(value) === 'object' && (
    <div className={className}>
      {JSON.stringify(toJson(value), null, tab)}
    </div>
  )
}