import { useCallback } from 'react'

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

export const useLinkCanvasObject = (selectedNode, theme) => useCallback(
  (value, ctx, globalScale) => drawLinkCanvasObject(value, ctx, globalScale, selectedNode, theme),
  [selectedNode, theme],
)