import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Info, Play, Pause } from "lucide-react";
import SimulatorCanvas from "./SimulatorCanvas";
import { SYSTEMS, ORGAN_INFO, defaultLayerOpacity } from "./engine/anatomyData";

const SimulatorPage = () => {
  const [layers, setLayers] = useState({
    skin: true,
    skeleton: true,
    organs: true,
    circulatory: true,
  });

  const [opacities, setOpacities] = useState({
    skin: defaultLayerOpacity("skin"),
    skeleton: defaultLayerOpacity("skeleton"),
    organs: defaultLayerOpacity("organs"),
    circulatory: defaultLayerOpacity("circulatory"),
  });

  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  
  const [selectedOrgan, setSelectedOrgan] = useState(null);
  const [hoveredOrgan, setHoveredOrgan] = useState(null);

  const toggleLayer = (layer) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleOpacityChange = (layer, val) => {
    setOpacities((prev) => ({ ...prev, [layer]: parseFloat(val) }));
    if (parseFloat(val) > 0 && !layers[layer]) {
      setLayers((prev) => ({ ...prev, [layer]: true }));
    }
  };

  const organList = Object.entries(ORGAN_INFO).map(([id, info]) => ({ id, ...info }));

  return (
    <div className="flex w-full h-[100vh] bg-[#0a0a0a] text-white overflow-hidden relative font-sans">
      
      {/* Sidebar for Layers and Organs */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col z-10 shrink-0">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <Link
            to="/biology"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-300" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-emerald-400 leading-tight">Odam Tanasi</h1>
            <p className="text-xs text-zinc-400">Interaktiv 3D Atlas</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Tizimlar (Layers) */}
          <section>
            <h2 className="text-xs uppercase font-bold text-zinc-500 mb-3 tracking-wider">Tizimlar</h2>
            <div className="space-y-3">
              {Object.entries(SYSTEMS).map(([id, sys]) => (
                <div key={id} className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sys.color }} />
                      <span className="text-sm font-medium">{sys.short}</span>
                    </div>
                    <button 
                      onClick={() => toggleLayer(id)}
                      className={`p-1.5 rounded-md transition-colors ${layers[id] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-500'}`}
                    >
                      {layers[id] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.05"
                    value={opacities[id]}
                    onChange={(e) => handleOpacityChange(id, e.target.value)}
                    className="w-full accent-emerald-500"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Organlar */}
          <section>
            <h2 className="text-xs uppercase font-bold text-zinc-500 mb-3 tracking-wider">Organlar</h2>
            <div className="grid grid-cols-2 gap-2">
              {organList.map((organ) => (
                <button
                  key={organ.id}
                  onClick={() => setSelectedOrgan(organ.id === selectedOrgan ? null : organ.id)}
                  onMouseEnter={() => setHoveredOrgan(organ.id)}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  className={`text-left p-2 rounded-lg border transition-all text-xs ${
                    selectedOrgan === organ.id 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' 
                    : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {organ.name}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <SimulatorCanvas 
          speed={speed}
          paused={paused}
          selectedOrgan={selectedOrgan}
          hoveredOrgan={hoveredOrgan}
          opacities={opacities}
          layers={layers}
        />
        
        {/* Controls Overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl">
          <button 
            onClick={() => setPaused(!paused)} 
            className="flex items-center gap-2 text-sm font-medium hover:text-emerald-400 transition-colors"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {paused ? 'Harakatni davom etish' : 'Harakatni to\'xtatish'}
          </button>
          <div className="w-px h-6 bg-zinc-700"></div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 uppercase font-bold">Tezlik</span>
            <input 
              type="range" 
              min="0.25" max="2" step="0.25"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-24 accent-emerald-500"
            />
            <span className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded">{speed}x</span>
          </div>
        </div>

        {/* Selected Organ Info Panel */}
        {selectedOrgan && ORGAN_INFO[selectedOrgan] && (
          <div className="absolute top-6 right-6 w-72 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl p-5 shadow-2xl animate-in slide-in-from-right-8">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-white">{ORGAN_INFO[selectedOrgan].name}</h3>
              <div 
                className="w-3 h-3 rounded-full mt-1.5 shadow-sm" 
                style={{ backgroundColor: ORGAN_INFO[selectedOrgan].color }}
              />
            </div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">
              {ORGAN_INFO[selectedOrgan].system}
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed mb-4">
              {ORGAN_INFO[selectedOrgan].summary}
            </p>
            <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20 flex gap-3">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                {ORGAN_INFO[selectedOrgan].fact}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulatorPage;
