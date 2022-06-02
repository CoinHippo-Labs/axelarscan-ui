import moment from 'moment'
import Popover from '../popover'

export default ({
  time,
  placement = 'top',
  title = 'time',
  titleClassName = 'h-8 text-xs font-bold',
  className = '',
}) => {
  const _time = time && moment(!isNaN(time) ? Number(time) : time)
  return _time && (
    <Popover
      placement={placement}
      title={title}
      content={<div className="w-38 text-xs font-medium mx-1">
        {_time.format('MMM D, YYYY h:mm:ss A')}
      </div>}
      titleClassName={titleClassName}
      className={className}
    >
      <div className={className}>
        <span className="normal-case text-slate-400 dark:text-slate-600 font-medium">
          {Number(moment().diff(_time, 'seconds')) > 59 ?
            _time.fromNow() : <>{moment().diff(_time, 'seconds')}s ago</>
          }
        </span>
      </div>
    </Popover>
  )
}