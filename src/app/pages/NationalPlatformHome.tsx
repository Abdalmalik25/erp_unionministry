/**
 * NationalPlatformHome â€” Ø§Ù„ØµÙØ­Ø© Ø§Ù„ÙˆØ·Ù†ÙŠØ© Ø§Ù„Ù…ÙˆØ­Ø¯Ø©
 * Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø±Ø³Ù…ÙŠØ© Ù„Ù„Ù…Ù†Ø¸ÙˆÙ…Ø© Ø§Ù„ÙˆØ·Ù†ÙŠØ© Ù„Ù„Ø¹Ù…Ù„ Ø§Ù„Ù†Ù‚Ø§Ø¨ÙŠ
 */
import { NationalLaborGraph } from "../components/labor/NationalLaborGraph";
import { UnifiedSearch } from "../components/labor/UnifiedSearch";
import { AICopilot } from "../components/labor/AICopilot";
import { AICopilotV2 } from "../components/labor/AICopilotV2";
import { SecurityCenter } from "../components/labor/SecurityCenter";
import { ServiceMarketplace } from "../components/labor/ServiceMarketplace";
import { PlatformGuide } from "../components/national/PlatformGuide";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { Globe, Layers, Shield, Zap, HeartPulse, Scale, Building2 } from "lucide-react";

