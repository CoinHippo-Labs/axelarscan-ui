import dynamic from 'next/dynamic'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Card, CardBody, CardFooter, Tabs, TabsHeader, TabsBody, Tab, TabPanel, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import { BsArrowRightShort } from 'react-icons/bs'

import { useImagePreloader } from './hooks/useImagePreloader'
import { useNodeCanvasObject } from './hooks/useNodeCanvasObject'
import { useLinkCanvasObject } from './hooks/useLinkCanvasObject'
import Spinner from '../spinner'
import NumberDisplay from '../number'
import Image from '../image'
import { getChainData } from '../../lib/config'
import { toArray, numberFormat, getTitle, equalsIgnoreCase } from '../../lib/utils'

const MENUS = ['network_graph', 'tier_list']
const AXELAR = 'axelarnet'
const DEFAULT_FIELD = 'num_txs'
const MEAN = (data, field = DEFAULT_FIELD) => _.mean(toArray(data).map(d => d[field] || 0))
const SD = (data, field = DEFAULT_FIELD) => {
  data = toArray(data)
  const mean = MEAN(data, field)
  if (data.length < 1) return 0
  return Math.sqrt(_.sum(data.map(d => Math.pow((d[field] || 0) - mean, 2))) / data.length)
}
const N_SD = 0.5
const THRESHOLD = (data, n_sd = N_SD, field = DEFAULT_FIELD) => typeof n_sd !== 'number' ? 0 : MEAN(data, field) + (n_sd * SD(data, field))
const TIERS = [
  { id: 0, n_sd: N_SD, size: 56 },
  { id: 1, n_sd: 0, size: 44 },
  { id: 2, n_sd: -0.45, size: 32 },
  { id: 3, n_sd: -0.5, size: 24 },
  { id: 4, n_sd: null, size: 18 },
]
const ZOOM_MIN_VALUE = 4.33
const ZOOM_MAX_VALUE = 4.33

