import { Switch } from '../components/ui/switch';
import { RotateCcw, Trash2 } from 'lucide-react';

interface SoftDeleteToggleProps {
  showDeleted: boolean;
  onToggle: (checked: boolean) => void;
  deletedCount?: number;
}

export function SoftDeleteToggle({ showDeleted, onToggle, deletedCount }: SoftDeleteToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={showDeleted} onCheckedChange={onToggle} />
      <label className="text-xs font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => onToggle(!showDeleted)}>
        عرض المحذوفات
      </label>
      {deletedCount !== undefined && deletedCount > 0 && (
        <span className="text-xs bg-error/10 text-error px-2 py-0.5 rounded-full">{deletedCount}</span>
      )}
    </div>
  );
}

interface SoftDeleteActionsProps {
  isDeleted: boolean;
  onRestore: () => void;
  onDelete: () => void;
  restoreLabel?: string;
  deleteLabel?: string;
}

export function SoftDeleteActions({ isDeleted, onRestore, onDelete, restoreLabel = 'استعادة', deleteLabel = 'حذف' }: SoftDeleteActionsProps) {
  if (isDeleted) {
    return (
      <button onClick={onRestore} className="flex items-center gap-1 text-xs font-semibold text-success hover:text-success-dark transition-colors" title={restoreLabel}>
        <RotateCcw className="w-3.5 h-3.5" />{restoreLabel}
      </button>
    );
  }
  return (
    <button onClick={onDelete} className="flex items-center gap-1 text-xs font-semibold text-error hover:text-error-dark transition-colors" title={deleteLabel}>
      <Trash2 className="w-3.5 h-3.5" />{deleteLabel}
    </button>
  );
}
