import type { CSSProperties } from 'react';
import type { Block } from '@/lib/builder-types';

interface BlockRendererProps {
  block: Block;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  const style: CSSProperties = {
    position: 'absolute',
    left: `${block.x}%`,
    top: `${block.y}%`,
    width: `${block.width}%`,
    height: `${block.height}%`,
    zIndex: block.zIndex,
  };

  if (block.type === 'image') {
    return (
      <div style={style} className="overflow-hidden">
        {block.content ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.content}
            alt={block.alt || ''}
            style={{ borderRadius: `${block.borderRadius ?? 0}px` }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
            No image selected
          </div>
        )}
        {block.credit && (
          <span className="absolute bottom-1 right-1 text-[9px] px-1 rounded bg-black/40 text-white/80">
            {block.credit}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        ...style,
        fontSize: block.fontSize ?? 16,
        textAlign: block.textAlign ?? 'left',
        color: block.color ?? '#222222',
      }}
      className="whitespace-pre-wrap overflow-hidden"
    >
      {block.content}
    </div>
  );
}
