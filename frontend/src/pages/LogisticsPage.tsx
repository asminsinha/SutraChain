import React, { useState, useEffect } from 'react';
import {
  Route,
  Truck,
  ArrowRight,
  ShieldAlert,
  Clock,
  DollarSign,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api, OptimalRoute, SupplierImpact } from '../services/api';

const WAREHOUSES = [
  { id: 'WH-01', name: 'North Hub DC (Delhi NCR)' },
  { id: 'WH-02', name: 'West Coast Gateway (Mumbai Port)' },
  { id: 'WH-03', name: 'South Peninsular Depot (Bengaluru)' },
  { id: 'WH-04', name: 'Eastern Corridor Depot (Kolkata Hub)' },
  { id: 'WH-05', name: 'Central Plains FC (Nagpur)' },
  { id: 'WH-06', name: 'Deccan Mega Storage (Hyderabad)' },
  { id: 'WH-07', name: 'Western Industrial WH (Ahmedabad)' },
  { id: 'WH-08', name: 'Southern Maritime Depository (Chennai)' },
];

const ZONES = Array.from({ length: 40 }, (_, i) => {
  const id = `ZONE-700${String(i + 1).padStart(2, '0')}`;
  const cities = [
    'New Delhi Central', 'South Delhi', 'Gurugram Tech Hub', 'Noida Sec 62', 'Chandigarh Sec 17',
    'Mumbai South', 'BKC Complex', 'Navi Mumbai Vashi', 'Pune Hinjawadi', 'Pune Kothrud',
    'Ahmedabad SG Highway', 'Surat Ring Road', 'Vadodara Alkapuri', 'Indore Vijay Nagar', 'Bhopal MP Nagar',
    'Bengaluru Whitefield', 'Bengaluru Koramangala', 'Bengaluru Electronic City', 'Mysuru Central', 'Mangaluru Port',
    'Hyderabad Hitec City', 'Hyderabad Banjara Hills', 'Secunderabad', 'Visakhapatnam', 'Vijayawada',
    'Chennai OMR', 'Chennai Anna Nagar', 'Coimbatore', 'Madurai', 'Kochi Marine Drive',
    'Kolkata Salt Lake', 'Kolkata Park Street', 'Howrah Terminal', 'Bhubaneswar', 'Ranchi',
    'Patna', 'Lucknow Hazratganj', 'Kanpur Mall Road', 'Varanasi Cantt', 'Jaipur Malviya'
  ];
  return { id, name: `${id} (${cities[i]})` };
});

const SUPPLIERS = Array.from({ length: 20 }, (_, i) => ({
  id: `VEND-${8801 + i}`,
  name: `Supplier ${i + 1} (${['Logistics Tech', 'Apex Industries', 'Precision Parts', 'TechCore', 'Nexus'][i % 5]})`,
}));

