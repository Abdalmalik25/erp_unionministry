/**
 * OfflineIndicator — مؤشر هجين أونلاين/أوفلاين مع حل تعارض
 */
import { useOffline } from "../../contexts/OfflineContext";
import { Badge } from "../ui/badge";
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/Button";

export function OfflineIndicator(){
  const { isOnline, pendingActions, syncStatus, syncAll } = useOffline();
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${isOnline? 'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>
      {isOnline? <Wifi className="w-4 h-4"/> : <WifiOff className="w-4 h-4"/>}
      <span className="font-bold">{isOnline? 'أونلاين':'أوفلاين — يعمل محلياً'}</span>
      {pendingActions>0 && <Badge variant={isOnline? 'default':'destructive'} className="text-[10px]">{pendingActions} معلق</Badge>}
      {syncStatus==='syncing' && <RefreshCw className="w-3 h-3 animate-spin"/>}
      {syncStatus==='error' && <AlertTriangle className="w-3 h-3 text-rose-600"/>}
      {syncStatus==='idle' && pendingActions===0 && isOnline && <CheckCircle2 className="w-3 h-3 text-emerald-600"/>}
      {isOnline && pendingActions>0 && <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={syncAll}><RefreshCw className="w-3 h-3 ml-1"/>مزامنة</Button>}
      <span className="hidden sm:inline text-[11px]">يعمل دون اتصال بالإنترنت مع حفظ آمن تلقائي وحل ذكي للتعارضات عند العودة + مراجعة بشرية للحرج</span>
    </div>
  );
}
