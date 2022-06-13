import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BallTriangle } from 'react-loader-spinner'
import G6 from '@antv/g6'

import { chainName, getChain } from '../../lib/object/chain'
import { number_format, equals_ignore_case, loader_color } from '../../lib/utils'

export default ({
  id = `network-graph_${moment().valueOf()}`,
  data,
}) => {
  const { preferences, cosmos_chains } = useSelector(state => ({ preferences: state.preferences, cosmos_chains: state.cosmos_chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { cosmos_chains_data } = { ...cosmos_chains }

  const [rendered, setRendered] = useState(null)
  const [graph, setGraph] = useState(null)

  useEffect(() => {
    if (rendered && !graph) {
      setGraph(new G6.Graph({
        container: id,
        width: 536,
        height: 402,
        fitView: true,
        fitViewPadding: [10, 10, 10, 10],
        fitCenter: true,
        layout: {
          type: 'radial',
          preventOverlap: true,
          linkDistance: 180,
          nodeSpacing: 16,
        },
        defaultNode: {
          size: 32,
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
      }))
    }
    else {
      setRendered(true)
    }
  }, [rendered])

  useEffect(() => {
    if (data && graph) {
      const axelar_chain_data = getChain('axelarnet', cosmos_chains_data)
      const fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
      const nodes = []
      let edges = []
      const labelCfg = {
        style: {
          fontFamily,
          fontWeight: 600,
          fill: theme === 'dark' ? '#fff' : '#000',
        },
      }
      _.orderBy(data, ['num_txs'], ['asc']).forEach(d => {
        const x = ['source', 'destination']
        x.forEach(_x => {
          const id = d?.[`${_x}_chain`], _d = d?.[`${_x}_chain_data`]
          if (nodes.findIndex(n => equals_ignore_case(n?.id, id)) < 0) {
            nodes.push({
              id,
              size: equals_ignore_case(id, axelar_chain_data?.id) ? 40 : 32,
              type: 'image',
              img: _d?.image,
              label: chainName(_d),
              labelCfg,
              style: {
                fill: theme === 'dark' ? '#000' : '#fff',
              },
            })
          }
        })
        const { id, source_chain, destination_chain, num_txs } = { ...d }
        edges.push({
          d,
          id,
          source: source_chain,
          target: destination_chain,
          type: 'circle-running',
          label: `${number_format(num_txs, num_txs >= 100000 ? '0,0.00a' : '0,0')} txs`,
          labelCfg: {
            style: {
              ...labelCfg?.style,
              fontFamily,
              fontWeight: 600,
              fontSize: 10,
              textBaseline: 'bottom',
            },
          },
          curveOffset: 28,
          style: {
            stroke: theme === 'dark' ? '#333' : '#ddd',
          },
        })
      })
      G6.registerEdge('circle-running', {
        afterDraw(cfg, group) {
          const shape = group.get('children')[0]
          const startPoint = shape.getPoint(0)
          const circle = group.addShape('circle', {
            attrs: {
              x: startPoint.x,
              y: startPoint.y,
              fill: cfg?.d?.source_chain_data?.color || '#3b82f6',
              r: 3.5,
            },
            name: 'circle-shape',
          })
          circle.animate(
            (ratio) => {
              const tmpPoint = shape.getPoint(ratio)
              return {
                x: tmpPoint.x,
                y: tmpPoint.y,
              }
            }, {
              repeat: true,
              duration: 3000,
            },
          )
        },
      }, 'quadratic')
      graph.data({
        nodes,
        edges,
      })
      graph.render()
    }
  }, [theme, data, graph])

  return (
    <div className="w-full min-h-full">
      <div
        id={id}
        className={`${data?.length > 0 ? 'flex' : 'hidden'} items-center justify-start`}
      />
      {!data && (
        <div className="w-3/4 h-100 flex items-center justify-center">
          <BallTriangle color={loader_color(theme)} width="36" height="36" />
        </div>
      )}
    </div>
  )
}