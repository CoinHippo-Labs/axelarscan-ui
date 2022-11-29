import { Fragment, useState, useEffect } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'

import Image from '../image'

export default (
  {
    data = [],
    placeholder = 'Select Options',
    hasAllOptions = true,
    allOptionsName = 'All',
    defaultSelectedKey,
    onSelect,
  },
) => {
  const [options, setOptions] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)

  useEffect(
    () => {
      setOptions(
        data
          .filter(d => d)
      )
    },
    [data],
  )

  useEffect(
    () => {
      setSelectedKey(defaultSelectedKey)
    },
    [defaultSelectedKey],
  )

  const selectedData =
    (options || [])
      .find(o =>
        o?.id === selectedKey
      ) ||
    selectedKey

  const {
    name,
    image,
  } = { ...selectedData }

  return (
    <Menu
      as="div"
      className="relative inline-block text-left"
    >
      {({ open }) => (
        <>
          <div>
            <Menu.Button
              className="w-full bg-white dark:bg-black hover:bg-slate-50 dark:hover:bg-slate-900 rounded shadow focus:outline-none inline-flex justify-center text-sm font-semibold py-2 px-3"
            >
              {selectedData ?
                <div className="flex items-center space-x-2">
                  {
                    image &&
                    (
                      <Image
                        src={image}
                        className="w-5 h-5 rounded-full"
                      />
                    )
                  }
                  <span className="font-bold">
                    {name}
                  </span>
                </div> :
                selectedData === '' ?
                  <span className="font-bold">
                    {allOptionsName}
                  </span> :
                  placeholder
              }
              {open ?
                <BiChevronUp
                  size={20}
                  className="text-slate-800 dark:text-slate-200 ml-1 -mr-1"
                /> :
                <BiChevronDown
                  size={20}
                  className="text-slate-slate dark:text-slate-200 ml-1 -mr-1"
                />
              }
            </Menu.Button>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              className="w-48 min-w-max bg-white dark:bg-black absolute z-10 rounded shadow ring-1 ring-black ring-opacity-5 focus:outline-none origin-top-left left-0 mt-2"
            >
              <div className="py-1">
                {
                  hasAllOptions &&
                  (
                    <Menu.Item
                      key={-1}
                    >
                      {({ active }) => (
                        <div
                          onClick={() => {
                            setSelectedKey('')

                            if (onSelect) {
                              onSelect('')
                            }
                          }}
                          className={`${active ? 'bg-slate-100 dark:bg-slate-900' : 'text-slate-800 dark:text-slate-200'} ${selectedKey === '' ? 'font-bold' : active ? 'font-semibold' : 'font-medium'} cursor-pointer flex items-center text-sm space-x-2 py-2 px-3`}
                        >
                          <span>
                            {allOptionsName}
                          </span>
                        </div>
                      )}
                    </Menu.Item>
                  )
                }
                {
                  (options || [])
                    .map((o, k) => (
                      <Menu.Item
                        key={k}
                      >
                        {({ active }) => (
                          <div
                            onClick={() => {
                              setSelectedKey(o.id)

                              if (onSelect) {
                                onSelect(
                                  options
                                    .find(_o =>
                                      _o?.id === o.id
                                    )
                                )
                              }
                            }}
                            className={`${active ? 'bg-slate-100 dark:bg-slate-900' : 'text-slate-800 dark:text-slate-200'} ${selectedKey === o.id ? 'font-bold' : active ? 'font-semibold' : 'font-medium'} cursor-pointer flex items-center text-sm space-x-2 py-2 px-3`}
                          >
                            {
                              o.image &&
                              (
                                <Image
                                  src={o.image}
                                  className="w-5 h-5 rounded-full"
                                />
                              )
                            }
                            <span>
                              {o.name}
                            </span>
                          </div>
                        )}
                      </Menu.Item>
                    ))
                }
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  )
}