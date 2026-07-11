import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/store/useStore';
import { ProcessingProtocol, ProtocolReagentCheck } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  protocol: ProcessingProtocol | undefined;
  existingCheck: ProtocolReagentCheck | undefined;
  benchStep: string;
}

const ProtocolCheckDialog = ({ open, onOpenChange, caseId, protocol, existingCheck, benchStep }: Props) => {
  const { updateCase, addLog, currentUser, cases } = useStore();
  const [adjustments, setAdjustments] = useState<Record<number, { concentration?: string; notes?: string }>>(
    existingCheck?.adjustments || {}
  );

  if (!protocol) return null;

  const handleSave = () => {
    const caseEntry = cases.find(c => c.id === caseId);
    if (!caseEntry) return;

    const check: ProtocolReagentCheck = {
      checkedAt: new Date(),
      checkedBy: currentUser?.name || 'Unknown',
      adjustments: Object.keys(adjustments).length > 0 ? adjustments : undefined,
    };

    const existingChecks = caseEntry.reagentChecks || {};
    updateCase(caseId, {
      reagentChecks: { ...existingChecks, [benchStep]: check },
    });

    const adjustedSteps = Object.entries(adjustments)
      .filter(([, adj]) => adj.concentration || adj.notes)
      .map(([idx, adj]) => `${protocol.steps[Number(idx)]?.reagent}: ${adj.concentration || 'same'}${adj.notes ? ` (${adj.notes})` : ''}`)
      .join(', ');

    addLog(caseId, {
      caseId,
      event: `${benchStep}: Protocol reagent check completed`,
      timestamp: new Date(),
      user: currentUser?.name || 'Unknown',
      details: adjustedSteps ? `Adjustments: ${adjustedSteps}` : 'No adjustments made',
    });

    onOpenChange(false);
  };

  const updateAdj = (idx: number, field: 'concentration' | 'notes', value: string) => {
    setAdjustments(prev => ({
      ...prev,
      [idx]: { ...prev[idx], [field]: value },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            Protocol Reagent Check — {protocol.name}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Review the protocol schedule below. Adjust concentrations or add notes where reagent conditions differ from the standard.
        </p>
        {existingCheck && (
          <Badge variant="secondary" className="text-xs w-fit">
            Last checked by {existingCheck.checkedBy} at {new Date(existingCheck.checkedAt).toLocaleString()}
          </Badge>
        )}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reagent</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Duration</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Std Conc.</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Temp</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Adjusted Conc.</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {protocol.steps.map((step, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{step.reagent}</td>
                  <td className="px-3 py-2">{step.duration}</td>
                  <td className="px-3 py-2">{step.concentration}</td>
                  <td className="px-3 py-2 text-xs">{step.temperature || '—'}</td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-7 text-xs w-20"
                      placeholder={step.concentration}
                      value={adjustments[i]?.concentration || ''}
                      onChange={e => updateAdj(i, 'concentration', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-7 text-xs w-28"
                      placeholder="Notes"
                      value={adjustments[i]?.notes || ''}
                      onChange={e => updateAdj(i, 'notes', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Check</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProtocolCheckDialog;
