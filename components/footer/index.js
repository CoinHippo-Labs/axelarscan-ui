import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'

import _package from '../../package.json'

export default () => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const { dependencies } = { ..._package }

  return (
    <div className={`${theme} footer flex flex-col md:flex-row items-end space-y-2.5 sm:space-y-0 p-3 3xl:text-2xl 3xl:p-8`} style={{ minHeight: '64px' }}>
      <div className="w-full md:w-1/2 lg:w-1/3 min-w-max flex items-center justify-center md:justify-start space-x-1">
        {dependencies?.['@axelar-network/axelarjs-sdk'] && (
          <a
            href={`${process.env.NEXT_PUBLIC_DOC_URL}/dev/axelarjs-sdk/intro`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 dark:text-white font-medium"
          >
            SDK v{dependencies['@axelar-network/axelarjs-sdk'].replace('^', '')}
          </a>
        )}
      </div>
      <div className="hidden lg:flex w-full lg:w-1/3 flex-wrap items-center justify-center" />
      <div className="w-full md:w-1/2 lg:w-1/3 min-w-max flex items-center justify-center md:justify-end space-x-1">
        <span className="text-slate-500 dark:text-white font-normal">
          © {moment().format('YYYY')}
        </span>
        <a
          href={process.env.NEXT_PUBLIC_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 dark:text-white font-medium"
        >
          {process.env.NEXT_PUBLIC_PROJECT_NAME}.
        </a>
        <span className="text-slate-500 dark:text-white font-normal">
          All rights reserved
        </span>
      </div>
    </div>
  )
}