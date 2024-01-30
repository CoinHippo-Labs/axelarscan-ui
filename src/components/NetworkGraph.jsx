'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import _ from 'lodash'

import { Container } from '@/components/Container'
import { Spinner } from '@/components/Spinner'
import { useGlobalStore } from '@/app/providers'
import { getChainData } from '@/lib/config'
import { toArray } from '@/lib/parser'
import { equalsIgnoreCase } from '@/lib/string'
import { isNumber, toNumber, numberFormat } from '@/lib/number'

const preloadImagePromise = src => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = img.onabort = () => reject()
  img.src = src
  img.crossOrigin = 'anonymous'
})

const getImageAsync = async url => {
  try {
    return await preloadImagePromise(url)
  } catch (error) {
    return null
  }
}

const useImagePreloader = images => {
  const [imagesMap, setImagesMap] = useState({})

  useEffect(() => {
    const preloadImages = async () => {
      images.forEach(async url => {
        if (imagesMap[url]) return
        const image = await getImageAsync(url)
        if (image !== null) setImagesMap(d => ({ ...d, [url]: image }))
      })
    }
    if (images) preloadImages()
  }, [images, imagesMap])

  return imagesMap
}

const drawNode = (node, ctx, globalScale, isSelected, image) => {
  const { color, tier } = node
  let { x, y } = node
  if (x === undefined || y === undefined) return

  const radius = (12 - tier) / 2
  const fillStyleOpecity = isSelected ? '1a' : '0d'

  if (color && isSelected) {
    ctx.strokeStyle = color
    ctx.fillStyle = `${color}${fillStyleOpecity}`
    ctx.beginPath()
    ctx.lineWidth = 4 / globalScale

    const animatedPos = node.__animatedPos
    if (animatedPos && animatedPos.length > 0) {
      const coord = animatedPos.splice(0, 1)
      node.__animatedPos = animatedPos
      node.x = x = coord[0].x
      node.y = y = coord[0].y
    }

    ctx.arc(x, y, radius, 0, 2 * Math.PI, false)
    ctx.closePath()
    ctx.stroke()
    ctx.fill()
    ctx.shadowColor = color
    ctx.shadowBlur = 16 * globalScale
  }
  else {
    ctx.shadowColor = null
    ctx.shadowBlur = null
  }

  if (image) {
    const logoRadius = radius - 0.5
    ctx.drawImage(image, x - logoRadius, y - logoRadius, logoRadius * 2, logoRadius * 2)
  }
}

