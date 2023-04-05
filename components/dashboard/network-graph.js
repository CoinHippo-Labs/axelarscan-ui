import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { ColorRing } from 'react-loader-spinner'

import { getChain } from '../../lib/object/chain'
import { number_format, equalsIgnoreCase, loader_color } from '../../lib/utils'

export default (
  {
    id = `network-graph_${moment().valueOf()}`,
    transfers,
    gmps,
  },
) => {
  const {
    preferences,
    evm_chains,
    cosmos_chains,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    cosmos_chains_data,
  } = { ...cosmos_chains }

  const [rendered, setRendered] = useState(null)
  const [graph, setGraph] = useState(null)

  useEffect(
    () => {
      import('@antv/g6')
        .then(G6 => {
          if (rendered && !graph) {
            setGraph(
              new G6.Graph(
                {
                  container: id,
                  width: 800,
                  height: 600,
                  fitView: true,
                  fitViewPadding: [0, 33, 0, 0],
                  fitCenter: true,
                  layout: {
                    type: 'concentric',
                    preventOverlap: true,
                    clockwise: false,
                  },
                  defaultNode: {
                    size: 64,
                  },
                  defaultEdge: {
                    labelCfg: {
                      autoRotate: true,
                    },
                  },
                  modes: {
                    default: [
                      'drag-canvas',
                      'drag-node',
                    ],
                  },
                  plugins: [],
                },
              )
            )
          }
          else {
            setRendered(true)
          }
        })
    },
    [rendered],
  )

  useEffect(
    () => {
      if (transfers && gmps && graph) {
        const nodes = []
        let edges = []

        const labelCfg = {
          style: {
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            fontSize: 16,
            fontWeight: 500,
            fill: theme === 'dark' ? '#fff' : '#000',
          },
        }

        data
          .forEach(d => {
            ['source', 'destination']
              .forEach(x => {
                const id = d[`${x}_chain`]
                const chain_data = d[`${x}_chain_data`]

                if (id && nodes.findIndex(n => equalsIgnoreCase(n?.id, id)) < 0) {
                  const {
                    name,
                    image,
                  } = { ...chain_data }

                  const is_axelarnet = equalsIgnoreCase(id, axelarnet.id)

                  nodes.push(
                    {
                      id,
                      size: is_axelarnet ? 80 : 64,
                      type: 'image',
                      img: image,
                      label: name,
                      labelCfg,
                      clipCfg: {
                        show: true,
                        type: 'circle',
                        r: is_axelarnet ? 40 : 32,
                      },
                      style: {
                        fill: theme === 'dark' ? '#000' : '#fff',
                      },
                    }
                  )
                }
              })

            const {
              id,
              source_chain,
              destination_chain,
              num_txs,
            } = { ...d }

            edges.push(
              {
                d,
                id,
                source: source_chain,
                target: destination_chain,
                type: 'circle-running',
                label: `${number_format(num_txs, num_txs > 1000000 ? '0,0.00a' : '0,0')}`,
                labelCfg: {
                  style: {
                    ...labelCfg.style,
                    fontSize: 12,
                    textBaseline: 'bottom',
                  },
                },
                curveOffset: 36,
                style: {
                  stroke: theme === 'dark' ? '#333' : '#ddd',
                },
              }
            )
          })

        import('@antv/g6')
          .then(G6 => {
            G6.registerEdge(
              'circle-running',
              {
                afterDraw(
                  cfg,
                  group,
                ) {
                  const shape = _.head(group.get('children'))
                  const start_point = shape.getPoint(0)

                  const {
                    x,
                    y,
                  } = { ...start_point }

                  const {
                    color,
                  } = { ...cfg?.d?.source_chain_data }

                  const circle =
                    group.addShape(
                      'circle',
                      {
                        attrs: {
                          x,
                          y,
                          fill: color || '#3b82f6',
                          r: 3.5,
                        },
                        name: 'circle-shape',
                      },
                    )

                  circle.animate(
                    ratio => {
                      const tmp_point = shape.getPoint(ratio)

                      const {
                        x,
                        y,
                      } = { ...tmp_point }

                      return {
                        x,
                        y,
                      }
                    },
                    {
                      repeat: true,
                      duration: 3000,
                    },
                  )
                },
              },
              'quadratic',
            )

            graph.data(
              {
                nodes,
                edges,
              }
            )

            graph.render()
          })
      }
    },
    [theme, transfers, gmps, graph],
  )

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
  const axelarnet = getChain('axelarnet', chains_data)

  let data =
    transfers && gmps ?
      _.orderBy(
        Object.entries(
          _.groupBy(
            _.concat(transfers, gmps)
              .flatMap(d => {
                let {
                  source_chain,
                  destination_chain,
                } = { ...d }

                if (['osmosis'].findIndex(c => source_chain?.startsWith(c)) > -1) {
                  source_chain = _.head(source_chain.split('-'))
                }

                if (['osmosis'].findIndex(c => destination_chain?.startsWith(c)) > -1) {
                  destination_chain = _.head(destination_chain.split('-'))
                }

                if (axelarnet?.id && ![source_chain, destination_chain].includes(axelarnet.id)) {
                  return [
                    {
                      ...d,
                      id: `${axelarnet.id}_${destination_chain}`,
                      source_chain: axelarnet.id,
                      source_chain_data: axelarnet,
                    },
                    {
                      ...d,
                      id: `${source_chain}_${axelarnet.id}`,
                      destination_chain: axelarnet.id,
                      destination_chain_data: axelarnet,
                    },
                  ]
                }
                else {
                  return d
                }
              }),
            'id',
          ),
        )
        .map(([k, v]) => {
          return {
            id: k,
            ..._.head(v),
            num_txs: _.sumBy(v, 'num_txs'),
            volume: _.sumBy(v, 'volume'),
          }
        }),
        ['num_txs'],
        ['desc'],
      ) :
      undefined

  if (data && axelarnet) {
    chains_data
      .filter(c =>
        c &&
        (!c.maintainer_id || !c.no_inflation) &&
        !equalsIgnoreCase(c.id, axelarnet.id)
      )
      .forEach(c => {
        const {
          id,
        } = { ...c }

        const ids = [`${id}_${axelarnet.id}`, `${axelarnet.id}_${id}`]

        ids
          .forEach((_id, i) => {
            if (data.findIndex(_d => equalsIgnoreCase(_d?.id, _id)) < 0) {
              const source_chain = i === 0 ? id : axelarnet.id
              const destination_chain = i === 0 ? axelarnet.id : id

              data.push(
                {
                  id: _id,
                  source_chain,
                  source_chain_data: getChain(source_chain, chains_data),
                  destination_chain,
                  destination_chain_data: getChain(destination_chain, chains_data),
                  num_txs: 0,
                }
              )
            }
          })
      })
  }

  return (
    <div className="w-full min-h-full">
      <div
        id={id}
        className={`${data?.length > 0 ? 'flex' : 'hidden'} items-center justify-center`}
      />
      {
        !data &&
        (
          <div className="h-120 flex items-center justify-center">
            <ColorRing
              color={loader_color(theme)}
              width="60"
              height="60"
            />
          </div>
        )
      }
    </div>
  )
}