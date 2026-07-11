import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IMMUNO_MARKERS, IF_MARKERS, DETECTION_KITS, ImmunoMarkerInfo, DetectionKitInfo } from '@/data/immunoMarkers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageTip from '@/components/PageTip';

const ImmunoManual = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('ihc');
  const [search, setSearch] = useState('');
  const [filterPanel, setFilterPanel] = useState('all');
  const [selectedMarker, setSelectedMarker] = useState<ImmunoMarkerInfo | null>(null);
  const [selectedKit, setSelectedKit] = useState<DetectionKitInfo | null>(null);

  const ihcPanels = useMemo(() => {
    const p = new Set<string>();
    IMMUNO_MARKERS.forEach(m => { if (m.panel) p.add(m.panel); });
    return Array.from(p).sort();
  }, []);

  const ifPanels = useMemo(() => {
    const p = new Set<string>();
    IF_MARKERS.forEach(m => { if (m.panel) p.add(m.panel); });
    return Array.from(p).sort();
  }, []);

  const panels = tab === 'ihc' ? ihcPanels : ifPanels;

  const filteredIHCMarkers = useMemo(() => {
    let list = IMMUNO_MARKERS;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(s) ||
        m.fullName.toLowerCase().includes(s) ||
        m.function.toLowerCase().includes(s) ||
        (m.panel || '').toLowerCase().includes(s)
      );
    }
    if (filterPanel !== 'all') {
      list = list.filter(m => m.panel === filterPanel);
    }
    return list;
  }, [search, filterPanel]);

  const filteredIFMarkers = useMemo(() => {
    let list = IF_MARKERS;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(s) ||
        m.fullName.toLowerCase().includes(s) ||
        m.function.toLowerCase().includes(s) ||
        (m.panel || '').toLowerCase().includes(s)
      );
    }
    if (filterPanel !== 'all') {
      list = list.filter(m => m.panel === filterPanel);
    }
    return list;
  }, [search, filterPanel]);

  const filteredKits = useMemo(() => {
    if (!search) return DETECTION_KITS;
    const s = search.toLowerCase();
    return DETECTION_KITS.filter(k =>
      k.name.toLowerCase().includes(s) || k.fullName.toLowerCase().includes(s)
    );
  }, [search]);

  const currentMarkers = tab === 'ihc' ? filteredIHCMarkers : filteredIFMarkers;
  const totalMarkers = tab === 'ihc' ? IMMUNO_MARKERS.length : IF_MARKERS.length;

  const renderMarkerTable = (markers: ImmunoMarkerInfo[]) => (
    <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Marker</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Full Name</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Panel</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {markers.map((m, i) => (
            <tr key={i} onClick={() => setSelectedMarker(m)} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
              <td className="px-4 py-3 font-medium text-primary">{m.name}</td>
              <td className="px-4 py-3 text-xs">{m.fullName}</td>
              <td className="px-4 py-3">{m.panel ? <Badge variant="secondary" className="text-[10px]">{m.panel}</Badge> : '—'}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[300px] truncate">{m.purpose}</td>
            </tr>
          ))}
          {markers.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No markers found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/immuno-reagent')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-2xl font-display font-bold">Immuno Manual</h2>
          <PageTip content="Reference manual for immunohistochemistry (IHC) markers, immunofluorescence (IF) markers, and detection kits. Browse markers by panel, view function, purpose, and compatible samples." />
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setFilterPanel('all'); }}>
          <TabsList>
            <TabsTrigger value="ihc">IHC Markers ({IMMUNO_MARKERS.length})</TabsTrigger>
            <TabsTrigger value="if">IF Markers ({IF_MARKERS.length})</TabsTrigger>
            <TabsTrigger value="kits">Detection Kits ({DETECTION_KITS.length})</TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search markers, kits..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            {(tab === 'ihc' || tab === 'if') && (
              <select
                value={filterPanel}
                onChange={e => setFilterPanel(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All Panels</option>
                {panels.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
          </div>

          <TabsContent value="ihc" className="mt-3">
            {renderMarkerTable(filteredIHCMarkers)}
          </TabsContent>

          <TabsContent value="if" className="mt-3">
            {renderMarkerTable(filteredIFMarkers)}
          </TabsContent>

          <TabsContent value="kits" className="mt-3">
            <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kit</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Full Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKits.map((k, i) => (
                    <tr key={i} onClick={() => setSelectedKit(k)} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-medium text-primary">{k.name}</td>
                      <td className="px-4 py-3 text-xs">{k.fullName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[300px] truncate">{k.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Marker Detail */}
        <Dialog open={!!selectedMarker} onOpenChange={o => { if (!o) setSelectedMarker(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{selectedMarker?.name}</DialogTitle></DialogHeader>
            {selectedMarker && (
              <div className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Full Name:</span> {selectedMarker.fullName}</div>
                <div><span className="text-muted-foreground">Function:</span> {selectedMarker.function}</div>
                <div><span className="text-muted-foreground">Purpose:</span> {selectedMarker.purpose}</div>
                {selectedMarker.panel && <div><span className="text-muted-foreground">Panel:</span> <Badge variant="secondary">{selectedMarker.panel}</Badge></div>}
                <div>
                  <span className="text-muted-foreground">Compatible Samples:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedMarker.samples.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Kit Detail */}
        <Dialog open={!!selectedKit} onOpenChange={o => { if (!o) setSelectedKit(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{selectedKit?.name}</DialogTitle></DialogHeader>
            {selectedKit && (
              <div className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Full Name:</span> {selectedKit.fullName}</div>
                <div><span className="text-muted-foreground">Function:</span> {selectedKit.function}</div>
                <div><span className="text-muted-foreground">Purpose:</span> {selectedKit.purpose}</div>
                <div>
                  <span className="text-muted-foreground">Compatible Samples:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedKit.samples.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ImmunoManual;
