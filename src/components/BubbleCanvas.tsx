import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { HelpCircle, Maximize2, MousePointer2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { useBubbleStore } from '@/stores/bubbleStore'
import type { Bubble, BubbleRelation } from '@/stores/bubbleStore'

const DEFAULT_BUBBLE_COLOR = '#94a3b8'
const CONTRADICTION_MARKER_RADIUS = 13

function hexToRgba(hex: string | undefined, alpha: number) {
  const normalized = (hex || DEFAULT_BUBBLE_COLOR).replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized
  const safeValue = /^[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_BUBBLE_COLOR.replace('#', '')
  const r = parseInt(safeValue.slice(0, 2), 16)
  const g = parseInt(safeValue.slice(2, 4), 16)
  const b = parseInt(safeValue.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function BubbleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    bubbles,
    relations,
    extensions,
    activeBubbleId,
    selectedBubbleIds,
    setActiveBubble,
    setSelectedBubbleIds,
    toggleSelectedBubble,
    clearSelectedBubbles,
    moveBubble,
    viewport,
    setViewport,
    filterTag,
    canvasMode,
  } = useBubbleStore()

  const [dragging, setDragging] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [showZoomMenu, setShowZoomMenu] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ w: typeof window !== 'undefined' ? window.innerWidth : 1000, h: typeof window !== 'undefined' ? window.innerHeight : 800 })
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
  const animRef = useRef<number>(0)
  const selectedIds = useMemo(() => new Set(selectedBubbleIds), [selectedBubbleIds])

  const filteredBubbles = filterTag === '__untagged__'
    ? bubbles.filter((b) => !b.tag)
    : filterTag
    ? bubbles.filter((b) => b.tag === filterTag)
    : bubbles

  const filteredRelations = relations.filter(
    (r) => filteredBubbles.some((b) => b.id === r.sourceId) && filteredBubbles.some((b) => b.id === r.targetId)
  )

  const worldToScreen = useCallback(
    (wx: number, wy: number) => ({
      x: (wx - viewport.x) * viewport.zoom + canvasSize.w / 2,
      y: (wy - viewport.y) * viewport.zoom + canvasSize.h / 2,
    }),
    [viewport, canvasSize]
  )

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - canvasSize.w / 2) / viewport.zoom + viewport.x,
      y: (sy - canvasSize.h / 2) / viewport.zoom + viewport.y,
    }),
    [viewport, canvasSize]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setCanvasSize({ w: width, h: height })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.w * dpr
    canvas.height = canvasSize.h * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#fff8f6'
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

    // 绘制点状工作区背景
    ctx.fillStyle = 'rgba(142, 112, 106, 0.2)'
    const dotSize = Math.max(0.7, 1.15 * viewport.zoom)
    const dotGap = 18 * viewport.zoom
    const offsetX = (-viewport.x * viewport.zoom + canvasSize.w / 2) % dotGap
    const offsetY = (-viewport.y * viewport.zoom + canvasSize.h / 2) % dotGap
    for (let x = offsetX; x < canvasSize.w; x += dotGap) {
      for (let y = offsetY; y < canvasSize.h; y += dotGap) {
        ctx.beginPath()
        ctx.arc(x, y, dotSize, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 绘制关系线
    filteredRelations.forEach((rel) => {
      const source = filteredBubbles.find((b) => b.id === rel.sourceId)
      const target = filteredBubbles.find((b) => b.id === rel.targetId)
      if (!source || !target) return

      const sp = worldToScreen(source.x, source.y)
      const tp = worldToScreen(target.x, target.y)
      const isContradictory = rel.type === 'contradictory'

      ctx.save()
      ctx.beginPath()
      ctx.setLineDash(isContradictory ? [10, 5] : [6, 4])
      ctx.strokeStyle = isContradictory ? 'rgba(236, 34, 20, 0.88)' : rel.type === 'duplicate' ? 'rgba(92, 89, 119, 0.4)' : 'rgba(79, 91, 213, 0.32)'
      ctx.lineWidth = isContradictory ? 3.4 : 2
      if (isContradictory) {
        ctx.shadowColor = 'rgba(236, 34, 20, 0.35)'
        ctx.shadowBlur = 12
      }
      ctx.moveTo(sp.x, sp.y)
      ctx.lineTo(tp.x, tp.y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      if (isContradictory) {
        const markerX = (sp.x + tp.x) / 2
        const markerY = (sp.y + tp.y) / 2

        ctx.save()
        ctx.beginPath()
        ctx.arc(markerX, markerY, CONTRADICTION_MARKER_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(236, 34, 20, 0.48)'
        ctx.lineWidth = 1.4
        ctx.stroke()

        ctx.font = '900 17px "Inter", "Noto Sans SC", sans-serif'
        ctx.fillStyle = '#e02617'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('!', markerX, markerY + 0.5)
        ctx.restore()
      }
    })

    // 绘制气泡
    filteredBubbles.forEach((bubble) => {
      if (!bubble) return
      const pos = worldToScreen(bubble.x || 0, bubble.y || 0)
      if (isNaN(pos.x) || isNaN(pos.y)) return

      const isSelected = bubble.id === activeBubbleId
      const isDragging = bubble.id === dragging
      const isInSelection = selectedIds.has(bubble.id)
      const bubbleExts = extensions.filter((e) => e.bubbleId === bubble.id)
      const bubbleColor = bubble.color || DEFAULT_BUBBLE_COLOR

      ctx.save()
      ctx.translate(pos.x, pos.y)

      const fontSize = 13 * viewport.zoom
      ctx.font = `${fontSize}px "Inter", "Noto Sans SC", sans-serif`
      const padding = 16 * viewport.zoom
      const maxBubbleWidth = 360 * viewport.zoom
      const minBubbleWidth = 164 * viewport.zoom
      const maxTextWidth = maxBubbleWidth - padding * 2
      const textLines: string[] = []
      let currentLine = ''
      const chars = Array.from(bubble.content)
      for (const char of chars) {
        const nextLine = currentLine + char
        if (ctx.measureText(nextLine).width <= maxTextWidth || currentLine.length === 0) {
          currentLine = nextLine
        } else {
          textLines.push(currentLine)
          currentLine = char
        }
        if (textLines.length === 2) break
      }
      if (textLines.length < 2 && currentLine) textLines.push(currentLine)
      const consumedLength = textLines.join('').length
      if (consumedLength < chars.length && textLines.length > 0) {
        let lastLine = textLines[textLines.length - 1]
        while (ctx.measureText(`${lastLine}...`).width > maxTextWidth && lastLine.length > 0) {
          lastLine = lastLine.slice(0, -1)
        }
        textLines[textLines.length - 1] = `${lastLine}...`
      }
      const widestLine = Math.max(...textLines.map((line) => ctx.measureText(line).width), minBubbleWidth - padding * 2)
      const bubbleWidth = Math.min(Math.max(widestLine + padding * 2, minBubbleWidth), maxBubbleWidth)
      let bubbleHeight = (textLines.length > 1 ? 58 : 42) * viewport.zoom

      if (bubbleExts.length > 0) {
        bubbleHeight += bubbleExts.length * 14 * viewport.zoom + 4 * viewport.zoom
      }

      const radius = 16 * viewport.zoom

      if (isSelected || isDragging || isInSelection) {
        ctx.shadowColor = hexToRgba(bubbleColor, 0.18)
        ctx.shadowBlur = 22
      }

      // 兼容性更好的圆角矩形绘制
      const x = -bubbleWidth / 2
      const y = -bubbleHeight / 2
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + bubbleWidth - radius, y)
      ctx.quadraticCurveTo(x + bubbleWidth, y, x + bubbleWidth, y + radius)
      ctx.lineTo(x + bubbleWidth, y + bubbleHeight - radius)
      ctx.quadraticCurveTo(x + bubbleWidth, y + bubbleHeight, x + bubbleWidth - radius, y + bubbleHeight)
      ctx.lineTo(x + radius, y + bubbleHeight)
      ctx.quadraticCurveTo(x, y + bubbleHeight, x, y + bubbleHeight - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()

      const gradient = ctx.createLinearGradient(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth / 2, bubbleHeight / 2)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.96)')
      gradient.addColorStop(1, 'rgba(255, 248, 246, 0.92)')
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.save()
      ctx.clip()
      const markerWidth = 24 * viewport.zoom
      const markerHeight = 8 * viewport.zoom
      const markerX = x + 13 * viewport.zoom
      const markerY = y + 10 * viewport.zoom
      const markerRadius = markerHeight / 2
      ctx.beginPath()
      ctx.moveTo(markerX + markerRadius, markerY)
      ctx.lineTo(markerX + markerWidth - markerRadius, markerY)
      ctx.quadraticCurveTo(markerX + markerWidth, markerY, markerX + markerWidth, markerY + markerRadius)
      ctx.lineTo(markerX + markerWidth, markerY + markerHeight - markerRadius)
      ctx.quadraticCurveTo(markerX + markerWidth, markerY + markerHeight, markerX + markerWidth - markerRadius, markerY + markerHeight)
      ctx.lineTo(markerX + markerRadius, markerY + markerHeight)
      ctx.quadraticCurveTo(markerX, markerY + markerHeight, markerX, markerY + markerHeight - markerRadius)
      ctx.lineTo(markerX, markerY + markerRadius)
      ctx.quadraticCurveTo(markerX, markerY, markerX + markerRadius, markerY)
      ctx.closePath()
      ctx.fillStyle = hexToRgba(bubbleColor, isSelected ? 0.64 : 0.46)
      ctx.fill()
      ctx.restore()

      if (isInSelection) {
        ctx.strokeStyle = hexToRgba(bubbleColor, 0.78)
        ctx.lineWidth = 2.4
      } else {
        ctx.strokeStyle = isSelected ? hexToRgba(bubbleColor, 0.82) : hexToRgba(bubbleColor, 0.34)
        ctx.lineWidth = isSelected ? 2.4 : 1.4
      }
      ctx.stroke()

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      ctx.fillStyle = '#261815'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const firstLineY = textLines.length > 1 ? -bubbleHeight / 2 + 20 * viewport.zoom : 0
      textLines.forEach((line, index) => {
        ctx.fillText(line, 0, firstLineY + index * 18 * viewport.zoom)
      })

      if (bubble.tag) {
        const tagFontSize = 9 * viewport.zoom
        ctx.font = `${tagFontSize}px "JetBrains Mono", monospace`
        const tagWidth = ctx.measureText(bubble.tag).width + 8 * viewport.zoom
        const tagHeight = 14 * viewport.zoom
        const tagX = -tagWidth / 2
        const tagY = -bubbleHeight / 2 - tagHeight - 2 * viewport.zoom
        const tr = 4 * viewport.zoom

        ctx.beginPath()
        ctx.moveTo(tagX + tr, tagY)
        ctx.lineTo(tagX + tagWidth - tr, tagY)
        ctx.quadraticCurveTo(tagX + tagWidth, tagY, tagX + tagWidth, tagY + tr)
        ctx.lineTo(tagX + tagWidth, tagY + tagHeight - tr)
        ctx.quadraticCurveTo(tagX + tagWidth, tagY + tagHeight, tagX + tagWidth - tr, tagY + tagHeight)
        ctx.lineTo(tagX + tr, tagY + tagHeight)
        ctx.quadraticCurveTo(tagX, tagY + tagHeight, tagX, tagY + tagHeight - tr)
        ctx.lineTo(tagX, tagY + tr)
        ctx.quadraticCurveTo(tagX, tagY, tagX + tr, tagY)
        ctx.closePath()

        ctx.fillStyle = hexToRgba(bubbleColor, 0.14)
        ctx.fill()
        ctx.strokeStyle = hexToRgba(bubbleColor, 0.32)
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = bubbleColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(bubble.tag, 0, tagY + tagHeight / 2)
      }

      if (bubbleExts.length > 0) {
        const extFontSize = 10 * viewport.zoom
        ctx.font = `${extFontSize}px "Inter", sans-serif`
        ctx.fillStyle = '#8e706a'
        ctx.textAlign = 'left'
        const extStartY = -bubbleHeight / 2 + (textLines.length > 1 ? 56 : 36) * viewport.zoom
        bubbleExts.forEach((ext, idx) => {
          let extText = ext.content
          const maxExtWidth = bubbleWidth - padding * 1.5
          if (ctx.measureText(extText).width > maxExtWidth) {
            while (ctx.measureText(extText + '...').width > maxExtWidth && extText.length > 0) {
              extText = extText.slice(0, -1)
            }
            extText += '...'
          }
          ctx.fillText(`↳ ${extText}`, -bubbleWidth / 2 + padding * 0.75, extStartY + idx * 14 * viewport.zoom)
        })
      }

      ctx.restore()
    })

    if (selectionBox) {
      const sx = Math.min(selectionBox.startX, selectionBox.endX)
      const sy = Math.min(selectionBox.startY, selectionBox.endY)
      const sw = Math.abs(selectionBox.endX - selectionBox.startX)
      const sh = Math.abs(selectionBox.endY - selectionBox.startY)

      ctx.beginPath()
      ctx.rect(sx, sy, sw, sh)
      ctx.fillStyle = 'rgba(255, 180, 163, 0.12)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(217, 35, 15, 0.42)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }

    animRef.current = requestAnimationFrame(drawCanvas)
  }, [filteredBubbles, filteredRelations, extensions, activeBubbleId, selectedIds, viewport, canvasSize, dragging, worldToScreen, selectionBox])

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawCanvas)
    return () => cancelAnimationFrame(animRef.current)
  }, [drawCanvas])

  const findBubbleAt = useCallback(
    (sx: number, sy: number): Bubble | null => {
      const world = screenToWorld(sx, sy)
      for (let i = filteredBubbles.length - 1; i >= 0; i--) {
        const b = filteredBubbles[i]
        const fontSize = 13
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) continue
        ctx.font = `${fontSize}px "Inter", "Noto Sans SC", sans-serif`
        const textWidth = ctx.measureText(b.content).width
        const padding = 16
        const bw = Math.min(Math.max(textWidth + padding * 2, 164), 360) / 2
        const bh = 42

        if (Math.abs(world.x - b.x) < bw && Math.abs(world.y - b.y) < bh) {
          return b
        }
      }
      return null
    },
    [filteredBubbles, screenToWorld]
  )

  const findContradictionMarkerAt = useCallback(
    (sx: number, sy: number): BubbleRelation | null => {
      for (let i = filteredRelations.length - 1; i >= 0; i--) {
        const relation = filteredRelations[i]
        if (relation.type !== 'contradictory') continue

        const source = filteredBubbles.find((bubble) => bubble.id === relation.sourceId)
        const target = filteredBubbles.find((bubble) => bubble.id === relation.targetId)
        if (!source || !target) continue

        const sourcePosition = worldToScreen(source.x, source.y)
        const targetPosition = worldToScreen(target.x, target.y)
        const markerX = (sourcePosition.x + targetPosition.x) / 2
        const markerY = (sourcePosition.y + targetPosition.y) / 2

        if (Math.hypot(sx - markerX, sy - markerY) <= CONTRADICTION_MARKER_RADIUS + 5) {
          return relation
        }
      }
      return null
    },
    [filteredBubbles, filteredRelations, worldToScreen],
  )

  const selectSingleBubbleContext = useCallback((id: string) => {
    setActiveBubble(id)
  }, [setActiveBubble])

  const clearBubbleContext = useCallback(() => {
    clearSelectedBubbles()
  }, [clearSelectedBubbles])

  const focusRelationPair = useCallback((sourceId: string, targetId: string) => {
    const source = filteredBubbles.find((bubble) => bubble.id === sourceId)
    const target = filteredBubbles.find((bubble) => bubble.id === targetId)
    if (!source || !target) return

    const pair = [sourceId, targetId]
    const minX = Math.min(source.x, target.x)
    const maxX = Math.max(source.x, target.x)
    const minY = Math.min(source.y, target.y)
    const maxY = Math.max(source.y, target.y)
    const width = Math.max(maxX - minX, 180)
    const height = Math.max(maxY - minY, 120)
    const zoom = Math.min(2.4, Math.max(0.45, Math.min(
      canvasSize.w / (width + 360),
      canvasSize.h / (height + 260),
    )))

    setSelectedBubbleIds(pair)
    setActiveBubble(sourceId, { includeInSelection: false })
    setViewport({
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      zoom,
    })
  }, [canvasSize, filteredBubbles, setActiveBubble, setSelectedBubbleIds, setViewport])

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    const contradictionMarker = findContradictionMarkerAt(sx, sy)
    if (contradictionMarker) {
      focusRelationPair(contradictionMarker.sourceId, contradictionMarker.targetId)
      return
    }

    const bubbleUnderPointer = findBubbleAt(sx, sy)

    if (canvasMode === 'pan' && bubbleUnderPointer) {
      selectSingleBubbleContext(bubbleUnderPointer.id)
      return
    }

    if (canvasMode === 'pan') {
      setPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    if (canvasMode === 'edit') {
      const bubble = bubbleUnderPointer
      if (bubble) {
        selectSingleBubbleContext(bubble.id)
        setDragging(bubble.id)
      } else {
        clearBubbleContext()
      }
      return
    }

    if (canvasMode === 'select') {
      const bubble = bubbleUnderPointer
      if (bubble) {
        toggleSelectedBubble(bubble.id)
      } else {
        setSelectionBox({ startX: sx, startY: sy, endX: sx, endY: sy })
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    if (panning) {
      const dx = (e.clientX - panStart.x) / viewport.zoom
      const dy = (e.clientY - panStart.y) / viewport.zoom
      setViewport({ x: viewport.x - dx, y: viewport.y - dy })
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    if (dragging) {
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const world = screenToWorld(sx, sy)
      moveBubble(dragging, world.x, world.y)
      return
    }

    if (selectionBox) {
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      setSelectionBox((prev) => prev ? { ...prev, endX: sx, endY: sy } : null)
    }
  }

  const handleMouseUp = () => {
    if (selectionBox) {
      const sx1 = Math.min(selectionBox.startX, selectionBox.endX)
      const sy1 = Math.min(selectionBox.startY, selectionBox.endY)
      const sx2 = Math.max(selectionBox.startX, selectionBox.endX)
      const sy2 = Math.max(selectionBox.startY, selectionBox.endY)

      if (Math.abs(sx2 - sx1) > 5 && Math.abs(sy2 - sy1) > 5) {
        const newSelected = new Set(selectedIds)
        filteredBubbles.forEach((b) => {
          const pos = worldToScreen(b.x, b.y)
          if (pos.x >= sx1 && pos.x <= sx2 && pos.y >= sy1 && pos.y <= sy2) {
            newSelected.add(b.id)
          }
        })
        const nextSelectedIds = Array.from(newSelected)
        setSelectedBubbleIds(nextSelectedIds)
        if (newSelected.size > 0 && (!activeBubbleId || !newSelected.has(activeBubbleId))) {
          const nextActiveId = newSelected.values().next().value as string | undefined
          if (nextActiveId) setActiveBubble(nextActiveId, { includeInSelection: false })
        }
      }
      setSelectionBox(null)
    }

    setDragging(null)
    setPanning(false)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const bubble = findBubbleAt(sx, sy)
    if (bubble) {
      setActiveBubble(bubble.id)
    }
  }

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.3, Math.min(3, viewport.zoom * delta))
    setViewport({ zoom: newZoom })
  }, [viewport.zoom, setViewport])

  const updateZoom = useCallback((nextZoom: number) => {
    setViewport({ zoom: Math.max(0.3, Math.min(3, nextZoom)) })
  }, [setViewport])

  const zoomIn = useCallback(() => updateZoom(viewport.zoom * 1.15), [updateZoom, viewport.zoom])
  const zoomOut = useCallback(() => updateZoom(viewport.zoom / 1.15), [updateZoom, viewport.zoom])
  const resetZoom = useCallback(() => setViewport({ zoom: 1 }), [setViewport])

  const fitBubbles = useCallback((ids?: Set<string>) => {
    const targetBubbles = ids && ids.size > 0
      ? filteredBubbles.filter((bubble) => ids.has(bubble.id))
      : filteredBubbles
    if (targetBubbles.length === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 })
      return
    }

    const xs = targetBubbles.map((bubble) => bubble.x)
    const ys = targetBubbles.map((bubble) => bubble.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const width = Math.max(maxX - minX, 180)
    const height = Math.max(maxY - minY, 120)
    const zoom = Math.min(2.4, Math.max(0.35, Math.min(
      canvasSize.w / (width + 360),
      canvasSize.h / (height + 260),
    )))

    setViewport({
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      zoom,
    })
  }, [canvasSize, filteredBubbles, setViewport])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'v' || e.key === 'V') useBubbleStore.getState().setCanvasMode('pan')
      if (e.key === 'e' || e.key === 'E') useBubbleStore.getState().setCanvasMode('edit')
      if (e.key === 's' || e.key === 'S') useBubbleStore.getState().setCanvasMode('select')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const cursorMap = {
    pan: 'cursor-grab',
    edit: 'cursor-default',
    select: 'cursor-crosshair',
  }

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${panning ? 'cursor-grabbing' : cursorMap[canvasMode]}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: canvasSize.w, height: canvasSize.h }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />

      <div className="absolute bottom-4 left-4 z-[70]">
        {showZoomMenu && (
          <div className="absolute bottom-[34px] left-0 z-[70] w-[224px] overflow-hidden rounded-[28px] rounded-bl-[20px] floating-window p-2 animate-bubble-in">
            {[
              { label: '放大', shortcut: '⌘ +', icon: ZoomIn, action: zoomIn, disabled: false },
              { label: '缩小', shortcut: '⌘ -', icon: ZoomOut, action: zoomOut, disabled: false },
              { label: '回到 100%', shortcut: '⇧ 0', icon: RotateCcw, action: resetZoom, disabled: false },
              { label: '适配全部', shortcut: '⇧ 1', icon: Maximize2, action: () => fitBubbles(), disabled: filteredBubbles.length === 0 },
              { label: '适配选区', shortcut: '⇧ 2', icon: MousePointer2, action: () => fitBubbles(selectedIds), disabled: selectedIds.size === 0 },
            ].map(({ label, shortcut, icon: Icon, action, disabled }) => (
              <button
                key={label}
                onClick={() => {
                  if (disabled) return
                  action()
                  setShowZoomMenu(false)
                }}
                disabled={disabled}
                className="flex h-10 w-full items-center gap-3 rounded-2xl px-3 text-left text-[13px] font-semibold text-on-surface transition-all hover:bg-primary-fixed/38 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon size={15} className="text-primary" />
                <span className="flex-1">{label}</span>
                <span className="font-mono text-[12px] text-outline">{shortcut}</span>
              </button>
            ))}
          </div>
        )}

        <div className="floating-window flex h-9 items-center gap-1 rounded-full p-0.5">
          <button
            onClick={() => setShowZoomMenu((value) => !value)}
            className={`flex h-7 min-w-[62px] items-center justify-center rounded-full px-2.5 text-[12px] font-semibold transition-all ${
              showZoomMenu
                ? 'bg-primary text-on-primary shadow-glow-primary'
                : 'bg-white/32 text-on-surface hover:bg-primary-fixed/38 hover:text-primary'
            }`}
            title="缩放控制"
          >
            {(viewport.zoom * 100).toFixed(0)}%
          </button>

          <div className="flex h-7 items-center gap-1.5 rounded-full bg-white/24 px-2.5 text-[11px] font-semibold text-on-surface-variant ring-1 ring-white/30">
            <span>气泡</span>
            <span className="text-on-surface">{filteredBubbles.length}</span>
            {canvasMode === 'select' && selectedIds.size > 0 && (
              <>
                <span className="h-3 w-px bg-outline-variant/60" />
                <span>已选</span>
                <span className="text-primary">{selectedIds.size}</span>
              </>
            )}
          </div>

          <span className="h-4 w-px bg-white/45" />

          <button
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/24 text-on-surface-variant transition-all hover:bg-primary-fixed/38 hover:text-primary"
            title="画布帮助"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
