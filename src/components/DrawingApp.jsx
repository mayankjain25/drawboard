import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Eraser } from 'lucide-react';

const CANVAS_SIZE = 2000;
const CHUNK_LOAD_THRESHOLD = 500;

const DrawingApp = () => {
  const [chunks, setChunks] = useState(new Map());
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  
  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];

  // Previous chunk management functions remain the same
  const getChunkCoords = (x, y) => ({
    chunkX: Math.floor(x / CANVAS_SIZE),
    chunkY: Math.floor(y / CANVAS_SIZE),
  });

  const getChunkKey = (chunkX, chunkY) => `${chunkX},${chunkY}`;

  const initChunk = (chunkX, chunkY) => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    for (let x = 0; x < CANVAS_SIZE; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_SIZE);
      ctx.stroke();
    }
    
    for (let y = 0; y < CANVAS_SIZE; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_SIZE, y);
      ctx.stroke();
    }

    return {
      canvas,
      x: chunkX * CANVAS_SIZE,
      y: chunkY * CANVAS_SIZE,
    };
  };

  const ensureChunk = (chunkX, chunkY) => {
    const key = getChunkKey(chunkX, chunkY);
    if (!chunks.has(key)) {
      const newChunks = new Map(chunks);
      newChunks.set(key, initChunk(chunkX, chunkY));
      setChunks(newChunks);
    }
  };

  const loadChunksAroundViewport = () => {
    const visibleChunks = getChunkCoords(-viewport.x, -viewport.y);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const chunksX = Math.ceil(viewportWidth / CANVAS_SIZE) + 2;
    const chunksY = Math.ceil(viewportHeight / CANVAS_SIZE) + 2;
    
    for (let x = -1; x < chunksX; x++) {
      for (let y = -1; y < chunksY; y++) {
        ensureChunk(visibleChunks.chunkX + x, visibleChunks.chunkY + y);
      }
    }
  };

  useEffect(() => {
    loadChunksAroundViewport();
  }, [viewport]);

  // Handle mouse events for both drawing and panning
  const handleMouseDown = (e) => {
    // Middle mouse button (button 1)
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return;
    }

    // Left mouse button (button 0) for drawing
    if (e.button === 0 && !isPanning) {
      const x = e.clientX - viewport.x;
      const y = e.clientY - viewport.y;
      setIsDrawing(true);
      setPosition({ x, y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setViewport({ x: dx, y: dy });
      return;
    }

    if (isDrawing) {
      const currentX = e.clientX - viewport.x;
      const currentY = e.clientY - viewport.y;

      const { chunkX: startChunkX, chunkY: startChunkY } = getChunkCoords(position.x, position.y);
      const { chunkX: endChunkX, chunkY: endChunkY } = getChunkCoords(currentX, currentY);

      ensureChunk(startChunkX, startChunkY);
      ensureChunk(endChunkX, endChunkY);

      chunks.forEach(chunk => {
        if (position.x >= chunk.x && position.x <= chunk.x + CANVAS_SIZE &&
            position.y >= chunk.y && position.y <= chunk.y + CANVAS_SIZE ||
            currentX >= chunk.x && currentX <= chunk.x + CANVAS_SIZE &&
            currentY >= chunk.y && currentY <= chunk.y + CANVAS_SIZE) {
          const ctx = chunk.canvas.getContext('2d');
          ctx.beginPath();
          ctx.moveTo(position.x - chunk.x, position.y - chunk.y);
          ctx.lineTo(currentX - chunk.x, currentY - chunk.y);
          ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
          ctx.lineWidth = tool === 'eraser' ? 20 : 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      });

      setPosition({ x: currentX, y: currentY });
    }
  };

  const handleMouseUp = (e) => {
    if (e.button === 1) {
      setIsPanning(false);
    } else if (e.button === 0) {
      setIsDrawing(false);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setViewport(prev => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY,
    }));
  };

  // Get the appropriate cursor style
  const getCursorStyle = () => {
    if (isPanning) return 'cursor-grab';
    return 'cursor-crosshair';
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gray-100">
      {/* Toolbar */}
      <div className="fixed top-4 left-4 bg-white rounded-lg shadow-lg p-2 flex gap-2 z-50">
        <button
          className={`p-2 rounded hover:bg-blue-50 ${tool === 'pencil' ? 'bg-blue-100' : ''}`}
          onClick={() => setTool('pencil')}
        >
          <Pencil className="w-6 h-6" />
        </button>
        <button
          className={`p-2 rounded hover:bg-blue-50 ${tool === 'eraser' ? 'bg-blue-100' : ''}`}
          onClick={() => setTool('eraser')}
        >
          <Eraser className="w-6 h-6" />
        </button>
        <div className="w-px h-8 bg-gray-200 mx-2" />
        <div className="flex gap-1">
          {colors.map((c) => (
            <button
              key={c}
              className={`w-8 h-8 rounded hover:ring-2 hover:ring-blue-300 
                ${color === c ? 'ring-2 ring-blue-500' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => {
                setColor(c);
                setTool('pencil');
              }}
            />
          ))}
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className={`absolute inset-0 overflow-hidden bg-white ${getCursorStyle()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDrawing(false);
          setIsPanning(false);
        }}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
      >
        <div 
          style={{ 
            transform: `translate(${viewport.x}px, ${viewport.y}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {Array.from(chunks.values()).map(chunk => (
            <canvas
              key={`${chunk.x},${chunk.y}`}
              style={{
                position: 'absolute',
                left: `${chunk.x}px`,
                top: `${chunk.y}px`,
                pointerEvents: 'none',
              }}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              ref={node => {
                if (node) {
                  const ctx = node.getContext('2d');
                  ctx.drawImage(chunk.canvas, 0, 0);
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DrawingApp;