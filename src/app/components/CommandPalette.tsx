/**
 * Command Palette - لوحة الأوامر
 * بحث سريع وتنفيذ الأوامر بضغطة زر
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Command, ArrowRight, Hash } from 'lucide-react';
import { useNavigate } from 'react-router';
interface CommandItem {
    id: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action: () => void;
    keywords?: string[];
    category?: string;
    shortcut?: string;
}
interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    commands: CommandItem[];
}
export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentCommands, setRecentCommands] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    // تحميل الأوامر الأخيرة
    useEffect(() => {
        const recent = JSON.parse(localStorage.getItem('recentCommands') || '[]');
        setRecentCommands(recent);
    }, []);
    // التركيز على البحث عند الفتح
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);
    // تصفية الأوامر
    const filteredCommands = useMemo(() => {
        if (!searchTerm) {
            return commands;
        }
        const lowerSearch = searchTerm.toLowerCase();
        return commands.filter((cmd) => {
            const titleMatch = cmd.title.toLowerCase().includes(lowerSearch);
            const descMatch = cmd.description?.toLowerCase().includes(lowerSearch);
            const keywordsMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(lowerSearch));
            return titleMatch || descMatch || keywordsMatch;
        });
    }, [commands, searchTerm]);
    // التنقل بلوحة المفاتيح
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
            e.preventDefault();
            executeCommand(filteredCommands[selectedIndex]);
        }
        else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };
    // تنفيذ الأمر
    const executeCommand = (command: CommandItem) => {
        command.action();
        // حفظ في الأوامر الأخيرة
        const recent = [command.id, ...recentCommands.filter((id) => id !== command.id)].slice(0, 5);
        setRecentCommands(recent);
        localStorage.setItem('recentCommands', JSON.stringify(recent));
        onClose();
    };
    if (!isOpen)
        return null;
    // تجميع حسب الفئة
    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        const category = cmd.category || 'عام';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(cmd);
        return acc;
    }, {} as Record<string, CommandItem[]>);
    return (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4" onClick={onClose} dir="rtl">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[600px] flex flex-col animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20}/>
            <input ref={inputRef} type="text" value={searchTerm} onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedIndex(0);
        }} onKeyDown={handleKeyDown} placeholder="ابحث عن أمر... (Ctrl+K)" className="w-full pr-10 pl-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"/>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-card border border-border rounded">Esc</kbd>
              <span>لإغلاق</span>
            </div>
          </div>
        </div>

        {/* Commands List */}
        <div className="flex-1 overflow-y-auto p-2">
          {Object.keys(groupedCommands).length === 0 ? (<div className="text-center py-12">
              <p className="text-muted-foreground">لا توجد نتائج</p>
            </div>) : (Object.entries(groupedCommands).map(([category, cmds]) => (<div key={category} className="mb-4">
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  {category}
                </p>
                {cmds.map((cmd) => {
                const globalIndex = filteredCommands.indexOf(cmd);
                const isSelected = globalIndex === selectedIndex;
                return (<button key={cmd.id} onClick={() => executeCommand(cmd)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isSelected ? 'bg-info/10 border-2 border-info/30' : 'hover:bg-accent/50'}`} onMouseEnter={() => setSelectedIndex(globalIndex)}>
                      {cmd.icon && (<div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          {cmd.icon}
                        </div>)}

                      <div className="flex-1 text-right">
                        <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-heading'}`}>
                          {cmd.title}
                        </p>
                        {cmd.description && (<p className="text-xs text-muted-foreground mt-0.5">{cmd.description}</p>)}
                      </div>

                      {cmd.shortcut && (<div className="flex items-center gap-1">
                          {cmd.shortcut.split('+').map((key) => (<kbd key={key} className="px-1.5 py-0.5 bg-card border border-border rounded text-xs font-semibold text-foreground">
                              {key}
                            </kbd>))}
                        </div>)}

                      {isSelected && (<ArrowRight className="text-primary-bright" size={16}/>)}
                    </button>);
            })}
              </div>)))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted rounded-b-2xl">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-card border border-border rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-card border border-border rounded">↓</kbd>
                للتنقل
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-card border border-border rounded">Enter</kbd>
                للتنفيذ
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Command size={12}/>
              لوحة الأوامر
            </span>
          </div>
        </div>
      </div>
    </div>);
}
// Hook لاستخدام Command Palette
export function useCommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };
        const handleCustomEvent = () => {
            setIsOpen(true);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('openCommandPalette' as any, handleCustomEvent);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('openCommandPalette' as any, handleCustomEvent);
        };
    }, []);
    // الأوامر الافتراضية
    const defaultCommands: CommandItem[] = [
        {
            id: 'home',
            title: 'الصفحة الرئيسية',
            description: 'العودة إلى لوحة التحكم',
            icon: <Hash size={16} className="text-primary-bright"/>,
            action: () => navigate('/ministry'),
            category: 'التنقل',
            shortcut: 'Ctrl+H',
            keywords: ['dashboard', 'home', 'رئيسية'],
        },
        {
            id: 'unions',
            title: 'النقابات',
            description: 'إدارة المنظمات النقابية',
            icon: <Hash size={16} className="text-success-dark"/>,
            action: () => navigate('/ministry/unions'),
            category: 'التنقل',
            shortcut: 'Ctrl+U',
            keywords: ['unions', 'نقابات'],
        },
        {
            id: 'members',
            title: 'الأعضاء',
            description: 'إدارة أعضاء النقابات',
            icon: <Hash size={16} className="text-gold-dark"/>,
            action: () => navigate('/ministry/members'),
            category: 'التنقل',
            shortcut: 'Ctrl+M',
            keywords: ['members', 'أعضاء'],
        },
    ];
    return {
        isOpen,
        setIsOpen,
        defaultCommands,
    };
}
