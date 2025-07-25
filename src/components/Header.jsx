'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Popover, Transition } from '@headlessui/react'
import clsx from 'clsx'
import { FiChevronDown } from 'react-icons/fi'

import { Container } from '@/components/Container'
import { Logo } from '@/components/Logo'
import { NavLink } from '@/components/NavLink'
import { Search } from '@/components/Search'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useGlobalStore } from '@/components/Global'
import { ENVIRONMENT } from '@/lib/config'

const NAVIGATIONS = [
  {
    title: 'Interchain',
    children: [
      { title: 'Statistics', href: '/interchain' },
      { title: 'General Message Passing', href: '/gmp/search' },
      { title: 'Token Transfers', href: '/transfers/search' },
    ],
  },
  {
    title: 'Network',
    children: [
      { title: 'Validators', href: '/validators' },
      { title: 'Verifiers', href: '/verifiers' },
      { title: 'Amplifier Rewards', href: '/amplifier-rewards' },
      { title: 'Blocks', href: '/blocks' },
      { title: 'Transactions', href: '/transactions' },
      { title: 'External Chain Polls', href: '/evm-polls' },
      { title: 'External Chain Signings', href: '/evm-batches' },
      { title: 'Proposals', href: '/proposals' },
    ],
  },
  ENVIRONMENT === 'mainnet' && { title: 'TVL', href: '/tvl' },
  {
    title: 'Resources',
    children: [
      { title: 'Chains', href: '/resources/chains' },
      { title: 'Assets', href: '/resources/assets' },
    ],
  },
]

const ENVIRONMENTS = [
  { name: 'mainnet', href: 'https://axelarscan.io' },
  { name: 'testnet', href: 'https://testnet.axelarscan.io' },
  { name: 'stagenet', href: 'https://stagenet.axelarscan.io' },
  { name: 'devnet-amplifier', href: 'https://devnet-amplifier.axelarscan.io' },
].filter(d => !['stagenet', 'devnet-amplifier'].includes(d.name) || d.name === ENVIRONMENT)

function MobileNavLink({ href, children, className }) {
  const pathname = usePathname()

  return (
    <Popover.Button
      as={Link}
      href={href}
      className={clsx(
        'block w-full px-2 py-1',
        href === pathname ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-700 dark:text-zinc-300',
        className,
      )}
    >
      {children}
    </Popover.Button>
  )
}

function MobileNavIcon({ open }) {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 overflow-visible stroke-zinc-700 dark:stroke-zinc-300"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <path d="M0 1H14M0 7H14M0 13H14" className={clsx('origin-center transition', open && 'scale-90 opacity-0')} />
      <path d="M2 2L12 12M12 2L2 12" className={clsx('origin-center transition', !open && 'scale-90 opacity-0')} />
    </svg>
  )
}

function MobileNavigation() {
  return (
    <Popover>
      <Popover.Button
        className="relative z-10 flex h-8 w-8 items-center justify-center ui-not-focus-visible:outline-none"
        aria-label="Toggle Navigation"
      >
        {({ open }) => <MobileNavIcon open={open} />}
      </Popover.Button>
      <Transition.Root>
        <Transition.Child
          as={Fragment}
          enter="duration-150 ease-out"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="duration-150 ease-in"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Popover.Overlay className="fixed inset-0 bg-zinc-100/50 dark:bg-zinc-900/50" />
        </Transition.Child>
        <Transition.Child
          as={Fragment}
          enter="duration-150 ease-out"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="duration-100 ease-in"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Popover.Panel
            as="div"
            className="absolute inset-x-0 top-full mt-4 flex origin-top flex-col rounded-2xl bg-white dark:bg-zinc-800 p-4 text-lg tracking-tight text-zinc-900 dark:text-zinc-100 shadow-xl ring-1 ring-zinc-900/5"
          >
            {NAVIGATIONS.map(({ title, href, children }, i) => {
              if (children) {
                return (
                  <div key={i} className="flex flex-col">
                    <span className="px-2 pt-4 pb-1 font-bold">
                      {title}
                    </span>
                    {children.map((c, j) => (
                      <MobileNavLink key={j} href={c.href}>
                        {c.title}
                      </MobileNavLink>
                    ))}
                  </div>
                )
              }

              return href && (
                <MobileNavLink key={i} href={href} className="font-bold pt-4">
                  {title}
                </MobileNavLink>
              )
            })}
          </Popover.Panel>
        </Transition.Child>
      </Transition.Root>
    </Popover>
  )
}

