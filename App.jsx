import { createClient } from '@supabase/supabase-js';
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Eye, EyeOff, History, KeyRound, Lock, Plus, Power, Search, Sparkles, X } from "lucide-react";

const MASTER_CODE = "coco8899";
const supabaseUrl = 'https://obbfhjvgicttkknfvmql.supabase.co';

const supabaseKey = 'sb_publishable_YhEF-yTNNH9Ikb7Q7VXRVQ_G5a_ou3c';

const supabase = createClient(supabaseUrl, supabaseKey);
const DEFAULT_FORM = {
  roomNo: "",
  bankroll: "",
  unopened: "",
  prev1: "",
  prev2: "",
  todayBet: "",
  todayRate: "",
  monthBet: "",
  monthRate: ""
};

const panelClass = "relative overflow-hidden rounded-[2rem] border border-cyan-300/30 bg-slate-950/75 p-5 shadow-[0_0_24px_rgba(34,211,238,0.18),0_0_60px_rgba(14,165,233,0.14),inset_0_0_24px_rgba(34,211,238,0.08)] backdrop-blur-xl ring-1 ring-cyan-200/10 md:p-7";

function nowTime() {
  return new Date().toLocaleString("zh-TW", { hour12: false });
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

function safeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeTempCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SET-";
  for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function analyzeMachine(form, isMaster = false) {
  const n = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, toNumber(value)]));

  const bankroll = Math.max(n.bankroll, 1);
  const unopened = Math.max(Math.round(n.unopened), 0);
  const prev1 = Math.max(Math.round(n.prev1), 0);
  const prev2 = Math.max(Math.round(n.prev2), 0);
  const monthBet = Math.max(n.monthBet, 1);
  const todayBet = Math.max(n.todayBet, 0);
  const todayRate = n.todayRate;
  const monthRate = n.monthRate;

  const pushRate = (todayBet / monthBet) * 100;
  const rateGap = todayRate - monthRate;
  const longTermBiteBias = clamp(100 - monthRate, 0, 45);
  const longTermLooseBias = clamp(monthRate - 100, 0, 45);

  const unopenedCurve = clamp((1 - Math.exp(-Math.pow(unopened / 95, 1.28))) * 100, 0, 100);
  const prev1Curve = clamp((1 - Math.exp(-Math.pow(prev1 / 92, 1.2))) * 100, 0, 100);
  const prev2Curve = clamp((1 - Math.exp(-Math.pow(prev2 / 92, 1.12))) * 100, 0, 100);
  const recentOpenMemory = clamp(prev1Curve * 0.62 + prev2Curve * 0.38, 0, 100);

  const longPreviousAverage = (prev1 + prev2) / 2;
  const earlyTriggerContrast = clamp(
    (longPreviousAverage - unopened) * 0.42 + Math.max(0, recentOpenMemory - 52) * 0.35 - Math.max(0, unopened - 75) * 0.18,
    0,
    100
  );
  const highTurnPressure = clamp(unopenedCurve * 0.78 + recentOpenMemory * 0.22, 0, 100);
  const cycleDeviation = clamp(Math.abs(unopened - longPreviousAverage) * 0.58, 0, 100);
  const rhythmConsistency = clamp(100 - Math.abs(prev1 - prev2) * 1.25, 0, 100);

  let phase = "低量初判段";
  let phaseWeight = 0.72;
  if (pushRate >= 0.35 && pushRate < 2.2) {
    phase = "資金初段";
    phaseWeight = 0.88;
  } else if (pushRate >= 2.2 && pushRate < 6.8) {
    phase = "資金累積段";
    phaseWeight = 1.12;
  } else if (pushRate >= 6.8 && pushRate < 11.5) {
    phase = "資金活躍段";
    phaseWeight = 1.2;
  } else if (pushRate >= 11.5) {
    phase = "資金過熱段";
    phaseWeight = 1.32;
  }

  const currentBite = Math.max(0, monthRate - todayRate);
  const currentPayout = Math.max(0, todayRate - monthRate);

  const priorOpportunity = clamp(longTermBiteBias * 0.9 + highTurnPressure * 0.34 + earlyTriggerContrast * 0.42 + rhythmConsistency * 0.08, 0, 100);
  const likelihoodAdjustment = clamp(
    currentBite * 1.42 + pushRate * 0.95 + cycleDeviation * 0.24 + Math.max(0, 100 - todayRate) * 0.34 - currentPayout * 1.15,
    -45,
    80
  );
  const posteriorOpportunity = clamp(priorOpportunity * 0.62 + likelihoodAdjustment * 0.38, 0, 100);

  const chaseRisk = clamp(currentPayout * 2.35 + pushRate * 3.15 + Math.max(0, todayRate - 108) * 3.1 + longTermLooseBias * 1.4 - earlyTriggerContrast * 0.12, 0, 100);
  const pullbackRisk = clamp(currentPayout * 1.72 + pushRate * 2.35 + chaseRisk * 0.24, 0, 100);
  const accumulationPressure = clamp((currentBite * 2.25 + longTermBiteBias * 1.18 + highTurnPressure * 0.42 + recentOpenMemory * 0.26 + earlyTriggerContrast * 0.38 + pushRate * 1.15) * phaseWeight, 0, 100);
  const volatilityPressure = clamp(Math.abs(rateGap) * 1.08 + pushRate * 2.25 + cycleDeviation * 0.22 + recentOpenMemory * 0.12 + chaseRisk * 0.28, 0, 100);
  const biteTrend = clamp(currentBite * 2.22 + longTermBiteBias * 0.82 + pushRate * 1.08 + highTurnPressure * 0.28 + recentOpenMemory * 0.18, 0, 100);
  const recoveryPotential = clamp(posteriorOpportunity * 0.48 + accumulationPressure * 0.28 + earlyTriggerContrast * 0.24 + rhythmConsistency * 0.06 - chaseRisk * 0.46 - pullbackRisk * 0.18, 0, 100);
  const reboundTrend = clamp(recoveryPotential * 0.62 + currentPayout * 0.56 + earlyTriggerContrast * 0.12 - pullbackRisk * 0.32, 0, 100);

  const bankrollPressureRatio = bankroll / Math.max(volatilityPressure * 64, 1);
  let bankrollFit = "B";
  let bankrollAdvice = "目前可觀察，但建議控制節奏與停損";
  if (bankrollPressureRatio >= 1.45) {
    bankrollFit = "S";
    bankrollAdvice = "你的本金對目前波動來說相對舒服，可以正常節奏觀察";
  } else if (bankrollPressureRatio >= 1.02) {
    bankrollFit = "A";
    bankrollAdvice = "本金仍可承受目前波動，但建議分段測試，不要一次打深";
  } else if (bankrollPressureRatio >= 0.68) {
    bankrollFit = "B";
    bankrollAdvice = "本金能碰，但容錯不高，適合小額測試、快進快出";
  } else {
    bankrollFit = "C";
    bankrollAdvice = "本金承受力偏低，這台目前不適合硬扛波動";
  }

  const bankrollBonus = bankrollFit === "S" ? 18 : bankrollFit === "A" ? 11 : bankrollFit === "B" ? 2 : -16;
  const phaseBonus = phase === "資金累積段" ? 12 : phase === "資金活躍段" ? 8 : phase === "資金初段" ? 3 : phase === "資金過熱段" ? -18 : -2;
  const operationScore = clamp(posteriorOpportunity * 0.28 + recoveryPotential * 0.34 + accumulationPressure * 0.18 + earlyTriggerContrast * 0.16 + bankrollBonus + phaseBonus - chaseRisk * 0.34 - volatilityPressure * 0.14, 0, 100);

  const dataCompleteness = clamp((unopened > 0 ? 18 : 0) + (prev1 > 0 ? 14 : 0) + (prev2 > 0 ? 12 : 0) + (todayBet > 0 ? 18 : 0) + (monthBet > 1 ? 18 : 0) + (todayRate > 0 ? 10 : 0) + (monthRate > 0 ? 10 : 0), 0, 100);
  const confidence = clamp(dataCompleteness * 0.42 + pushRate * 5.8 + Math.min(Math.abs(rateGap) * 1.4, 20) + Math.min(recentOpenMemory * 0.16, 16), 10, 100);

  let label = "平衡盤";
  let advice = "目前所有數據綜合後沒有形成明顯優勢，只能視為普通觀察盤";
  let actionLevel = "觀察";
  let actionText = "先不要急著操作，等下一段數據更明顯再判斷";

  if (chaseRisk >= 72 && currentPayout >= 8) {
    label = "追高風險區";
    advice = "得分率已明顯高於長期基準，現在看到的回分可能已經是前段玩家吃掉的結果";
    actionLevel = "不要追";
    actionText = "這台現在最怕追高，建議跳過或等下一輪數據回落後再看";
  } else if (phase === "資金過熱段" && currentPayout >= 6) {
    label = "回吐後過熱區";
    advice = "今日資金已大量推進，得分率也已拉高，可能已經回吐過一段";
    actionLevel = "不要追";
    actionText = "不建議再追這台，除非後續數據重新沉澱，否則容易追在高點";
  } else if (phase === "資金過熱段") {
    label = "資金高壓區";
    advice = "今日投注佔近30日資金池比例偏高，波動壓力較大，需要非常保守";
    actionLevel = bankrollFit === "S" || bankrollFit === "A" ? "高風險短測" : "不建議";
    actionText = bankrollFit === "S" || bankrollFit === "A" ? "只適合小段測試，不適合連續追打" : "不建議操作，小本金很容易被波動洗出去";
  } else if (earlyTriggerContrast >= 42 && posteriorOpportunity >= 45 && chaseRisk < 55) {
    label = "低轉反差機會區";
    advice = "前一前二偏長開，但目前未開轉數相對較低，形成低轉反差訊號；這只是概率加權，不代表必進";
    actionLevel = bankrollFit === "C" ? "觀察" : "可小測";
    actionText = bankrollFit === "C" ? "有反差機會，但本金容錯不高，建議先看不要硬碰" : "可用小節奏測試低轉反差，但沒反應就退，不要硬磨";
  } else if (currentBite >= 6 && accumulationPressure >= 38 && posteriorOpportunity >= 38) {
    label = "咬分累積區";
    advice = "得分率低於近30日基準，且未開/前一/前二與資金曲線共同形成累積壓力，但不代表下一段一定回";
    actionLevel = operationScore >= 62 ? "可小測" : bankrollFit === "C" ? "不建議" : "謹慎";
    actionText = operationScore >= 62 ? "可以小額測試，但不要重壓，設定停損，沒進入節奏就離開" : bankrollFit === "C" ? "這台有累積感，但你的本金承受力不足，建議不要硬進" : "可以觀察，不建議急著打深，等曲線更明顯再進";
  } else if (currentPayout >= 6) {
    label = "回分活躍區";
    advice = "目前得分率高於長期基準，代表今天已有回吐跡象，但不代表後面會繼續回";
    actionLevel = chaseRisk >= 55 ? "謹慎" : "可短打";
    actionText = chaseRisk >= 55 ? "可以看，但不要追太深，這種盤容易從回分轉成回落" : "若要操作只適合短打，吃到節奏就收，不適合長時間硬磨";
  } else if (operationScore >= 58 && bankrollFit !== "C") {
    label = "可觀察測試區";
    advice = "全部數據融合後，機會分數與本金適配度尚可，但仍不是保證盤";
    actionLevel = "可小測";
    actionText = "可以小額測試節奏，但不要把它當成必回盤";
  } else if (pushRate < 0.35) {
    label = "低量初判區";
    advice = "當日投注量偏低，但系統已納入未開、前一、前二與長期基準做初步推估";
    actionLevel = posteriorOpportunity >= 45 && bankrollFit !== "C" ? "可觀察小測" : "觀察";
    actionText = posteriorOpportunity >= 45 && bankrollFit !== "C" ? "不是不能看，但只能小測，不能把低量初判當成成形盤" : "目前訊號還不夠立體，先觀察，不建議急著操作";
  }

  const aiIndex = reboundTrend - biteTrend;
  return {
    id: safeId(), time: nowTime(), role: isMaster ? "最高權限" : "臨時權限", roomNo: form.roomNo || "未填房號",
    biteScore: round(biteTrend), returnScore: round(reboundTrend), aiIndex: round(aiIndex), riskIndex: round(volatilityPressure), confidence: round(confidence),
    volumeRatio: round(pushRate, 2), rateGap: round(rateGap, 2), chaseRisk: round(chaseRisk), pullbackRisk: round(pullbackRisk), recoveryPotential: round(recoveryPotential),
    accumulationPressure: round(accumulationPressure), posteriorOpportunity: round(posteriorOpportunity), priorOpportunity: round(priorOpportunity), earlyTriggerContrast: round(earlyTriggerContrast),
    highTurnPressure: round(highTurnPressure), recentOpenMemory: round(recentOpenMemory), cycleDeviation: round(cycleDeviation), rhythmConsistency: round(rhythmConsistency), operationScore: round(operationScore),
    phase, bankrollFit, bankrollAdvice, actionLevel, actionText, level: bankrollFit, net: round(aiIndex), label, advice
  };
}