export const LogisticsPage: React.FC = () => {
  // Route Calculation State
  const [startWh, setStartWh] = useState('WH-01');
  const [destZone, setDestZone] = useState('ZONE-70001');
  const [routeResult, setRouteResult] = useState<OptimalRoute | null>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);

  // Supplier Impact State
  const [selectedSupplier, setSelectedSupplier] = useState('VEND-8801');
  const [impactResult, setImpactResult] = useState<SupplierImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const calculateOptimalRoute = async () => {
    try {
      setRouteLoading(true);
      const [opt, alt] = await Promise.all([
        api.getOptimalRoute(startWh, destZone),
        api.getAlternativeRoutes(startWh, destZone),
      ]);
      setRouteResult(opt);
      setAlternatives(alt);
    } catch (err) {
      console.error('Route calculation error:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  const analyzeSupplier = async () => {
    try {
      setImpactLoading(true);
      const data = await api.getSupplierImpact(selectedSupplier);
      setImpactResult(data);
    } catch (err) {
      console.error('Supplier impact error:', err);
    } finally {
      setImpactLoading(false);
    }
  };

  useEffect(() => {
    calculateOptimalRoute();
    analyzeSupplier();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white dark:text-white light:text-slate-900">
          Logistics Routing & Supply Impact Intelligence
        </h2>
        <p className="text-xs text-slate-400">
          Powered by Neo4j Dijkstra shortest-path algorithms and multi-hop cascading impact graph traversals.
        </p>
      </div>

      {/* SECTION 1: OPTIMAL ROUTE FINDER (GRAPH ALGORITHM 1) */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm space-y-6">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
          <div className="p-2 rounded-lg bg-sky-600/20 text-sky-400">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-100">
              Shortest Path & Freight Optimization Engine
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates hops, transit distance (km), transit time (hours), and estimated freight cost ($).
            </p>
          </div>
        </div>

        {/* Origin & Destination Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase mb-1">
              Source Origin Warehouse
            </label>
            <select
              value={startWh}
              onChange={(e) => setStartWh(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
            >
              {WAREHOUSES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.id} - {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase mb-1">
              Destination Delivery Zone
            </label>
            <select
              value={destZone}
              onChange={(e) => setDestZone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={calculateOptimalRoute}
            disabled={routeLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition shadow-md shadow-sky-600/20 flex items-center justify-center space-x-2"
          >
            {routeLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Computing Dijkstra Path...</span>
              </>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                <span>Calculate Optimal Path</span>
              </>
            )}
          </button>
        </div>

        {/* Route Outcome Display */}
        {routeResult && (
          <div className="space-y-4 pt-2">
            {/* Metric Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Hops</span>
                <div className="text-2xl font-bold text-sky-400">{routeResult.total_hops} Hops</div>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Distance</span>
                <div className="text-2xl font-bold text-slate-100">{routeResult.total_distance_km} km</div>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Transit Time</span>
                <div className="text-2xl font-bold text-amber-400">{routeResult.estimated_transit_hours} hrs</div>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Freight Cost</span>
                <div className="text-2xl font-bold text-emerald-400">${routeResult.estimated_shipping_cost.toFixed(2)}</div>
              </div>
            </div>

            {/* Step-by-Step Path Sequence */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Step-by-Step Logistics Corridors
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {routeResult.path_nodes.map((node, index) => (
                  <React.Fragment key={node.id}>
                    <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          node.label === 'Warehouse'
                            ? 'bg-amber-400'
                            : node.label === 'TransitHub'
                            ? 'bg-purple-400'
                            : 'bg-rose-400'
                        }`}
                      />
                      <div>
                        <div className="font-mono font-bold text-sky-400">{node.id}</div>
                        <div className="text-[11px] text-slate-300">{node.name}</div>
                      </div>
                    </div>

                    {index < routeResult.path_nodes.length - 1 && (
                      <div className="flex flex-col items-center px-1 text-slate-500 font-mono text-[10px]">
                        <ChevronRight className="w-4 h-4 text-sky-400" />
                        <span>
                          {routeResult.path_edges[index]?.dist_km}km · ${routeResult.path_edges[index]?.cost}
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Alternative Routes Comparison */}
            {alternatives.length > 1 && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Alternative Bounded Routes ({alternatives.length})
                </div>
                <div className="border border-slate-800 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Route Option</th>
                        <th className="p-2.5">Corridor Sequence</th>
                        <th className="p-2.5 text-center">Hops</th>
                        <th className="p-2.5 text-right">Distance</th>
                        <th className="p-2.5 text-right">Transit Time</th>
                        <th className="p-2.5 text-right">Freight Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {alternatives.map((alt, idx) => (
                        <tr key={idx} className={idx === 0 ? 'bg-sky-950/20' : ''}>
                          <td className="p-2.5 font-semibold text-sky-400">
                            {idx === 0 ? 'Optimal (Shortest)' : `Alternative ${idx + 1}`}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-300">
                            {alt.path_nodes?.map((n: any) => n.id).join(' ➔ ')}
                          </td>
                          <td className="p-2.5 text-center font-bold">{alt.hops}</td>
                          <td className="p-2.5 text-right text-slate-300">{alt.total_distance_km} km</td>
                          <td className="p-2.5 text-right text-amber-400">{alt.estimated_transit_hours} hrs</td>
                          <td className="p-2.5 text-right text-emerald-400 font-bold">${alt.estimated_shipping_cost?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: SUPPLIER CASCADING IMPACT ANALYZER (GRAPH ALGORITHM 2) */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm space-y-6">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
          <div className="p-2 rounded-lg bg-rose-600/20 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-100">
              Supplier Failure & Cascading Impact Analysis
            </h3>
            <p className="text-xs text-slate-400">
              Simulates supplier disruption by traversing (Supplier) ➔ [:SUPPLIES] ➔ (Product) ➔ [:STOCKED_AT] ➔ (Warehouse) ➔ (RetailerZone).
            </p>
          </div>
        </div>

        {/* Supplier Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <label className="block text-slate-400 text-xs font-semibold uppercase mb-1">
              Select Supplier to Simulate Disruption
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
            >
              {SUPPLIERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} - {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={analyzeSupplier}
            disabled={impactLoading}
            className="py-2.5 px-6 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-md shadow-rose-600/20 self-end"
          >
            {impactLoading ? 'Analyzing...' : 'Simulate Failure Impact'}
          </button>
        </div>

        {/* Impact Results */}
        {impactResult && (
          <div className="space-y-4 pt-2">
            {/* Impact Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Supplied Products</span>
                <div className="text-2xl font-bold text-sky-400 mt-1">
                  {impactResult.supplied_products_count} Items
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Direct commercial SKUs at risk</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Affected Regional Warehouses</span>
                <div className="text-2xl font-bold text-amber-400 mt-1">
                  {impactResult.affected_warehouses_count} Warehouses
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Inventories dependent on this supplier</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Downstream Zones Impacted</span>
                <div className="text-2xl font-bold text-rose-400 mt-1">
                  {impactResult.downstream_retailer_zones_count} Delivery Zones
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">End-customer fulfillment territories</div>
              </div>
            </div>

            {/* Affected Entities Lists */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Products */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-semibold text-slate-200 mb-2">Direct Supplied Products:</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {impactResult.supplied_products.map((p) => (
                    <div key={p.id} className="p-1.5 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="font-mono text-sky-400">{p.id}</span>
                      <span className="text-slate-300 truncate max-w-[120px]">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warehouses */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-semibold text-slate-200 mb-2">Impacted Warehouses:</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {impactResult.affected_warehouses.map((w) => (
                    <div key={w.id} className="p-1.5 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="font-mono text-amber-400 font-bold">{w.id}</span>
                      <span className="text-slate-300 truncate max-w-[120px]">{w.city || w.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Zones */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-semibold text-slate-200 mb-2">Downstream Delivery Territories:</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {impactResult.downstream_retailer_zones.map((z) => (
                    <div key={z.id} className="p-1.5 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="font-mono text-rose-400">{z.id}</span>
                      <span className="text-slate-300 truncate max-w-[120px]">{z.city || z.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