function EnvironmentLink({ name, href, children }) {
  return (
    <Link
      href={href}
      className={clsx(
        'w-full inline-block rounded-lg p-2 capitalize text-sm hover:text-blue-600 dark:hover:text-blue-500 whitespace-nowrap',
        name === ENVIRONMENT ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-700 dark:text-zinc-300',
      )}
    >
      {children}
    </Link>
  )
}

export function Header() {
  const pathname = usePathname()
  const [popoverOpen, setPopoverOpen] = useState(null)
  const [popoverEnvironmentOpen, setPopoverEnvironmentOpen] = useState(false)
  const { tvl } = useGlobalStore()

  const hasTVL = pathname === '/tvl' && !!tvl

  return (
    <header className={clsx('bg-white dark:bg-zinc-900 py-6', hasTVL && 'lg:w-tvl')}>
      <Container className={clsx(hasTVL && 'lg:!mx-24')}>
        <nav className="relative z-50 flex justify-between gap-x-4">
          <div className="flex items-center xl:gap-x-12">
            <Link href="/" aria-label="Dashboard">
              <Logo className="h-10 w-auto" />
            </Link>
            <div className="hidden xl:flex xl:gap-x-4">
              {NAVIGATIONS.map(({ title, href, children }, i) => {
                if (children) {
                  return (
                    <Popover
                      key={i}
                      onMouseEnter={() => setPopoverOpen(i)}
                      onMouseLeave={() => setPopoverOpen(null)}
                      className="relative"
                    >
                      <Popover.Button
                        className={clsx(
                          'rounded-lg focus:outline-none uppercase text-sm whitespace-nowrap',
                          href === pathname || children.find(c => c.href === pathname) ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-700 dark:text-zinc-300',
                        )}
                      >
                        <Link href={children[0].href} className="p-2 inline-flex items-center gap-x-1">
                          <span>{title}</span>
                          <FiChevronDown className="h-4 w-4" />
                        </Link>
                      </Popover.Button>
                      <Transition
                        show={i === popoverOpen}
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                      >
                        <Popover.Panel className="absolute left-1/2 z-10 flex w-screen max-w-min -translate-x-1/2">
                          <div className="shrink rounded-xl bg-white dark:bg-zinc-800 p-2 text-sm shadow-lg ring-1 ring-zinc-900/5">
                            {children.map((c, j) => (
                              <NavLink key={j} href={c.href}>
                                {c.title}
                              </NavLink>
                            ))}
                          </div>
                        </Popover.Panel>
                      </Transition>
                    </Popover>
                  )
                }

                return href && (
                  <NavLink key={i} href={href}>
                    <div className="flex items-center">
                      {title}
                    </div>
                  </NavLink>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-x-4">
            <div className="block">
              <Search />
            </div>
            <div className="hidden xl:block">
              <Popover
                onMouseEnter={() => setPopoverEnvironmentOpen(true)}
                onMouseLeave={() => setPopoverEnvironmentOpen(false)}
                className="relative"
              >
                <Popover.Button className="p-2 rounded-lg focus:outline-none capitalize text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                  <span>{ENVIRONMENT}</span>
                </Popover.Button>
                <Transition
                  show={popoverEnvironmentOpen}
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1"
                >
                  <Popover.Panel className="absolute left-1/2 z-10 flex w-screen max-w-min -translate-x-1/2">
                    <div className="shrink rounded-xl bg-white dark:bg-zinc-800 p-2 text-sm shadow-lg ring-1 ring-zinc-900/5">
                      {ENVIRONMENTS.map((d, i) => (
                        <EnvironmentLink key={i} {...d}>
                          {d.name}
                        </EnvironmentLink>
                      ))}
                    </div>
                  </Popover.Panel>
                </Transition>
              </Popover>
            </div>
            <ThemeToggle />
            <div className="-mr-1 xl:hidden">
              <MobileNavigation />
            </div>
          </div>
        </nav>
      </Container>
    </header>
  )
}
