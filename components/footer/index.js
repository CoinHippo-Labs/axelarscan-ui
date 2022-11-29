import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'

import Image from '../image'
import _package from '../../package.json'

export default () => {
  const {
    preferences,
    chain,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chain: state.chain,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chain_data,
  } = { ...chain }

  const {
    dependencies,
  } = { ..._package }

  return (
    <div className={`${theme} footer flex flex-col md:flex-row items-center space-y-2.5 sm:space-y-0 p-3`}>
      <div className="w-full md:w-1/2 lg:w-1/4 min-w-max flex items-center justify-center md:justify-start space-x-2">
        <a
          href={`${process.env.NEXT_PUBLIC_DOC_URL}/resources/${process.env.NEXT_PUBLIC_ENVIRONMENT}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-blue-500 text-xs font-medium"
        >
          <div className="mr-2">
            <div className="block dark:hidden">
              <Image
                src="/logos/logo.png"
                className="w-5 h-5"
              />
            </div>
            <div className="hidden dark:block">
              <Image
                src="/logos/logo_white.png"
                className="w-5 h-5"
              />
            </div>
          </div>
          Core {chain_data?.['axelar-core_version']}
        </a>
        {
          dependencies?.['@axelar-network/axelarjs-sdk'] &&
          (
            <a
              href={`${process.env.NEXT_PUBLIC_DOC_URL}/dev/axelarjs-sdk/intro`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 text-xs font-medium"
            >
              SDK v{
                dependencies['@axelar-network/axelarjs-sdk']
                  .replace(
                    '^',
                    '',
                  )
              }
            </a>
          )
        }
      </div>
      <div className="hidden lg:flex w-full lg:w-2/4 flex-wrap items-center justify-center" />
      <div className="w-full md:w-1/2 lg:w-1/4 min-w-max flex items-center justify-center md:justify-end space-x-1.5">
        <span className="text-slate-500 dark:text-white font-medium">
          © {
            moment()
              .format('YYYY')
          }
        </span>
        <a
          href={process.env.NEXT_PUBLIC_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 font-medium"
        >
          {process.env.NEXT_PUBLIC_PROJECT_NAME}.
        </a>
        <span className="text-slate-500 dark:text-white font-medium">
          All rights reserved
        </span>
      </div>
    </div>
  )
}