export default ({ id = 'network', data }) => {
  const { preferences, chains } = useSelector(state => ({ preferences: state.preferences, chains: state.chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }

  const [menu, setMenu] = useState(_.head(MENUS))
  const [rendered, setRendered] = useState(null)
  const [graph, setGraph] = useState(null)
  const [graphData, setGraphData] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)

  const graphRef = useRef()
  const ForceGraph2D = typeof window !== 'undefined' && dynamic(import('react-force-graph-2d'))

  const { nodes, edges } = { ...graphData }
  const imagesUrl = useMemo(() => toArray(nodes).map(d => d.img), [nodes])
  const images = useImagePreloader(toArray(imagesUrl))
  const imagesLoaded = chains_data && Object.keys({ ...images }).length / chains_data.length >= 0.9
  const nodeCanvasObject = useNodeCanvasObject(selectedNode, edges, images, theme)
  const linkCanvasObject = useLinkCanvasObject(selectedNode, theme)

  useEffect(
    () => {
      if (data && chains_data) {
        let _data = _.orderBy(
          Object.entries(
            _.groupBy(
              data.flatMap(d => {
                const { source_chain, destination_chain } = { ...d }
                if (![source_chain, destination_chain].includes(AXELAR)) {
                  return [[source_chain, AXELAR], [AXELAR, destination_chain]].map((ids, i) => { return { ...d, id: ids.join('_'), [i === 0 ? 'destination_chain' : 'source_chain']: AXELAR } })
                }
                return d
              }),
              'id',
            )
          )
          .map(([k, v]) => {
            return {
              id: k,
              ..._.head(v),
              num_txs: _.sumBy(v, 'num_txs'),
              volume: _.sumBy(v, 'volume'),
            }
          }),
          ['num_txs'], ['desc'],
        )
        chains_data.filter(c => (!c.maintainer_id || !c.no_inflation) && c.id !== AXELAR).forEach(c => {
          [[c.id, AXELAR], [AXELAR, c.id]].map(ids => ids.join('_')).forEach((_id, i) => {
            if (_data.findIndex(d => equalsIgnoreCase(d.id, _id)) < 0) {
              _data.push({
                id: _id,
                source_chain: i === 0 ? c.id : AXELAR,
                destination_chain: i === 0 ? AXELAR : c.id,
                num_txs: 0,
              })
            }
          })
        })

        let nodes = []
        const edges = []
        const labelCfg = {
          style: {
            fontFamily: '"Poppins", sans-serif',
            fontSize: 18,
            fontWeight: 500,
            fill: theme === 'dark' ? '#fff' : '#000',
          },
        }

        toArray(_data).forEach(d => {
          ['source', 'destination'].forEach(s => {
            const id = d[`${s}_chain`]
            if (id && nodes.findIndex(n => equalsIgnoreCase(n.id, id)) < 0) {
              const { name, image, color } = { ...getChainData(id, chains_data) }
              const size = id === AXELAR ? 80 : 64
              nodes.push({
                id,
                size,
                type: 'image',
                img: image,
                label: name,
                labelCfg,
                clipCfg: { show: true, type: 'circle', r: size / 2 },
                num_txs: _.sumBy(_data.filter(d => [d.source_chain, d.destination_chain].includes(id)), 'num_txs'),
                color,
              })
            }
          })

          const { id, source_chain, destination_chain, num_txs } = { ...d }
          const { color } = { ...getChainData(source_chain, chains_data) }
          edges.push({
            data: d,
            color,
            id,
            source: source_chain,
            target: destination_chain,
            type: 'circle-running',
            label: `${numberFormat(num_txs, '0,0.0a')}`,
            labelCfg: { style: { ...labelCfg.style, fontSize: 14, textBaseline: 'bottom' } },
            curveOffset: 32,
            style: { stroke: theme === 'dark' ? '#333' : '#ddd' },
          })
        })

        const tiers = TIERS.map(t => { return { ...t, threshold: THRESHOLD(nodes.filter(d => d.id !== AXELAR), t.n_sd) } })
        nodes = _.orderBy(nodes.map(d => { return { ...d, tier: d.id === AXELAR ? -1 : tiers.find(t => d.num_txs >= t.threshold)?.id } }), ['num_txs'], ['desc'])
        setGraphData({ nodes, edges })
      }
    },
    [data, theme, chains_data],
  )

  useEffect(
    () => {
      const fg = graphRef.current
      fg?.d3Force('link', null)
      fg?.d3Force('charge')?.strength(0)
      fg?.d3Force('center')?.strength(0)
    },
    [],
  )

  useEffect(
    () => {
      import('@antv/g6').then(G6 => {
        if (rendered && !graph) {
          try {
            setGraph(
              new G6.Graph({
                container: id,
                width: 700.26,
                height: 525.2,
                fitView: true,
                fitCenter: true,
                layout: { type: 'concentric', preventOverlap: true, clockwise: false },
                defaultNode: { size: 64 },
                defaultEdge: { labelCfg: { autoRotate: true } },
                modes: { default: ['drag-canvas', 'drag-node'] },
              })
            )
          } catch (error) {}
        }
        else if (!rendered && graphData) {
          setRendered(true)
        }
      })
    },
    [rendered, graphData],
  )

  useEffect(
    () => {
      const { nodes, edges } = { ...graphData }
      if (graph && nodes && edges) {
        import('@antv/g6').then(G6 => {
          G6.registerEdge(
            'circle-running',
            {
              afterDraw(cfg, group) {
                const shape = _.head(group.get('children'))
                const { x, y } = { ...shape.getPoint(0) }
                const { color } = { ...getChainData(cfg?.data?.source_chain, chains_data) }
                const circle = group.addShape('circle', { attrs: { x, y, fill: color, r: 3.5 }, name: 'circle-shape' })
                circle.animate(
                  ratio => {
                    const { x, y } = { ...shape.getPoint(ratio) }
                    return { x, y }
                  },
                  { repeat: true, duration: 5000 },
                )
              },
            },
            'quadratic',
          )
          graph.data({ nodes, edges })
          graph.render()
        })
      }
    },
    [graph, graphData],
  )

  const Chain = ({ value, width = 20, height = 20 }) => {
    const { image } = { ...getChainData(value, chains_data) }
    return image && (
      <Image
        src={image}
        width={width}
        height={height}
        className="rounded-full"
      />
    )
  }

  const renderTooltip = d => {
    const { id } = { ...d }
    const { name } = { ...getChainData(id, chains_data) }
    const routes = _.orderBy(toArray(edges).filter(e => [e.data.source_chain, e.data.destination_chain].includes(id)).map(e => { return { ...e, order: e.data.destination_chain === AXELAR ? 0 : 1 } }), ['order'], ['asc'])
    return (
      <div className="flex flex-col space-y-2 mt-0.5">
        <span className="font-semibold">
          {name}
        </span>
        <div className="flex flex-col space-y-3">
          {routes.map((r, i) => {
            const { data } = { ...r }
            const { source_chain, destination_chain, num_txs } = { ...data }
            return (
              <div key={i} className="space-y-2">
                <div className="flex items-center space-x-1">
                  <Chain value={source_chain} />
                  <BsArrowRightShort size={18} />
                  <Chain value={destination_chain} />
                </div>
                <NumberDisplay
                  value={num_txs}
                  format="0,0"
                  suffix=" transactions"
                  className="whitespace-nowrap text-xs"
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const render = menu => {
    const details = (
      <div className="bg-light dark:bg-dark w-fit overflow-y-auto hidden sm:block space-y-4" style={{ height: '519.66px' }}>
        {_.slice(toArray(data).filter(d => !selectedNode?.id || [d.source_chain, d.destination_chain].includes(selectedNode.id)), 0, 100).map((d, i) => {
          const { source_chain, destination_chain, num_txs, volume } = { ...d }
          const source_chain_data = getChainData(source_chain, chains_data)
          const destination_chain_data = getChainData(destination_chain, chains_data)
          return (
            <div key={i} className="bg-light dark:bg-slate-900 rounded-sm shadow flex flex-col space-y-1 mx-0.5 p-3">
              <div className="flex items-center justify-between space-x-2">
                <div className="w-fit min-w-max h-6 flex items-center text-black dark:text-white text-2xs space-x-1">
                  {source_chain_data?.image && (
                    <Image
                      src={source_chain_data.image}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  )}
                  <span className="font-semibold">
                    {source_chain_data?.name || getTitle(source_chain)}
                  </span>
                </div>
                <div className="w-full h-6 flex items-center space-x-2">
                  <div className="w-full h-1 border-t border-dashed border-slate-300 dark:border-slate-600 mt-0.5" />
                  <div className="w-fit flex items-center">
                    <div className="min-w-max">
                      <div className="block dark:hidden">
                        <Image
                          src="/logos/logo.png"
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                      </div>
                      <div className="hidden dark:block">
                        <Image
                          src="/logos/logo_white.png"
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-1 border-t border-dashed border-slate-300 dark:border-slate-600 mt-0.5" />
                </div>
                <div className="w-fit min-w-max h-6 flex items-center text-black dark:text-white text-2xs space-x-1">
                  {destination_chain_data?.image && (
                    <Image
                      src={destination_chain_data.image}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  )}
                  <span className="font-semibold">
                    {destination_chain_data?.name || getTitle(destination_chain)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between space-x-8">
                <NumberDisplay
                  value={num_txs}
                  format="0,0"
                  prefix="Transactions: "
                  className="whitespace-nowrap text-slate-600 dark:text-slate-200 text-xs font-medium"
                />
                <NumberDisplay
                  value={volume}
                  format="0,0"
                  prefix="Volume: $"
                  noTooltip={true}
                  className="whitespace-nowrap text-slate-600 dark:text-slate-200 text-xs font-medium"
                />
              </div>
            </div>
          )
        })}
      </div>
    )

    switch (menu) {
      case 'tier_list':
        return (
          graphData ?
            <div className="flex items-center justify-between mt-2">
              <Card className="card card-transparent">
                <CardBody className="p-0">
                  <div className="space-y-2 sm:space-y-4 px-4 xl:px-6">
                    <span className="uppercase text-black dark:text-white text-sm sm:text-base font-medium">
                      Top chains by activities
                    </span>
                    <div className="space-y-2 sm:space-y-6">
                      {TIERS.filter(t => nodes.filter(d => d.tier === t.id).length > 0).map((t, i) => (
                        <div key={i} className="flex flex-col space-y-2">
                          <div className="w-fit bg-blue-500 dark:bg-blue-600 rounded uppercase text-white text-xs font-medium py-1 px-2">
                            Tier: {i}
                          </div>
                          <div className="flex flex-wrap">
                            {nodes.filter(d => d.tier === t.id).map((d, j) => {
                              const { id } = { ...d }
                              const selected = equalsIgnoreCase(id, selectedNode?.id)
                              return (
                                <Tooltip key={j} content={renderTooltip(d)}>
                                  <div
                                    onClick={() => setSelectedNode(selected ? null : d)}
                                    className={`${selected ? 'border-4 border-yellow-400 rounded-full' : ''} cursor-pointer flex items-center mr-2`}
                                  >
                                    <Chain value={id} width={t.size} height={t.size} />
                                  </div>
                                </Tooltip>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardBody>
              </Card>
              {details}
            </div> :
            <div className="loading-in-network-graph">
              <Spinner name="Blocks" />
            </div>
        )
      case 'network_graph':
      default:
        const loaded = imagesLoaded && graphData && ForceGraph2D
        return (
          <div className={`${loaded ? 'flex items-center justify-center sm:justify-between' : 'loading-in-network-graph'}`}>
            {/*graphData && <div id={id} className={`${toArray(data).length > 0 ? 'flex sm:hidden items-center justify-center mt-2' : 'hidden'}`} />*/}
            {loaded ?
              <>
                <div className="hidden sm:block">
                  <ForceGraph2D
                    ref={graphRef}
                    graphData={{ nodes, links: edges }}
                    width={716.33}
                    height={520.66}
                    backgroundColor={theme === 'dark' ? '#000' : '#fff'}
                    showNavInfo={false}
                    nodeVal={node => node ? (12 - node.tier) / 2 : 0}
                    nodeCanvasObject={nodeCanvasObject}
                    linkCanvasObject={linkCanvasObject}
                    onNodeClick={node => setSelectedNode(node)}
                    onNodeHover={node => {/*setSelectedNode(node)*/}}
                    onLinkClick={() => setSelectedNode(null)}
                    onBackgroundClick={() => setSelectedNode(null)}
                    maxZoom={ZOOM_MAX_VALUE}
                    minZoom={ZOOM_MIN_VALUE}
                    cooldownTime={Infinity}
                    enableZoomInteraction={true}
                    enableNodeDrag={false}
                  />
                </div>
                <div className="mt-2">
                  {details}
                </div>
              </> :
              <Spinner name="Blocks" />
            }
          </div>
        )
    }
  }

  return (
    <Tabs value={menu} className="tabs hidden sm:block">
      <TabsHeader className="max-w-xs sm:max-w-sm ml-auto mr-auto sm:mr-0">
        {MENUS.map(m => (
          <Tab
            key={m}
            value={m}
            onClick={() => setMenu(m)}
            className="whitespace-nowrap normal-case text-xs sm:text-base"
          >
            {getTitle(m)}
          </Tab>
        ))}
      </TabsHeader>
      <TabsBody>
        {MENUS.filter(m => m === menu).map(m => (
          <TabPanel key={m} value={m} className="network-graph-tabpanel">
            {render(m)}
          </TabPanel>
        ))}
      </TabsBody>
    </Tabs>
  )
}