export default function NationalPlatformHome() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-violet-900 text-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-bold"><Globe className="w-4 h-4"/> Ø§Ù„Ù…Ù†Ø¸ÙˆÙ…Ø© Ø§Ù„ÙˆØ·Ù†ÙŠØ© Ù„Ø¥Ø¯Ø§Ø±Ø© Ù‚Ø·Ø§Ø¹ Ø§Ù„Ø¹Ù…Ù„ â€” ÙˆØ²Ø§Ø±Ø© Ø§Ù„Ø´Ø¤ÙˆÙ† Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠØ© ÙˆØ§Ù„Ø¹Ù…Ù„</div>
        <h1 className="text-2xl font-black mt-1">Ù…Ù†ØµØ© ÙˆØ§Ø­Ø¯Ø© â€¢ Ù†Ø³ÙŠØ¬ ÙˆØ§Ø­Ø¯ â€¢ Ø­Ù‚ÙŠÙ‚Ø© ÙˆØ§Ø­Ø¯Ø©</h1>
        <p className="text-sm text-blue-100 mt-1">Ù†Ø¸Ø§Ù… Ù…Ø±Ø¬Ø¹ÙŠ Ù…ÙˆØ«ÙˆÙ‚: Ø§Ù„Ù‚Ø±Ø§Ø± ÙˆÙÙ‚ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ØŒ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø© ÙˆÙ…ØµØ¯Ø±Ù‡Ø§ Ø±Ø³Ù…ÙŠØŒ ÙˆØ§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ù…ÙƒØªÙ…Ù„Ø© Ø§Ù„ØªØªØ¨Ø¹ ÙˆØ§Ù„Ù…Ø³Ø§Ø¡Ù„Ø©</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge className="bg-white text-slate-900">ØªÙƒØ§Ù…Ù„ Ø¹Ù…ÙŠÙ‚</Badge>
          <Badge className="bg-emerald-500">Ø­Ù…Ø§ÙŠØ© Ù‚ØµÙˆÙ‰</Badge>
          <Badge className="bg-amber-500">ÙŠØ¹Ù…Ù„ Ø¯ÙˆÙ† Ø§ØªØµØ§Ù„</Badge>
          <Badge variant="outline" className="text-white border-white/30">Ù‚Ø±Ø§Ø±Ø§Øª Ù…ÙØ³ÙŽÙ‘Ø±Ø© ÙˆÙ…Ø¹Ù„ÙŽÙ‘Ù„Ø©</Badge>
          <Badge variant="outline" className="text-white border-white/30">ØªØªØ¨Ø¹ ÙƒØ§Ù…Ù„ Ù„Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <NationalLaborGraph />
          <UnifiedSearch />
          <AICopilot />
          <AICopilotV2 />
          <PlatformGuide />
        </div>
        <div className="space-y-6">
          <SecurityCenter />
          <ServiceMarketplace />
          <Card>
            <div className="p-5 space-y-3">
              <div className="font-bold text-sm flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-600"/> Ø§Ù„Ø£Ø¯Ø§Ø¡ Ø§Ù„Ø¹Ø§Ù„Ù…ÙŠ</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 border rounded-xl text-center"><Zap className="w-5 h-5 mx-auto text-amber-600"/><div className="font-bold">ÙÙˆØ±ÙŠØ©</div><div>Ø³Ø±Ø¹Ø© Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø©</div></div>
                <div className="p-3 bg-slate-50 border rounded-xl text-center"><Globe className="w-5 h-5 mx-auto text-blue-600"/><div className="font-bold">Ù…ÙˆØ­Ø¯Ø©</div><div>Ù‚ÙˆØ§Ø¹Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙˆØ·Ù†ÙŠØ©</div></div>
                <div className="p-3 bg-slate-50 border rounded-xl text-center"><Shield className="w-5 h-5 mx-auto text-emerald-600"/><div className="font-bold">Ù…Ø­ØµÙ‘Ù†Ø©</div><div>Ø¶Ø¯ Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ù…ÙØ±Ø·</div></div>
                <div className="p-3 bg-slate-50 border rounded-xl text-center"><HeartPulse className="w-5 h-5 mx-auto text-rose-600"/><div className="font-bold">Ù…ÙŠØ¯Ø§Ù†ÙŠ</div><div>ÙŠØ¹Ù…Ù„ Ø¯ÙˆÙ† Ø¥Ù†ØªØ±Ù†Øª</div></div>
              </div>
              <div className="text-[11px] text-muted-foreground">ØªØµÙ…ÙŠÙ… Ù…Ø¤Ø³Ø³ÙŠ ÙŠØ¶Ù…Ù† Ø§Ø³ØªØ±Ø¬Ø§Ø¹Ø§Ù‹ ÙÙˆØ±ÙŠØ§Ù‹ Ù„Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¯ÙˆÙ† Ø£ÙŠ Ø¨Ø·Ø¡ Ø£Ùˆ Ø§Ù†ØªØ¸Ø§Ø±ØŒ Ù…Ù‡Ù…Ø§ ÙƒØ§Ù† Ø­Ø¬Ù… Ø§Ù„Ø³Ø¬Ù„Ø§Øª</div>
            </div>
          </Card>

          <Card>
            <div className="p-5 space-y-2">
              <div className="font-bold text-sm flex items-center gap-2"><Scale className="w-5 h-5 text-slate-700"/> Ø§Ù„Ø¶Ù…Ø§Ù†Ø§Øª Ø§Ù„Ø­ÙƒÙˆÙ…ÙŠØ©</div>
              <ul className="text-xs space-y-1 list-disc pr-4 text-muted-foreground">
                <li>Ø§Ù„Ù†Ø¸Ø§Ù… Ù„Ø§ ÙŠØµØ¯Ø± Ø­ÙƒÙ…Ø§Ù‹ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹ â€” Ø§Ù„Ù‚Ø±Ø§Ø± Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ Ù„Ù„Ø¥Ù†Ø³Ø§Ù† Ø§Ù„Ù…Ø®ØªØµ</li>
                <li>Ù„Ø§ ØªÙØ­ØªØ³Ø¨ Ø£ÙŠ Ø¯Ø±Ø¬Ø© Ø®Ø·ÙˆØ±Ø© Ø¹Ù‚ÙˆØ¨Ø© Ø¥Ù„Ø§ Ø¨Ù†Øµ Ù†Ø¸Ø§Ù…ÙŠ ØµØ±ÙŠØ­</li>
                <li>ÙƒÙ„ Ù‚Ø±Ø§Ø± ÙŠÙˆØ¶Ø­: Ø§Ù„Ø³Ø¨Ø¨ ÙˆØ§Ù„Ù…Ø±Ø¬Ø¹ Ø§Ù„Ù†Ø¸Ø§Ù…ÙŠ ÙˆØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥ØµØ¯Ø§Ø±</li>
                <li>Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªØ§Ø±ÙŠØ®ÙŠØ© Ù…Ø­ÙÙˆØ¸Ø© ÙƒØ§Ù…Ù„Ø© Ù…Ø¹ Ù…ØµØ¯Ø±Ù‡Ø§ ÙˆØ³Ù„Ø³Ù„Ø© Ø§Ø¹ØªÙ…Ø§Ø¯Ù‡Ø§</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="p-5">
          <div className="font-bold text-sm flex items-center gap-2"><Building2 className="w-5 h-5"/> Ø³Ø¬Ù„Ù‘Ø§Øª Ø§Ù„Ù…Ù†Ø¸ÙˆÙ…Ø© Ø§Ù„Ù…ÙˆØ­Ø¯Ø©</div>
          <div className="text-xs text-muted-foreground mt-1">Ø¹Ø´Ø± Ø³Ø¬Ù„Ø§Øª ÙˆØ·Ù†ÙŠØ© Ù…ÙˆØ­Ø¯Ø© ØªØ¹Ù…Ù„ Ø¨Ù‚ÙˆØ§Ø¹Ø¯ Ù…ÙˆØ­Ø¯Ø© ÙˆØµÙ„Ø§Ø­ÙŠØ§Øª Ù…Ø­Ø¯Ø¯Ø© ÙˆØ­Ù…Ø§ÙŠØ© Ù…Ù† Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ù…ÙØ±Ø·</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['Ø³Ø¬Ù„ Ø§Ù„Ø£Ø´Ø®Ø§Øµ','Ø³Ø¬Ù„ Ø§Ù„Ù…Ù†Ø´Ø¢Øª','Ø³Ø¬Ù„ Ø§Ù„Ø¹Ø§Ù…Ù„ÙŠÙ†','Ø³Ø¬Ù„ Ø§Ù„Ø¹Ù‚ÙˆØ¯','Ø³Ø¬Ù„ Ø§Ù„ØªÙØªÙŠØ´','Ø³Ø¬Ù„ Ø§Ù„Ù‚Ø¶Ø§ÙŠØ§','Ø³Ø¬Ù„ Ø§Ù„Ù†Ù‚Ø§Ø¨Ø§Øª','Ø§Ù„Ù…Ø±Ø¬Ø¹ Ø§Ù„Ù†Ø¸Ø§Ù…ÙŠ','Ø§Ù„Ù„ÙˆØ§Ø¦Ø­ Ø§Ù„ØªÙ†Ø¸ÙŠÙ…ÙŠØ©','Ø§Ù„Ø¨Ø­Ø« Ø§Ù„Ù…ÙˆØ­Ø¯'].map(p=> <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
          </div>
        </div>
      </Card>
    </div>
  );
}