function Button({ children, className = "", ...props }) {
  return <button {...props} className={`inline-flex items-center justify-center font-bold transition ${className}`}>{children}</button>;
}

function Panel({ children, className = "" }) {
  return <section className={`${panelClass} ${className}`}>{children}</section>;
}

function Title({ children }) {
  return <h2 className="relative inline-block text-2xl font-black tracking-[0.18em] text-cyan-100 drop-shadow-[0_0_18px_rgba(34,211,238,0.95)]">{children}</h2>;
}

function Field({ label, value, setValue, placeholder, integerOnly = false, type = "number" }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs tracking-widest text-cyan-200/80">{label}</div>
      <input
        type={type}
        step={integerOnly ? "1" : "0.01"}
        value={value}
        onChange={(event) => {
          const raw = event.target.value;
          setValue(integerOnly ? raw.replace(/[^0-9]/g, "") : raw);
        }}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-cyan-300/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-400/20"
      />
    </label>
  );
}

function MetricCard({ title, value, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-300/20 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
    rose: "border-rose-300/20 bg-rose-500/10 text-rose-100",
    yellow: "border-yellow-300/20 bg-yellow-500/10 text-yellow-100"
  };
  return (
    <div className={`rounded-3xl border p-5 ${tones[tone] || tones.cyan}`}>
      <div className="text-sm opacity-75">{title}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

function CircuitBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_22%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.18),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(6,182,212,0.12),transparent_28%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute left-[-10%] top-[18%] h-px w-[120%] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent shadow-[0_0_32px_rgba(34,211,238,0.9)]" />
      <div className="absolute left-[8%] top-[28%] h-px w-[90%] bg-gradient-to-r from-transparent via-blue-300/40 to-transparent shadow-[0_0_26px_rgba(96,165,250,0.8)]" />
      <div className="absolute left-[12%] top-0 h-full w-px bg-gradient-to-b from-transparent via-cyan-300/25 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.45)]" />
      <div className="absolute right-[18%] top-0 h-full w-px bg-gradient-to-b from-transparent via-blue-400/20 to-transparent shadow-[0_0_20px_rgba(96,165,250,0.45)]" />
    </div>
  );
}

