import React, { useEffect, useState, useCallback } from 'react';
import { 
  Menu, 
  X, 
  Check, 
  Trophy, 
  RotateCcw, 
  ChevronRight, 
  Target, 
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  Trash2, 
  LayoutGrid,
  Clock,
  Edit,
  LogOut,
  ListTodo,
  TrendingUp,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { useStore, calculateRequiredXP, calculateRank } from './store';
import { 
  ManageQuestsModal, 
  ManageStreakModal, 
  ResetDayModal, 
  ManageProgressModal,
  TemporaryQuestHistoryModal,
  ProgressChartModal
} from './components/Modals';
import Login from './components/Login';
import { firebaseService } from './services/firebase';

const App: React.FC = () => {
  const store = useStore();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const userCode = useStore((state) => state.userCode);
  const isSyncing = useStore((state) => state.isSyncing);
  const lastSyncAt = useStore((state) => state.lastSyncAt);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  
  // Modal States
  const [showProgressChart, setShowProgressChart] = useState(false);
  const [showManageProgress, setShowManageProgress] = useState(false);
  const [showManagePermanent, setShowManagePermanent] = useState(false);
  const [showManageTemporary, setShowManageTemporary] = useState(false);
  const [showManageStreak, setShowManageStreak] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showTemporaryHistory, setShowTemporaryHistory] = useState(false);

  const announceLevelUp = useCallback(() => {
    if (!store.voiceEnabled) return;
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance("New level acquired.");
    const voices = synth.getVoices();
    const femaleVoice = voices.find(v => 
      v.name.includes('Google UK English Female') || 
      v.name.includes('Samantha') || 
      v.name.toLowerCase().includes('female')
    );
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.pitch = 1.1;
    utterance.rate = 1.0;
    synth.speak(utterance);
  }, [store.voiceEnabled]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    let unsubscribe: any = null;

    if (isAuthenticated) {
      store.checkDailyReset();
      
      // Live Cloud Subscription
      if (userCode) {
        unsubscribe = firebaseService.subscribeToChanges(userCode, (remoteState) => {
          store.applyRemoteState(remoteState);
        });
      }
    }

    const onLevelUp = () => announceLevelUp();
    window.addEventListener('level-up', onLevelUp);
    
    return () => {
      clearInterval(timer);
      if (unsubscribe) unsubscribe();
      window.removeEventListener('level-up', onLevelUp);
    };
  }, [announceLevelUp, store.checkDailyReset, isAuthenticated, userCode]);

  if (!isAuthenticated) {
    return <Login />;
  }

  const requiredXP = calculateRequiredXP(store.level);
  const xpProgress = (store.xp / requiredXP) * 100;
  const rank = calculateRank(store.level);

  const handleAddCustomQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newQuestTitle.trim()) {
      store.addQuest(newQuestTitle.trim(), 'temporary');
      setNewQuestTitle('');
    }
  };

  const allQuests = [...store.permanentQuests, ...store.temporaryQuests];
  const columns = Math.ceil(allQuests.length / 7) || 1;
  const gridTemplateColumns = columns === 1 
    ? 'repeat(1, minmax(350px, 500px))' 
    : `repeat(${columns}, minmax(300px, 1fr))`;

  let textSize = 'text-[13px]';
  if (columns === 2) textSize = 'text-[12px]';
  if (columns >= 3) textSize = 'text-[11px]';

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden p-2">
      
      {/* HUD CONTROLS */}
      <div className="absolute top-4 left-6 z-50 flex items-center gap-4">
        <button 
          onClick={() => setShowMenu(true)}
          className="p-3 system-panel border-cyan-500/60 hover:border-cyan-400 transition-all bg-zinc-950/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          <Menu className="text-cyan-400" size={22} />
        </button>

        {/* CLOUD SYNC HUD INDICATOR */}
        <div className="system-panel border-cyan-500/20 px-3 py-1 flex items-center gap-3 bg-zinc-950/20 backdrop-blur-sm shadow-[0_0_10px_rgba(6,182,212,0.1)]">
          {isSyncing ? (
            <RefreshCw className="text-cyan-400 animate-spin" size={12} />
          ) : (
            <Cloud className="text-cyan-400/50" size={12} />
          )}
          <div className="flex flex-col">
            <span className="text-[6px] font-black text-zinc-500 uppercase tracking-widest leading-none">DATABASE_LINK</span>
            <span className="text-[8px] font-bold text-cyan-400/80 tracking-tighter uppercase leading-none mt-0.5">
              {isSyncing ? 'UPLOADING...' : 'LIVE'}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-6 z-50">
        <div className="system-panel border-cyan-500/60 px-6 py-2 text-center bg-zinc-950/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">SYST_HUD_v5.0</div>
          <div className="font-orbitron text-2xl font-black text-cyan-400 tracking-widest leading-none">
            {currentTime.toLocaleTimeString([], { hour12: false })}
          </div>
        </div>
      </div>

      {/* SYSTEM MAIN MODULE */}
      <main className="w-full flex items-center justify-center h-full">
        <div className="main-frame p-4 md:p-8 animate-in fade-in zoom-in duration-500 bg-transparent">
          
          {/* PLAYER STATUS HEADER */}
          <div className="flex flex-col items-center gap-1.5 mb-4">
            <h1 className="font-orbitron text-3xl font-black text-white tracking-[0.5em] uppercase neon-text leading-none mb-1">
              PLAYER STATUS
            </h1>
            
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-1 text-[13px] font-bold uppercase tracking-[0.2em] text-zinc-200">
              <div className="flex items-center gap-2">LEVEL: <span className="text-cyan-400 font-orbitron">{store.level}</span></div>
              <div className="flex items-center gap-2">RANK: <span className="text-cyan-400 font-orbitron">{rank}</span></div>
              <div className="flex items-center gap-2">XP: <span className="text-cyan-400 font-orbitron">{Math.floor(store.xp)} / {requiredXP}</span></div>
              <div className="flex items-center gap-2">STREAK: <span className="text-cyan-400 font-orbitron">{store.streak.current}D | {store.streak.longest}D</span> 🔥</div>
            </div>

            <div className="w-full max-w-2xl px-2 mt-1">
              <div className="h-4 w-full bg-zinc-950/40 border-2 border-cyan-500/60 relative overflow-hidden shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-700 via-cyan-400 to-white shadow-[0_0_25px_rgba(6,182,212,1)] transition-all duration-1000 ease-out"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="neon-strip mb-3" />

          {/* TODAY'S QUEST GRID */}
          <div className="flex flex-col gap-1.5 mb-3 flex-1 overflow-hidden">
            <h3 className="text-[15px] font-bold text-cyan-400 tracking-[0.4em] uppercase pb-1 flex items-center justify-center gap-3">
              <Target size={18} className="animate-pulse text-white shadow-[0_0_10px_#fff]" /> TODAY’S QUEST
            </h3>
            
            <div className="flex justify-center h-full overflow-hidden">
              <div 
                className="overflow-hidden h-full content-center"
                style={{
                  display: 'grid',
                  gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
                  gridAutoFlow: 'column',
                  gridTemplateColumns: gridTemplateColumns,
                  gap: '6px 30px',
                  justifyContent: 'center',
                  maxWidth: '100%'
                }}
              >
                {allQuests.map((quest) => (
                  <label key={quest.id} className="quest-row flex items-center gap-4 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={quest.completed}
                      onChange={() => store.toggleQuest(quest.id, quest.type)}
                      className="hidden"
                    />
                    <div className={`checkbox-hud flex-shrink-0 ${quest.completed ? 'checked' : ''}`}>
                      {quest.completed && <Check className="text-white drop-shadow-[0_0_5px_#fff]" size={16} strokeWidth={4} />}
                    </div>
                    <span className={`${textSize} font-bold tracking-[0.1em] uppercase transition-all truncate-hud flex-1 ${
                      quest.completed ? 'text-zinc-500 line-through' : 'text-zinc-200 group-hover:text-cyan-400'
                    }`}>
                      {quest.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="neon-strip mt-1" />

          {/* CUSTOM QUEST INPUT */}
          <div className="flex flex-col gap-1.5 mt-2 pt-1">
            <h3 className="text-[11px] font-bold text-cyan-400 tracking-[0.3em] uppercase flex items-center gap-2 justify-center">
              <LayoutGrid size={12} /> ADD CUSTOM QUEST
            </h3>
            <div className="flex justify-center w-full">
              <form onSubmit={handleAddCustomQuest} className="flex gap-3 w-full max-w-2xl">
                <input 
                  type="text" 
                  value={newQuestTitle}
                  onChange={(e) => setNewQuestTitle(e.target.value)}
                  placeholder="INPUT DIRECTIVE TITLE..."
                  className="flex-1 bg-zinc-950/30 border-2 border-cyan-500/40 px-4 py-1.5 focus:outline-none focus:border-cyan-400 text-[11px] font-bold tracking-widest text-white uppercase placeholder:opacity-30 transition-all shadow-inner"
                />
                <button type="submit" className="bg-cyan-900/40 hover:bg-cyan-600/60 text-cyan-400 px-6 py-1.5 border-2 border-cyan-500/60 font-bold text-[10px] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  INITIALIZE
                </button>
              </form>
            </div>
          </div>

          {/* DISCIPLINE VALIDATION */}
          <div className="flex flex-col gap-1.5 mt-2 pt-1">
            <h3 className="text-[11px] font-bold text-cyan-400 tracking-[0.3em] uppercase flex items-center gap-2 justify-center">
              <RotateCcw size={12} /> DISCIPLINE CHECK
            </h3>
            <div className="flex justify-center w-full">
              <div className="flex flex-col gap-1.5 w-full max-w-2xl overflow-y-auto max-h-[120px] custom-scroll pr-1">
                {store.disciplineChecks.map(check => {
                  const today = new Date().toDateString();
                  const isFailedToday = check.lastFailedDate === today;
                  return (
                    <div key={check.id} className="flex items-center justify-between group bg-zinc-950/20 p-0.5 px-5 border border-cyan-500/10 hover:border-cyan-500/30 transition-all rounded">
                      <span className="text-[10px] font-bold text-zinc-300 tracking-widest uppercase group-hover:text-white transition-colors truncate pr-4">
                        {check.title}
                      </span>
                      <button 
                        onClick={() => store.triggerDisciplineFailure(check.id)}
                        className={`px-6 py-1 border-2 border-cyan-500/40 text-cyan-400 font-black text-[9px] tracking-widest transition-all ${isFailedToday ? 'yes-button-active' : 'hover:bg-cyan-500/20'}`}
                      >
                        YES
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* PROGRESS BUTTON */}
      <button 
        onClick={() => setShowProgressChart(true)}
        className="absolute bottom-6 right-6 flex items-center gap-3 px-6 py-3 system-panel border-2 border-cyan-500/60 hover:border-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] group bg-zinc-950/40"
      >
        <TrendingUp className="text-cyan-400 group-hover:scale-125 transition-transform" size={18} />
        <span className="font-orbitron text-[10px] font-black text-cyan-400 tracking-[0.4em] uppercase">PROGRESS</span>
      </button>

      {/* SYSTEM MENU OVERLAY */}
      <div className={`fixed inset-0 z-[200] transition-opacity duration-300 ${showMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowMenu(false)} />
        <div className={`absolute top-0 left-0 h-full w-full sm:w-[320px] bg-black border-r border-cyan-500/30 transition-transform duration-500 ease-out flex flex-col ${showMenu ? 'translate-x-0' : '-translate-x-full'}`}>
           <div className="absolute inset-0 z-[-1] opacity-20 overflow-hidden pointer-events-none"><div className="grid-layer" /></div>
           <div className="p-8 pb-4">
              <h2 className="font-orbitron text-xl font-black text-cyan-400 tracking-[0.2em] uppercase neon-text mb-4">MENU</h2>
              <div className="h-[1px] w-full bg-gradient-to-r from-cyan-500 to-transparent mb-8" />
           </div>
           <div className="flex-1 overflow-y-auto px-6 space-y-2">
              <MenuButton icon={<Trash2 size={20} />} label="Manage Progress" onClick={() => { setShowManageProgress(true); setShowMenu(false); }} />
              <MenuButton icon={<Edit size={20} />} label="Manage Quests" onClick={() => { setShowManagePermanent(true); setShowMenu(false); }} />
              <MenuButton icon={<Clock size={20} />} label="Temporary Quests" onClick={() => { setShowTemporaryHistory(true); setShowMenu(false); }} />
              <MenuButton icon={<Target size={20} />} label="Manage Streak" onClick={() => { setShowManageStreak(true); setShowMenu(false); }} />
              <MenuButton icon={<RotateCcw size={20} />} label="Reset Day" onClick={() => { setShowResetConfirm(true); setShowMenu(false); }} />
              <div className="h-[1px] w-full bg-zinc-800 my-4" />
              <MenuButton icon={<LogOut size={20} />} label="Logout" onClick={() => { store.logout(); setShowMenu(false); }} />
           </div>
           <div className="p-8 border-t border-zinc-900 bg-zinc-950/50">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-zinc-400 font-bold text-[11px] tracking-widest uppercase">
                  {store.voiceEnabled ? <Volume2 size={18} className="text-cyan-400" /> : <VolumeX size={18} />} Neural Link
                </div>
                <button onClick={store.toggleVoice} className="w-12 h-6 border border-cyan-500/50 bg-cyan-950/20 transition-all relative">
                  <div className={`absolute top-0.5 w-4.5 h-4.5 transition-all ${store.voiceEnabled ? 'right-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,1)]' : 'left-0.5 bg-zinc-700'}`} />
                </button>
             </div>
           </div>
        </div>
      </div>

      {/* GLOBAL MODALS */}
      <ManageProgressModal isOpen={showManageProgress} onClose={() => setShowManageProgress(false)} />
      <ManageQuestsModal isOpen={showManagePermanent} onClose={() => setShowManagePermanent(false)} type="permanent" />
      <ManageQuestsModal isOpen={showManageTemporary} onClose={() => setShowManageTemporary(false)} type="temporary" />
      <TemporaryQuestHistoryModal isOpen={showTemporaryHistory} onClose={() => setShowTemporaryHistory(false)} />
      <ManageStreakModal isOpen={showManageStreak} onClose={() => setShowManageStreak(false)} />
      <ResetDayModal isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} />
      <ProgressChartModal isOpen={showProgressChart} onClose={() => setShowProgressChart(false)} />
    </div>
  );
};

const MenuButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-6 p-4 rounded-lg hover:bg-cyan-500/10 group transition-all duration-200 border border-transparent hover:border-cyan-500/20">
    <div className="text-cyan-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all">{icon}</div>
    <span className="text-zinc-300 group-hover:text-white font-bold tracking-[0.05em] text-[15px] transition-all group-hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">{label}</span>
  </button>
);

export default App;