import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil, Eraser, Move } from 'lucide-react';

const CANVAS_SIZE = 2000;

const DrawingApp = () => {
  const [chunks, setChunks] = useState(new Map());
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [touchMode, setTouchMode] = useState('draw'); // 'draw' or 'pan'
  const [viewport, setViewport] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const panStart = useRef({ x: 0, y: 0 });
  const [history, setHistory] = useState([]); // History of chunks
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1); // Current position in history

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];

  // const getChunkKey = (x, y) => `${x},${y}`;

  const cloneChunks = (chunksMap) => {
    const cloned = new Map();
    chunksMap.forEach((chunk, key) => {
      const clonedCanvas = document.createElement('canvas');
      clonedCanvas.width = chunk.canvas.width;
      clonedCanvas.height = chunk.canvas.height;
      clonedCanvas.getContext('2d').drawImage(chunk.canvas, 0, 0);
      cloned.set(key, { ...chunk, canvas: clonedCanvas });
    });
    return cloned;
  };

  const saveToHistory = (newChunks) => {
    const historyCopy = history.slice(0, currentHistoryIndex + 1);
    historyCopy.push(cloneChunks(newChunks));
    setHistory(historyCopy);
    setCurrentHistoryIndex(historyCopy.length - 1);
  };

  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      setChunks(cloneChunks(history[currentHistoryIndex - 1]));
      setCurrentHistoryIndex(currentHistoryIndex - 1);
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < history.length - 1) {
      setChunks(cloneChunks(history[currentHistoryIndex + 1]));
      setCurrentHistoryIndex(currentHistoryIndex + 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentHistoryIndex, history]);

  const clearCanvas = () => {
    const newChunks = new Map(chunks);
    newChunks.forEach((chunk) => {
      const ctx = chunk.canvas.getContext('2d');
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    });
    saveToHistory(newChunks);
    setChunks(newChunks);
  };

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

  const loadChunksAroundViewport = useCallback(() => {
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
  }, [chunks, viewport]);

  useEffect(() => {
    loadChunksAroundViewport();
  }, [viewport, loadChunksAroundViewport]);

  const draw = (currentX, currentY) => {
    const { chunkX: startChunkX, chunkY: startChunkY } = getChunkCoords(position.x, position.y);
    const { chunkX: endChunkX, chunkY: endChunkY } = getChunkCoords(currentX, currentY);

    ensureChunk(startChunkX, startChunkY);
    ensureChunk(endChunkX, endChunkY);

    chunks.forEach(chunk => {
      if ((position.x >= chunk.x && position.x <= chunk.x + CANVAS_SIZE &&
          position.y >= chunk.y && position.y <= chunk.y + CANVAS_SIZE) ||
          (currentX >= chunk.x && currentX <= chunk.x + CANVAS_SIZE &&
          currentY >= chunk.y && currentY <= chunk.y + CANVAS_SIZE)) {
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
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button (drawing)
      const x = e.clientX - viewport.x;
      const y = e.clientY - viewport.y;
      setIsDrawing(true);
      setPosition({ x, y });
    } else if (e.button === 1) { // Middle mouse button (pan)
      e.preventDefault();
      panStart.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
    }
  };

  const handleMouseMove = (e) => {
    if (isDrawing) {
      const currentX = e.clientX - viewport.x;
      const currentY = e.clientY - viewport.y;
      // const newChunks = cloneChunks(chunks);
      draw(currentX, currentY);
      // setChunks(newChunks);
      // setPosition({ x: e.clientX, y: e.clientY });
    }

    if (panStart.current.x !== 0 || panStart.current.y !== 0) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const newViewport = { x: dx, y: dy };
      setViewport(newViewport); // Update viewport to move canvas
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    saveToHistory(chunks)
    panStart.current = { x: 0, y: 0 }; // Reset pan position
  };

  const getTouchPos = (touch) => ({
    x: touch.clientX - viewport.x,
    y: touch.clientY - viewport.y
  });

  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touchMode === 'draw') {
      const pos = getTouchPos(touch);
      setIsDrawing(true);
      setPosition(pos);
    } else {
      panStart.current = { 
        x: touch.clientX - viewport.x,
        y: touch.clientY - viewport.y
      };
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touchMode === 'draw' && isDrawing) {
      const pos = getTouchPos(touch);
      draw(pos.x, pos.y);
    } else if (touchMode === 'pan' && panStart.current.x !== 0 && panStart.current.y !== 0) {
      const dx = touch.clientX - panStart.current.x;
      const dy = touch.clientY - panStart.current.y;
      const newViewport = { x: dx, y: dy };
      setViewport(newViewport); // Update viewport to move canvas
    }
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
    panStart.current = { x: 0, y: 0 }; // Reset pan position
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setViewport(prev => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY,
    }));
  };

  const getCursorStyle = () => {
    if (touchMode === 'pan') return 'cursor-grab';
    return 'cursor-crosshair';
  };

   return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gray-100">
      <div className="fixed top-4 left-4 bg-white rounded-lg shadow-lg p-2 flex gap-2 z-50">
        <button
          className={`p-2 rounded hover:bg-blue-50 ${touchMode === 'draw' ? 'bg-blue-100' : ''}`}
          onClick={() => setTouchMode('draw')}
        >
          <Pencil className="w-6 h-6" />
        </button>
        <button
          className={`p-2 rounded hover:bg-blue-50 ${touchMode === 'pan' ? 'bg-blue-100' : ''}`}
          onClick={() => setTouchMode('pan')}
        >
          <Move className="w-6 h-6" />
        </button>
        <div className="w-px h-8 bg-gray-200 mx-2" />
        
        {touchMode === 'draw' && (
          <>
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
          </>
        )}
        
        <div className="w-px h-8 bg-gray-200 mx-2" />
        <button 
          className="p-2 rounded hover:bg-blue-50"
          onClick={clearCanvas}
        >
          Clear
        </button>
      </div>

      <div
        className={`absolute inset-0 overflow-hidden bg-white ${getCursorStyle()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDrawing(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        ref={containerRef}
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
