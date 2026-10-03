"use client";

import { Rnd } from 'react-rnd';
import { Trash2, ImageIcon } from 'lucide-react';
import type { Block } from '@/lib/builder-types';
import { cn } from '@/lib/utils';

interface CanvasBlockProps {
  block: Block;
  canvasWidth: number;
  canvasHeight: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Block>) => void;
  onDelete: () => void;
  onPickImage: () => void;
}

export function CanvasBlock({
  block,
  canvasWidth,
  canvasHeight,
  selected,
  onSelect,
  onChange,
  onDelete,
  onPickImage,
}: CanvasBlockProps) {
  return (
    <Rnd
      bounds="parent"
      size={{
        width: (block.width / 100) * canvasWidth,
        height: (block.height / 100) * canvasHeight,
      }}
      position={{
        x: (block.x / 100) * canvasWidth,
        y: (block.y / 100) * canvasHeight,
      }}
      onDragStop={(_e, d) => {
        onChange({
          x: (d.x / canvasWidth) * 100,
          y: (d.y / canvasHeight) * 100,
        });
      }}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        onChange({
          width: (ref.offsetWidth / canvasWidth) * 100,
          height: (ref.offsetHeight / canvasHeight) * 100,
          x: (pos.x / canvasWidth) * 100,
          y: (pos.y / canvasHeight) * 100,
        });
      }}
      onMouseDown={onSelect}
      style={{ zIndex: block.zIndex }}
      className={cn('group border-2 border-transparent', selected && 'border-primary')}
    >
      {selected && (
        <div className="absolute -top-8 right-0 flex gap-1 z-10">
          {block.type === 'image' && (
            <button
              type="button"
              onClick={onPickImage}
              className="bg-primary text-primary-foreground rounded p-1"
              title="Choose image"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="bg-destructive text-destructive-foreground rounded p-1"
            title="Delete block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {block.type === 'text' ? (
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onChange({ content: e.currentTarget.textContent || '' })}
          style={{
            fontSize: block.fontSize ?? 16,
            textAlign: block.textAlign ?? 'left',
            color: block.color ?? '#222222',
          }}
          className="w-full h-full overflow-auto outline-none whitespace-pre-wrap p-1"
        >
          {block.content}
        </div>
      ) : (
        <div className="w-full h-full overflow-hidden relative" onDoubleClick={onPickImage}>
          {block.content ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.content}
              alt={block.alt || ''}
              style={{ borderRadius: `${block.borderRadius ?? 0}px` }}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground text-center px-2">
              Double-click to pick an image
            </div>
          )}
        </div>
      )}
    </Rnd>
  );
}