function Sparks({ sparks }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {sparks.map((spark) => <span key={spark.id} className="absolute block h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/90 bg-cyan-300/20 shadow-[0_0_42px_rgba(34,211,238,1)] animate-ping" style={{ left: spark.x, top: spark.y }} />)}
    </div>
  );
}

function AnalysisReport({ item }) {
  if (!item) return null;
  return (
    <div className="mt-5 rounded-[2rem] border border-cyan-300/25 bg-slate-950/80 p-6 shadow-[0_0_34px_rgba(34,211,238,0.18),inset_0_0_24px_rgba(34,211,238,0.06)]">
      <div className="flex flex-col gap-2 border-b border-cyan-300/15 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-black tracking-[0.28em] text-cyan-300/80">AI STRATEGY REPORT</div>
          <div className="mt-2 text-3xl font-black tracking-[0.08em] text-cyan-50 drop-shadow-[0_0_18px_rgba(34,211,238,0.75)]">AI分析建議</div>
        </div>
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-right">
          <div className="text-xs text-cyan-200/70">操作判定</div>
          <div className="text-2xl font-black text-white">{item.actionLevel || "觀察"}</div>
        </div>
      </div>
      <div className="mt-5 rounded-3xl border border-cyan-300/20 bg-cyan-500/10 p-5">
        <div className="text-sm font-black tracking-[0.18em] text-cyan-200">白話結論</div>
        <p className="mt-3 text-2xl font-black leading-relaxed text-white md:text-3xl">{item.actionText}</p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm font-black tracking-[0.16em] text-cyan-200">盤勢解讀</div><p className="mt-3 text-base leading-8 text-slate-200 md:text-lg">{item.advice}</p></div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm font-black tracking-[0.16em] text-cyan-200">本金適配</div><p className="mt-3 text-base leading-8 text-slate-200 md:text-lg">{item.bankrollAdvice}</p></div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <MetricCard title="綜合機會" value={item.posteriorOpportunity} tone="emerald" />
        <MetricCard title="主要風險" value={Math.max(item.chaseRisk || 0, item.pullbackRisk || 0)} tone="rose" />
        <MetricCard title="操作分數" value={item.operationScore} tone="yellow" />
      </div>
      <div className="mt-5 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
        <div className="rounded-2xl bg-white/[0.04] p-4">房號：<span className="font-black text-cyan-100">{item.roomNo}</span></div>
        <div className="rounded-2xl bg-white/[0.04] p-4">曲線區間：<span className="font-black text-cyan-100">{item.phase}</span></div>
        <div className="rounded-2xl bg-white/[0.04] p-4">資金推進率：<span className="font-black text-cyan-100">{item.volumeRatio}%</span></div>
        <div className="rounded-2xl bg-white/[0.04] p-4">低轉反差：<span className="font-black text-cyan-100">{item.earlyTriggerContrast}</span></div>
        <div className="rounded-2xl bg-white/[0.04] p-4">前兩次記憶：<span className="font-black text-cyan-100">{item.recentOpenMemory}</span></div>
        <div className="rounded-2xl bg-white/[0.04] p-4">可信度：<span className="font-black text-cyan-100">{item.confidence}</span></div>
      </div>
    </div>
  );
}

