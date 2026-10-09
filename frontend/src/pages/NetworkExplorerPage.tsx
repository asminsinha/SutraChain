import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  Filter,
  Info,
  X,
  Layers,
  RefreshCw
} from 'lucide-react';
import { api, GraphTopology } from '../services/api';

const LABEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Supplier: { bg: '#10b981', text: '#ffffff', border: '#059669' },
  Product: { bg: '#0284c7', text: '#ffffff', border: '#0369a1' },
  Warehouse: { bg: '#f59e0b', text: '#000000', border: '#d97706' },
  TransitHub: { bg: '#8b5cf6', text: '#ffffff', border: '#7c3aed' },
  RetailerZone: { bg: '#f43f5e', text: '#ffffff', border: '#e11d48' },
};

export const NetworkExplorerPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [topology, setTopology] = useState<GraphTopology | null>(null);
  const [selectedLabel, setSelectedLabel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const data = await api.getGraphTopology({
        limit_nodes: 150,
        label_filter: selectedLabel !== 'ALL' ? selectedLabel : undefined,
      });
      setTopology(data);
    } catch (err) {
      console.error('Failed to fetch graph topology:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, [selectedLabel]);

  useEffect(() => {
    if (!containerRef.current || !topology) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: topology.elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(name)',
            'background-color': (ele: any) => LABEL_COLORS[ele.data('type')]?.bg || '#64748b',
            color: '#f8fafc',
            'font-size': '9px',
            'font-family': 'Inter, sans-serif',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            width: (ele: any) => (ele.data('type') === 'Warehouse' || ele.data('type') === 'TransitHub' ? 26 : 18),
            height: (ele: any) => (ele.data('type') === 'Warehouse' || ele.data('type') === 'TransitHub' ? 26 : 18),
            'border-width': 2,
            'border-color': (ele: any) => LABEL_COLORS[ele.data('type')]?.border || '#475569',
            'overlay-opacity': 0,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#38bdf8',
          },
        },
        {
          selector: 'node.highlighted',
          style: {
            'border-width': 3,
            'border-color': '#38bdf8',
          },
        },
        {
          selector: 'node.dimmed',
          style: {
            opacity: 0.2,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
            opacity: 0.6,
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            width: 2.5,
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            opacity: 1,
          },
        },
        {
          selector: 'edge.dimmed',
          style: {
            opacity: 0.1,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        randomize: false,
        componentSpacing: 80,
        nodeOverlap: 20,
        nodeRepulsion: () => 400000,
        edgeElasticity: () => 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 300,
      },
      minZoom: 0.2,
      maxZoom: 3.0,
      wheelSensitivity: 0.2,
    });

    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      const data = node.data();
      const connectedEdges = node.connectedEdges();
      const connectedNodes = connectedEdges.connectedNodes();

      cy.elements().removeClass('highlighted dimmed');
      cy.elements().addClass('dimmed');
      node.removeClass('dimmed').addClass('highlighted');
      connectedEdges.removeClass('dimmed').addClass('highlighted');
      connectedNodes.removeClass('dimmed').addClass('highlighted');

      // Build relationship details
      const outbound = connectedEdges.filter((e: any) => e.data('source') === data.id).map((e: any) => ({
        target: e.data('target'),
        type: e.data('label'),
        dist_km: e.data('dist_km'),
        cost: e.data('cost'),
      }));

      const inbound = connectedEdges.filter((e: any) => e.data('target') === data.id).map((e: any) => ({
        source: e.data('source'),
        type: e.data('label'),
        dist_km: e.data('dist_km'),
        cost: e.data('cost'),
      }));

      setSelectedNode({
        id: data.id,
        name: data.name,
        type: data.type,
        extra: data.extra || {},
        outbound,
        inbound,
      });
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        cy.elements().removeClass('highlighted dimmed');
        setSelectedNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [topology]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cyRef.current || !searchQuery.trim()) return;

    const term = searchQuery.trim().toLowerCase();
    const found = cyRef.current.nodes().filter((node) => {
      const d = node.data();
      return d.id.toLowerCase().includes(term) || d.name.toLowerCase().includes(term);
    });

    if (found.length > 0) {
      cyRef.current.elements().removeClass('highlighted dimmed');
      cyRef.current.elements().addClass('dimmed');
      found.removeClass('dimmed').addClass('highlighted');
      cyRef.current.animate({
        center: { eles: found },
        zoom: 1.2,
        duration: 500,
      });
      const first = found[0];
      first.emit('tap');
    }
  };

  const handleZoom = (type: 'in' | 'out' | 'fit' | 'reset') => {
    if (!cyRef.current) return;
    if (type === 'in') cyRef.current.zoom(cyRef.current.zoom() * 1.25);
    if (type === 'out') cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    if (type === 'fit') cyRef.current.fit(undefined, 30);
    if (type === 'reset') {
      cyRef.current.elements().removeClass('highlighted dimmed');
      setSelectedNode(null);
      cyRef.current.fit(undefined, 30);
    }
  };

  const labels = ['ALL', 'Supplier', 'Product', 'Warehouse', 'TransitHub', 'RetailerZone'];

  return (
    <div className="space-y-4 h-[calc(100vh-8.5rem)] flex flex-col">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white dark:text-white light:text-slate-900">
            Supply Chain Network Explorer
          </h2>
          <p className="text-xs text-slate-400">
            Interactive visualization rendered directly from live Neo4j Aura Graph ({topology?.total_nodes || 137} Nodes, {topology?.total_edges || 356} Edges).
          </p>
        </div>

        {/* Filter Labels */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          {labels.map((lbl) => (
            <button
              key={lbl}
              onClick={() => setSelectedLabel(lbl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedLabel === lbl
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Main Graph Canvas Container */}
      <div className="relative flex-1 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner flex">
        {/* Floating Canvas Action Controls */}
        <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Locate node (e.g. WH-01, VEND-8801)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-64 shadow-md backdrop-blur-sm"
            />
          </form>

          {/* Canvas Buttons */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700 rounded-lg p-1 shadow-md backdrop-blur-sm space-x-1">
            <button
              onClick={() => handleZoom('in')}
              title="Zoom In"
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              title="Zoom Out"
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom('fit')}
              title="Fit to Screen"
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom('reset')}
              title="Reset View"
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-10 p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] shadow-lg backdrop-blur-sm space-y-1.5">
          <div className="font-semibold text-slate-300 flex items-center space-x-1 mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Node Schema</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(LABEL_COLORS).map(([label, color]) => (
              <div key={label} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.bg }} />
                <span className="text-slate-300">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cytoscape Canvas */}
        <div ref={containerRef} className="w-full h-full" />

        {loading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="flex flex-col items-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
              <p className="text-xs text-slate-300 font-medium">Fetching Graph Topology from Neo4j Aura...</p>
            </div>
          </div>
        )}

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-slate-900/95 border-l border-slate-800 shadow-2xl p-5 z-20 flex flex-col justify-between overflow-y-auto backdrop-blur-md animate-fadeIn">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: LABEL_COLORS[selectedNode.type]?.bg }}
                  />
                  <h3 className="font-bold text-sm text-white">{selectedNode.type} Inspector</h3>
                </div>
                <button
                  onClick={() => {
                    cyRef.current?.elements().removeClass('highlighted dimmed');
                    setSelectedNode(null);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Node Properties */}
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Node ID</span>
                  <div className="font-mono text-sky-400 font-bold text-sm">{selectedNode.id}</div>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Name</span>
                  <div className="text-slate-100 font-medium">{selectedNode.name}</div>
                </div>

                {/* Extra Properties */}
                <div className="pt-2">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Attributes</span>
                  <div className="mt-1 p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1">
                    {Object.entries(selectedNode.extra || {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-400">{k}:</span>
                        <span className="text-slate-200">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inbound & Outbound Links */}
                <div className="pt-2 space-y-2">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">
                    Direct Connections ({selectedNode.outbound?.length + selectedNode.inbound?.length})
                  </span>

                  {selectedNode.outbound?.length > 0 && (
                    <div>
                      <div className="text-[10px] text-emerald-400 font-semibold mb-1">Outbound Relationships:</div>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {selectedNode.outbound.map((edge: any, idx: number) => (
                          <div key={idx} className="p-1.5 rounded bg-slate-950 text-[10px] font-mono text-slate-300 flex justify-between">
                            <span className="text-sky-400">➔ {edge.target}</span>
                            <span className="text-slate-400">[{edge.type}]</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedNode.inbound?.length > 0 && (
                    <div>
                      <div className="text-[10px] text-purple-400 font-semibold mb-1">Inbound Relationships:</div>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {selectedNode.inbound.map((edge: any, idx: number) => (
                          <div key={idx} className="p-1.5 rounded bg-slate-950 text-[10px] font-mono text-slate-300 flex justify-between">
                            <span className="text-purple-400">⬅ {edge.source}</span>
                            <span className="text-slate-400">[{edge.type}]</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  cyRef.current?.elements().removeClass('highlighted dimmed');
                  setSelectedNode(null);
                }}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
