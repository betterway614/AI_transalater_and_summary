import { useEffect, useRef } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { Box } from '@mui/material'

interface MindMapProps {
  markdown: string
}

const transformer = new Transformer()

export default function MindMap({ markdown }: MindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)

  useEffect(() => {
    if (!svgRef.current || !markdown) return

    const { root } = transformer.transform(markdown)

    if (!root || !root.content) return

    if (mmRef.current) {
      mmRef.current.setData(root)
      mmRef.current.fit()
    } else {
      mmRef.current = Markmap.create(svgRef.current, {
        maxWidth: 280,
        initialExpandLevel: 3,
        spacingVertical: 8,
        spacingHorizontal: 80,
        paddingX: 12
      })
      mmRef.current.setData(root)
    }

    return () => {
      // Markmap instance will be reused
    }
  }, [markdown])

  useEffect(() => {
    return () => {
      mmRef.current = null
    }
  }, [])

  return (
    <Box
      sx={{
        width: '100%',
        height: 400,
        overflow: 'hidden',
        '& svg': {
          width: '100%',
          height: '100%'
        }
      }}
    >
      <svg ref={svgRef} />
    </Box>
  )
}
