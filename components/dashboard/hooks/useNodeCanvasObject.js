import { useCallback } from 'react'

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

export const useNodeCanvasObject = (selectedNode, links, images, theme) => useCallback(
  (node, ctx, globalScale) => drawNodeCanvasObject(node, ctx, globalScale, selectedNode, links, images, theme),
  [selectedNode, links, images, theme],
)