const drawTitle = (node, ctx, isSelected, theme) => {
  const fontSize = 2
  const { x, y, label, tier } = node
  if (x === undefined || y === undefined) return

  const radius = (12 - tier + fontSize) / 2
  const textColor = theme === 'dark' ? isSelected ? '#fff' : '#ddd' : isSelected ? '#000' : '#222'

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${isSelected ? '600' : '400'} ${fontSize}px Poppins`
  ctx.fillStyle = textColor
  ctx.fillText(label, x, y + radius)
}

const drawNodeCanvasObject = (node, ctx, globalScale, selectedNode, links, images, theme) => {
  if (!node || node.x === undefined || node.y === undefined) return
  const { img } = node
  const isSelected = node.id === selectedNode?.id
  drawNode(node, ctx, globalScale, isSelected, images?.[img])
  drawTitle(node, ctx, isSelected, theme)
}

const useNodeCanvasObject = (selectedNode, links, images, theme) => useCallback(
  (node, ctx, globalScale) => drawNodeCanvasObject(node, ctx, globalScale, selectedNode, links, images, theme),
  [selectedNode, links, images, theme],
)

const COMET_SPEED = 0.0033
const COMET_LENGTH = 3

const drawLine = (link, ctx, scale, isSelected, theme) => {
  if (typeof link.source === 'string' || typeof link.target === 'string') return
  if (link.source.x != null && link.source.y != null && link.target.x != null && link.target.y != null) {
    ctx.lineWidth = 0.5 / scale
    ctx.strokeStyle = theme === 'dark' ? isSelected ? '#f5f5f5' : '#252525' : isSelected ? '#454545' : '#e5e5e5'
    ctx.beginPath()
    ctx.moveTo(link.source.x, link.source.y)
    ctx.lineTo(link.target.x, link.target.y)
    ctx.stroke()
  }
}

const calculateAndDrawComet = (ctx, targetX, sourceX, targetY, sourceY, commetProgress, color, theme) => {
  const diffX = targetX - sourceX
  const diffY = targetY - sourceY
  const distance = Math.sqrt(diffX * diffX + diffY * diffY)

  const endProgress = commetProgress - COMET_LENGTH / distance
  const cometEndProgress = endProgress > 0 ? endProgress : 0
  const cometStartX = sourceX + diffX * commetProgress || 0
  const cometStartY = sourceY + diffY * commetProgress || 0
  const cometEndX = sourceX + diffX * cometEndProgress || 0
  const cometEndY = sourceY + diffY * cometEndProgress || 0

  const gradient = ctx.createLinearGradient(cometStartX, cometStartY, cometEndX, cometEndY)
  gradient.addColorStop(0, `${color || (theme === 'dark' ? '#f5f5f5' : '#151515')}ff`)
  gradient.addColorStop(1, `${color || (theme === 'dark' ? '#f5f5f5' : '#151515')}00`)

  ctx.strokeStyle = gradient
  ctx.beginPath()
  ctx.moveTo(cometStartX, cometStartY)
  ctx.lineTo(cometEndX, cometEndY)
  ctx.stroke()
}

const drawCommet = (link, ctx, theme) => {
  if (typeof link.source === 'string' || typeof link.target === 'string') return
  const { x: sourceX, y: sourceY } = link.source
  const { x: targetX, y: targetY } = link.target
  if (sourceX === undefined || sourceY === undefined || targetX === undefined || targetY === undefined) return

  const comet = link.__comet || { __progress: 0 }
  comet.__progress += COMET_SPEED
  if (comet.__progress >= 1) {
    link.__comet = undefined
    return
  }

  const { color } = { ...link }
  calculateAndDrawComet(ctx, targetX, sourceX, targetY, sourceY, comet.__progress, color, theme)
  link.__comet = comet
}

const drawLinkCanvasObject = (link, ctx, scale, selectedNode, theme) => {
  if (!link) return
  drawLine(link, ctx, scale, [link.source?.id, link.target?.id].includes(selectedNode?.id), theme)
  drawCommet(link, ctx, theme)
}

const useLinkCanvasObject = (selectedNode, theme) => useCallback(
  (value, ctx, globalScale) => drawLinkCanvasObject(value, ctx, globalScale, selectedNode, theme),
  [selectedNode, theme],
)

const N_SD = 0.15
const TIERS = [
  { id: 1, n_sd: N_SD, size: 44 },
  { id: 2, n_sd: -0.475, size: 32 },
  { id: 3, n_sd: null, size: 18 },
]

const MEAN = (data, field = 'num_txs') => _.mean(toArray(data).map(d => toNumber(d[field])))

const SD = (data, field = 'num_txs') => {
  data = toArray(data)
  if (data.length === 0) return 0
  return Math.sqrt(_.sum(data.map(d => Math.pow(toNumber(d[field]) - MEAN(data, field), 2))) / data.length)
}

const THRESHOLD = (data, n_sd = N_SD, field = 'num_txs') => !isNumber(n_sd) ? 0 : MEAN(data, field) + (n_sd * SD(data, field))

export function NetworkGraph({ data }) {
  if (!data) return null

  const graphRef = useRef()
  const ForceGraph2D = typeof window !== 'undefined' && dynamic(import('react-force-graph-2d'))
  const [graphData, setGraphData] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const { resolvedTheme } = useTheme()
  const { chains } = useGlobalStore()

  useEffect(() => {
    const fg = graphRef.current
    if (fg) {
      fg.d3Force('link', null)
      fg.d3Force('charge')?.strength(0)
      fg.d3Force('center')?.strength(0)
    }
  }, [])

  useEffect(() => {
    if (data && chains) {
      const AXELAR = 'axelarnet'

      const _data = _.orderBy(Object.entries(_.groupBy(data.flatMap(d => {
        if ([d.sourceChain, d.destinationChain].includes(AXELAR)) return d
        return [[d.sourceChain, AXELAR], [AXELAR, d.destinationChain]].map((ids, i) => ({ ...d, id: ids.join('_'), [i === 0 ? 'destinationChain' : 'sourceChain']: AXELAR }))
      }), 'id')).map(([k, v]) => ({ id: k, ..._.head(v), num_txs: _.sumBy(v, 'num_txs'), volume: _.sumBy(v, 'volume') })), ['num_txs'], ['desc'])

      chains.filter(d => (!d.maintainer_id || !d.no_inflation) && d.id !== AXELAR).forEach(d => {
        [[d.id, AXELAR], [AXELAR, d.id]].map(ids => ids.join('_')).forEach((id, i) => {
          if (_data.findIndex(d => equalsIgnoreCase(d.id, id)) < 0) {
            _data.push({ id, sourceChain: i === 0 ? d.id : AXELAR, destinationChain: i === 0 ? AXELAR : d.id, num_txs: 0 })
          }
        })
      })

      let nodes = []
      const edges = []
      const labelCfg = { style: { fontFamily: '"Poppins", sans-serif', fontSize: 18, fontWeight: 500, fill: resolvedTheme === 'dark' ? '#fff' : '#000' } }

      toArray(_data).forEach(d => {
        ['source', 'destination'].forEach(s => {
          const id = d[`${s}Chain`]

          if (id && nodes.findIndex(n => equalsIgnoreCase(n.id, id)) < 0) {
            const { name, image, color } = { ...getChainData(id, chains) }
            const size = id === AXELAR ? 80 : 64

            nodes.push({
              id, size, type: 'image', img: image, label: name, labelCfg, color,
              clipCfg: { show: true, type: 'circle', r: size / 2 },
              num_txs: _.sumBy(_data.filter(d => [d.sourceChain, d.destinationChain].includes(id)), 'num_txs'),              
            })
          }
        })

        const { color } = { ...getChainData(d.sourceChain, chains) }
        edges.push({
          data: d, color, id: d.id, source: d.sourceChain, target: d.destinationChain,
          label: numberFormat(d.num_txs, '0,0.0a'), labelCfg: { style: { ...labelCfg.style, fontSize: 14, textBaseline: 'bottom' } },
          curveOffset: 32,
          style: { stroke: resolvedTheme === 'dark' ? '#333' : '#ddd' },
        })
      })

      const tiers = TIERS.map(d => ({ ...d, threshold: THRESHOLD(nodes.filter(d => d.id !== AXELAR), d.n_sd) }))
      nodes = _.orderBy(nodes.map(d => ({ ...d, tier: d.id === AXELAR ? -1 : tiers.find(t => t.threshold <= d.num_txs)?.id })), ['num_txs'], ['desc'])

      setGraphData({ nodes, edges })
    }
  }, [data, resolvedTheme, chains, setGraphData])

  const { nodes, edges } = { ...graphData }
  const imagesUrl = useMemo(() => toArray(nodes).map(d => d.img), [nodes])
  const images = useImagePreloader(toArray(imagesUrl))
  const imagesLoaded = chains && Object.keys({ ...images }).length / chains.length >= 0.75
  const nodeCanvasObject = useNodeCanvasObject(selectedNode, edges, images, resolvedTheme)
  const linkCanvasObject = useLinkCanvasObject(selectedNode, resolvedTheme)

  return (
    <Container className="sm:mt-8">
      {!data || !(imagesLoaded && ForceGraph2D && graphData) ? <Spinner /> :
        <div className="flex items-center justify-center sm:justify-between gap-x-4">
          <ForceGraph2D
            ref={graphRef}
            graphData={{ nodes, links: edges }}
            width={716.33}
            height={520.66}
            backgroundColor={resolvedTheme === 'dark' ? '#000' : '#fff'}
            showNavInfo={false}
            nodeVal={node => node ? (12 - node.tier) / 2 : 0}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={node => setSelectedNode(node)}
            onLinkClick={() => setSelectedNode(null)}
            onBackgroundClick={() => setSelectedNode(null)}
            maxZoom={4.33}
            minZoom={4.33}
            cooldownTime={Infinity}
            enableZoomInteraction={true}
            enableNodeDrag={false}
          />
        </div>
      }
    </Container>
  )
}
