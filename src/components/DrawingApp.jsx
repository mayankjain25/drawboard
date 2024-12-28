import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Eraser } from 'lucide-react';

const DrawingApp = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to be 3x the viewport size
    canvas.width = window.innerWidth * 3;
    canvas.height = window.innerHeight * 3;

    // Center the viewport
    setViewportOffset({
      x: -window.innerWidth,
      y: -window.innerHeight
    });

    // Set initial styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const gridSize = 50;

    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setPosition({ x, y });
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : 2;
    ctx.stroke();

    setPosition({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setViewportOffset(prev => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY
    }));
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
      <div className="absolute inset-0 overflow-hidden bg-white">
        <div 
          style={{ 
            transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px)`,
            transformOrigin: '0 0'
          }}
        >
          <canvas
            ref={canvasRef}
            className="cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onWheel={handleWheel}
          />
        </div>
      </div>
    </div>
  );
};

export default DrawingApp;