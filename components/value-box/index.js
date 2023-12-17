import { Tooltip } from '@material-tailwind/react'

import Copy from '../copy'
import { ellipse } from '../../lib/utils'

export default (
  {
    title,
    url,
    value,
    ellipseLength = 10,
    ellipsePrefix = '0x',
    noEllipse = false,
    className = 'border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-between space-x-1.5 py-1.5 pl-2.5 pr-2',
  },
) => {
  const displayValue = noEllipse ? value : ellipse(value, ellipseLength, ellipsePrefix)
  const valueClassName = `${noEllipse ? 'truncate' : ''} font-normal`
  const valueComponent = (
    url ?
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-blue-400 dark:text-white ${valueClassName}`}
      >
        {displayValue}
      </a> :
      <span className={`text-slate-600 dark:text-slate-200 ${valueClassName}`}>
        {displayValue}
      </span>
  )

  return value && (
    <div className="space-y-0.5">
      <span className="text-sm text-slate-400 dark:text-slate-500">
        {title}
      </span>
      <div className={className}>
        {noEllipse ?
          <Tooltip placement="bottom" content={displayValue}>
            {valueComponent}
          </Tooltip> :
          valueComponent
        }
        <Copy value={value} />
      </div>
    </div>
  )
}