export default function App() {
  const [passcode, setPasscode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [masterHistory, setMasterHistory] = useState([]);
  const [tempHistoryMap, setTempHistoryMap] = useState({});
  const [activeTempCode, setActiveTempCode] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [toast, setToast] = useState(null);
  const [sparks, setSparks] = useState([]);
  const [tempCodes, setTempCodes] = useState([{ code: "SET-DEMO88", minutes: 30, createdAt: Date.now(), expiresAt: Date.now() + 30 * 60 * 1000, active: true }]);

  const isMaster = role === "master";
  const currentHistory = isMaster ? masterHistory : tempHistoryMap[activeTempCode] || [];
  const latest = currentHistory[0];

  function setFormValue(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  function showToast(message) {
    const id = safeId();
    setToast({ id, message });
    setTimeout(() => setToast((old) => (old?.id === id ? null : old)), 2200);
  }

  function tempStatus(item) {
    if (!item.active) return "已停用";
    if (Date.now() > item.expiresAt) return "已過期";
    return "可使用";
  }

async function handleLogin() {
    setLoginError("");
if (passcode === MASTER_CODE) {
  setRole("master");
  setActiveTempCode(null);

await supabase
  .from("temp_codes")
  .delete()
  .lt("expires_at", new Date().toISOString());
  
  const { data } = await supabase
    .from("temp_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (data) {
    setTempCodes(
      data.map(item => ({
        code: item.code,
        expiresAt: new Date(item.expires_at).getTime(),
        active: item.active
      }))
    );
  }

  return;
}
   const { data, error } = await supabase
  .from('temp_codes')
  .select('*')
  .eq('code', passcode)
  .single();

if (
  data &&
  data.active &&
  Date.now() <= new Date(data.expires_at).getTime()
) {
  setRole("temp");
  setActiveTempCode(data.code);
  return;
}
    setLoginError("通行碼錯誤、已停用或已過期");
  }

  function calculate() {
    const roomNumber = Number(form.roomNo);
    if (!form.roomNo || !Number.isInteger(roomNumber) || roomNumber < 1 || roomNumber > 3500) {
      showToast("房號請輸入1-3500區間");
      return;
    }
    const result = analyzeMachine(form, isMaster);
    if (isMaster) setMasterHistory((old) => [result, ...old]);
    else if (activeTempCode) setTempHistoryMap((old) => ({ ...old, [activeTempCode]: [result, ...(old[activeTempCode] || [])] }));
  }

async function createCode() {
  const safeMinutes = Math.max(1, Number(minutes || 1));

  const newCode = makeTempCode();

  const expiresAt = new Date(
    Date.now() + safeMinutes * 60 * 1000
  ).toISOString();

  await supabase.from('temp_codes').insert([
    {
      code: newCode,
      expires_at: expiresAt,
      active: true
    }
  ]);

  setTempCodes((old) => [
    {
      code: newCode,
      minutes: safeMinutes,
      createdAt: Date.now(),
      expiresAt: Date.now() + safeMinutes * 60 * 1000,
      active: true
    },
    ...old
  ]);
}

  function extendCode(code, addMinutes) {
    setTempCodes((old) => old.map((item) => item.code === code ? { ...item, expiresAt: Math.max(Date.now(), item.expiresAt) + addMinutes * 60 * 1000, active: true } : item));
  }

async function toggleCode(code) {
  const target = tempCodes.find((item) => item.code === code);
  if (!target) return;

  const nextActive = !target.active;

  await supabase
    .from("temp_codes")
    .update({ active: nextActive })
    .eq("code", code);

  setTempCodes((old) =>
    old.map((item) =>
      item.code === code ? { ...item, active: nextActive } : item
    )
  );
}

  function logout() {
    setRole(null);
    setPasscode("");
    setActiveTempCode(null);
    setForm(DEFAULT_FORM);
  }

  function clickFx(event) {
    const id = safeId();
    setSparks((old) => [...old.slice(-5), { id, x: event.clientX, y: event.clientY }]);
    setTimeout(() => setSparks((old) => old.filter((spark) => spark.id !== id)), 650);
  }

  if (!role) {
    return (
      <div onPointerDown={clickFx} className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#155e75_0%,#020617_42%,#000_100%)] px-5 py-8 text-white">
        <CircuitBackground />
        <Sparks sparks={sparks} />
        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-md items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            <Panel className="p-8">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/40 bg-cyan-400/15 shadow-[0_0_30px_rgba(34,211,238,0.9)]"><Cpu className="h-8 w-8 text-cyan-200" /></div>
                <h1 className="relative inline-block text-3xl font-black tracking-[0.18em] text-cyan-100 drop-shadow-[0_0_22px_rgba(34,211,238,0.95)] md:text-5xl">賽特AI選房<br />輔助系統</h1>
                <p className="mt-3 text-sm text-cyan-100/70">SET AI ROOM ASSISTANT</p>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <div className="mb-2 flex items-center gap-2 text-xs tracking-widest text-cyan-200/80"><Lock className="h-4 w-4" />輸入通行碼</div>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={passcode} onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="請輸入通行碼" className="w-full rounded-2xl border border-cyan-300/20 bg-slate-950/70 px-4 py-4 pr-14 text-center text-lg tracking-widest text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-400/20" />
                    <button type="button" onClick={() => setShowPass((old) => !old)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl p-2 text-cyan-100/70 transition hover:bg-cyan-400/10 hover:text-cyan-100">{showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                  </div>
                </label>
                {loginError && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{loginError}</div>}
                <Button onClick={handleLogin} className="w-full rounded-2xl bg-cyan-300 py-6 text-base font-black text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.8)] hover:bg-cyan-200">登入</Button>
              </div>
            </Panel>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div onPointerDown={clickFx} className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#0e7490_0%,#020617_34%,#000_100%)] px-4 py-5 text-white sm:px-6 lg:px-8">
      <CircuitBackground />
      <Sparks sparks={sparks} />
      {toast && <div className="pointer-events-none fixed left-1/2 top-6 z-[90] -translate-x-1/2 rounded-2xl border border-rose-300/30 bg-rose-500/20 px-6 py-4 text-sm font-black text-rose-50 shadow-[0_0_28px_rgba(244,63,94,0.45)] backdrop-blur-xl">{toast.message}</div>}
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-cyan-300/40 bg-slate-950/75 p-5 shadow-[0_0_30px_rgba(34,211,238,0.22),0_0_80px_rgba(59,130,246,0.16)] backdrop-blur-xl ring-1 ring-cyan-100/10 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-cyan-100/80"><Sparkles className="h-4 w-4" />AI ANALYSIS CONSOLE</div>
            <h1 className="relative inline-block text-3xl font-black tracking-[0.18em] text-cyan-100 drop-shadow-[0_0_22px_rgba(34,211,238,0.95)] md:text-5xl">賽特AI選房輔助系統</h1>
            <p className="mt-2 text-sm text-slate-300">目前身份：{isMaster ? "最高權限管理者" : `臨時通行使用者 ${activeTempCode || ""}`}</p>
          </div>
          <Button onClick={logout} className="rounded-2xl bg-white/10 px-5 py-5 text-white hover:bg-white/20"><Power className="mr-2 h-4 w-4" />登出</Button>
        </header>

        <main className="space-y-6">
          <Panel>
            <div className="mb-6 flex items-center gap-3"><div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200"><Search className="h-6 w-6" /></div><div><Title>數據輸入</Title><p className="mt-4 text-sm text-slate-400">輸入機台目前數據後開始分析</p></div></div>
            <div className="grid gap-4 md:grid-cols-5">
              <Field label="房號" value={form.roomNo} setValue={(v) => setFormValue("roomNo", v)} placeholder="例如 168" integerOnly />
              <Field label="本金" value={form.bankroll} setValue={(v) => setFormValue("bankroll", v)} placeholder="例如 4196.5" />
              <Field label="未開轉數" value={form.unopened} setValue={(v) => setFormValue("unopened", v)} placeholder="例如 68" integerOnly />
              <Field label="前一" value={form.prev1} setValue={(v) => setFormValue("prev1", v)} placeholder="例如 42" integerOnly />
              <Field label="前二" value={form.prev2} setValue={(v) => setFormValue("prev2", v)} placeholder="例如 31" integerOnly />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="當日投注量" value={form.todayBet} setValue={(v) => setFormValue("todayBet", v)} placeholder="例如 563200.75" />
              <Field label="當日得分率" value={form.todayRate} setValue={(v) => setFormValue("todayRate", v)} placeholder="例如 76.4" />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="近30日投注量" value={form.monthBet} setValue={(v) => setFormValue("monthBet", v)} placeholder="例如 12800000.9" />
              <Field label="近30日得分率" value={form.monthRate} setValue={(v) => setFormValue("monthRate", v)} placeholder="例如 90.2" />
            </div>
            <Button onClick={calculate} className="mt-6 w-full rounded-2xl bg-cyan-300 py-6 text-base font-black text-slate-950 hover:bg-cyan-200">啟動AI分析</Button>
          </Panel>

          <Panel>
            <div className="mb-5 flex items-center gap-3"><div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200"><Cpu className="h-6 w-6" /></div><div><Title>當前分析結果</Title><p className="mt-4 text-sm text-slate-400">AI資金曲線分析</p></div></div>
            {latest ? <>
              <div className="grid gap-4 lg:grid-cols-4">
                <MetricCard title="目前狀態" value={latest.label} />
                <MetricCard title="回分傾向" value={latest.returnScore} tone="emerald" />
                <MetricCard title="咬分壓力" value={latest.biteScore} tone="rose" />
                <MetricCard title="本金適配" value={latest.bankrollFit} tone="yellow" />
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <MetricCard title="資金推進率" value={`${latest.volumeRatio}%`} />
                <MetricCard title="得分率落差" value={latest.rateGap} />
                <MetricCard title="波動壓力" value={latest.riskIndex} tone="rose" />
                <MetricCard title="可信度" value={latest.confidence} tone="emerald" />
              </div>
              <AnalysisReport item={latest} />
            </> : <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">尚未產生分析結果</div>}
          </Panel>

          <Panel>
            <div className="mb-5 flex items-center gap-3"><div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200"><History className="h-6 w-6" /></div><Title>歷史查詢紀錄</Title></div>
            <div className="space-y-3">
              {currentHistory.length === 0 && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-400">尚無查詢紀錄</div>}
              {currentHistory.map((item) => <button key={item.id} onClick={() => setSelectedHistory(item)} className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:shadow-[0_0_24px_rgba(34,211,238,0.18)]"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-cyan-100">房號 {item.roomNo}｜{item.label}</div><div className="mt-1 text-xs text-slate-400">{item.time}</div><div className="mt-2 text-xs text-slate-500">資金推進率 {item.volumeRatio}%｜本金適配 {item.bankrollFit}</div></div><div className="text-right text-sm"><div className="text-emerald-200">回 {item.returnScore}</div><div className="text-rose-200">咬 {item.biteScore}</div></div></div></button>)}
            </div>
          </Panel>

          {isMaster && <Panel>
            <div className="mb-5 flex items-center gap-3"><div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200"><KeyRound className="h-6 w-6" /></div><div><Title>臨時通行碼管理</Title><p className="mt-4 text-sm text-slate-400">生成、停用、延長使用時間</p></div></div>
            <div className="flex gap-3"><input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-full rounded-2xl border border-cyan-300/20 bg-slate-950/70 px-4 py-3 text-white outline-none" /><Button onClick={createCode} className="rounded-2xl bg-cyan-300 px-5 text-slate-950 hover:bg-cyan-200"><Plus className="h-4 w-4" /></Button></div>
            <div className="mt-5 space-y-3">{tempCodes.map((item) => <div key={item.code} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-black tracking-widest text-cyan-100">{item.code}</div><div className="mt-1 text-xs text-slate-400">{tempStatus(item)}｜到期 {new Date(item.expiresAt).toLocaleTimeString("zh-TW", { hour12: false })}</div></div><div className="flex gap-2"><Button onClick={() => extendCode(item.code, 10)} className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20">+10分</Button><Button onClick={() => toggleCode(item.code)} className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20">{item.active ? "停用" : "啟用"}</Button></div></div></div>)}</div>
          </Panel>}
        </main>

        <div className="mt-6 rounded-[2rem] border border-cyan-300/20 bg-slate-950/50 p-4 text-center text-xs text-slate-400 backdrop-blur-xl">本系統為虛擬輔助介面與娛樂性數據評估，不保證任何實際結果與收益</div>
      </div>

      {selectedHistory && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" onClick={() => setSelectedHistory(null)}><div className="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-cyan-300/30 bg-slate-950 p-5 shadow-[0_0_60px_rgba(34,211,238,0.35)]" onClick={(e) => e.stopPropagation()}><div className="mb-5 flex items-center justify-between gap-4 border-b border-cyan-300/15 pb-5"><div><div className="text-xs font-black tracking-[0.28em] text-cyan-300/80">HISTORY DETAIL</div><div className="mt-2 text-2xl font-black text-cyan-50">房號 {selectedHistory.roomNo}｜詳細AI分析</div></div><Button onClick={() => setSelectedHistory(null)} className="rounded-2xl bg-white/10 px-5 py-5 text-white hover:bg-white/20"><X className="mr-2 h-4 w-4" />關閉</Button></div><div className="grid gap-4 lg:grid-cols-4"><MetricCard title="目前狀態" value={selectedHistory.label} /><MetricCard title="回分傾向" value={selectedHistory.returnScore} tone="emerald" /><MetricCard title="咬分壓力" value={selectedHistory.biteScore} tone="rose" /><MetricCard title="本金適配" value={selectedHistory.bankrollFit} tone="yellow" /></div><AnalysisReport item={selectedHistory} /></div></div>}
    </div>
  );
}
