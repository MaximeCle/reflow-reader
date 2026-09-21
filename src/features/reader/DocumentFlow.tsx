import { memo } from 'react'
import type { Block } from '../../lib/pdf/types'
import styles from './DocumentFlow.module.css'

interface BlockViewProps {
  block: Block
  /** Set when the block opens a new page; rendered in the margin via CSS. */
  pageMarker: number | null
  /** Skips layout of off-screen blocks on long documents. */
  virtualized: boolean
  /** First note of a run: it carries the separator rule above it. */
  opensNotes: boolean
}

/**
 * The page number is drawn from a `::after` pseudo-element: keeping it out of
 * the DOM text keeps `data-block-id` character offsets — and so bookmarks —
 * aligned with the extracted text.
 */
const BlockView = memo(function BlockView({
  block,
  pageMarker,
  virtualized,
  opensNotes,
}: BlockViewProps) {
  const attributes = {
    'data-block-id': block.id,
    'data-page-marker': pageMarker ?? undefined,
  }
  const kindClass =
    block.kind === 'heading-2'
      ? styles.heading2
      : block.kind === 'heading-3'
        ? styles.heading3
        : block.kind === 'footnote'
          ? `${styles.footnote}${opensNotes ? ` ${styles.footnoteFirst}` : ''}`
          : styles.paragraph
  const className = virtualized ? `${kindClass} ${styles.virtualized}` : kindClass

  if (block.kind === 'heading-2') {
    return (
      <h2 className={className} {...attributes}>
        {block.text}
      </h2>
    )
  }

  if (block.kind === 'heading-3') {
    return (
      <h3 className={className} {...attributes}>
        {block.text}
      </h3>
    )
  }

  return (
    <p className={className} {...attributes}>
      {block.text}
    </p>
  )
})

interface DocumentFlowProps {
  blocks: Block[]
  virtualized?: boolean
}

export function DocumentFlow({ blocks, virtualized = false }: DocumentFlowProps) {
  return (
    <>
      {blocks.map((block, index) => (
        <BlockView
          key={block.id}
          block={block}
          // Blocks run in page order, so a page starts where its number rises.
          pageMarker={block.page > (blocks[index - 1]?.page ?? 0) ? block.page : null}
          virtualized={virtualized}
          opensNotes={block.kind === 'footnote' && blocks[index - 1]?.kind !== 'footnote'}
        />
      ))}
    </>
  )
}
