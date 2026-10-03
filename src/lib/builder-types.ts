export type BlockType = 'text' | 'image';

export interface Block {
  id: string;
  type: BlockType;
  /** Position/size as percentages of the canvas, so layout stays responsive. */
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  /** Text content for text blocks, image URL for image blocks. */
  content: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  /** Alt text for image blocks, credit line for attribution. */
  alt?: string;
  credit?: string;
  borderRadius?: number;
  /** Rotation in degrees. */
  rotation?: number;
}

export interface CanvasDoc {
  kind: 'canvas';
  title: string;
  background: string;
  blocks: Block[];
}

export const CANVAS_ASPECT_RATIO = 1200 / 1500; // width / height
