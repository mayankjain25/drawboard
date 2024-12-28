import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil, Eraser, Move } from 'lucide-react';

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
  const [touchMode, setTouchMode] = useState('draw');
  const containerRef = useRef(null);
  const lastDrawnPoint = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef(null);
  
  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];

  const drawGrid = (ctx) => {
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = 0; x < CANVAS_SIZE; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_SIZE);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y < CANVAS_SIZE; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_SIZE, y);
      ctx.stroke();
    }
  };

  const clearCanvas = () => {
    const newChunks = new Map(chunks);
    newChunks.forEach((chunk) => {
      const ctx = chunk.canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      drawGrid(ctx); // Redraw grid after clearing
    });
    setChunks(newChunks);
  };

  const initChunk = (chunkX, chunkY) => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw grid
    drawGrid(ctx);

    return {
      canvas,
      x: chunkX * CANVAS_SIZE,
      y: chunkY * CANVAS_SIZE,
    };
  };

  const getChunkCoords = (x, y) => ({
    chunkX: Math.floor(x / CANVAS_SIZE),
    chunkY: Math.floor(y / CANVAS_SIZE),
  });

  const getChunkKey = (chunkX, chunkY) => `${chunkX},${chunkY}`;

  const ensureChunk = useCallback((chunkX, chunkY) => {
    const key = getChunkKey(chunkX, chunkY);
    if (!chunks.has(key)) {
      const newChunks = new Map(chunks);
      newChunks.set(key, initChunk(chunkX, chunkY));
      setChunks(newChunks);
    }
  }, [chunks]);

  const draw = useCallback((currentX, currentY) => {
    if (!isDrawing) return;

    const { chunkX: startChunkX, chunkY: startChunkY } = getChunkCoords(lastDrawnPoint.current.x, lastDrawnPoint.current.y);
    const { chunkX: endChunkX, chunkY: endChunkY } = getChunkCoords(currentX, currentY);

    ensureChunk(startChunkX, startChunkY);
    ensureChunk(endChunkX, endChunkY);

    chunks.forEach(chunk => {
      if ((lastDrawnPoint.current.x >= chunk.x && lastDrawnPoint.current.x <= chunk.x + CANVAS_SIZE &&
          lastDrawnPoint.current.y >= chunk.y && lastDrawnPoint.current.y <= chunk.y + CANVAS_SIZE) ||
          (currentX >= chunk.x && currentX <= chunk.x + CANVAS_SIZE &&
          currentY >= chunk.y && currentY <= chunk.y + CANVAS_SIZE)) {
        const ctx = chunk.canvas.getContext('2d', { alpha: false });
        ctx.beginPath();
        ctx.moveTo(lastDrawnPoint.current.x - chunk.x, lastDrawnPoint.current.y - chunk.y);
        ctx.lineTo(currentX - chunk.x, currentY - chunk.y);
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = tool === 'eraser' ? 20 : 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    });

    lastDrawnPoint.current = { x: currentX, y: currentY };
  }, [chunks, tool, color, isDrawing, ensureChunk]);

  const handleDrawMove = useCallback((x, y) => {
    if (!isDrawing) return;
    
    cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = requestAnimationFrame(() => {
      draw(x, y);
    });
  }, [draw, isDrawing]);

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
  }, [viewport, ensureChunk]);

  useEffect(() => {
    loadChunksAroundViewport();
  }, [viewport, loadChunksAroundViewport]);

  const handleMouseDown = (e) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return;
    }

    if (e.button === 0) {
      if (touchMode === 'pan') {
        setIsPanning(true);
        setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      } else {
        const x = e.clientX - viewport.x;
        const y = e.clientY - viewport.y;
        setIsDrawing(true);
        lastDrawnPoint.current = { x, y };
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setViewport({ x: dx, y: dy });
      return;
    }

    if (isDrawing && touchMode === 'draw') {
      const currentX = e.clientX - viewport.x;
      const currentY = e.clientY - viewport.y;
      handleDrawMove(currentX, currentY);
    }
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    
    if (touchMode === 'draw') {
      const pos = {
        x: touch.clientX - viewport.x,
        y: touch.clientY - viewport.y
      };
      setIsDrawing(true);
      lastDrawnPoint.current = pos;
    } else {
      setIsPanning(true);
      setPanStart({ 
        x: touch.clientX - viewport.x,
        y: touch.clientY - viewport.y
      });
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    
    if (touchMode === 'draw' && isDrawing) {
      const currentX = touch.clientX - viewport.x;
      const currentY = touch.clientY - viewport.y;
      handleDrawMove(currentX, currentY);
    } else if (touchMode === 'pan' && isPanning) {
      const dx = touch.clientX - panStart.x;
      const dy = touch.clientY - panStart.y;
      setViewport({ x: dx, y: dy });
    }
  };

  // ... (rest of the component remains the same, including render method)

  return (
    // ... (keep the existing JSX)
  );
};

export default DrawingApp;