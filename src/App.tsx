/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from "react";
import { 
  Sun, Moon, Calendar, RefreshCw, Download, Copy, 
  BookOpen, Quote, Globe, Mic, Play, Pause, LayoutDashboard,
  AlertCircle, FileText, Menu, X, Volume2, Sparkles, Type as TypeIcon,
  MessageSquare, HelpCircle, Info, Star, Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { jsPDF } from "jspdf";

import { generateSection, suggestTopics } from "./services/gemini";
import { AssemblyData, AppSettings, Difficulty, Language, SpecialItemType, ContentLength } from "./types";
import GlassCard from "./components/GlassCard";

export default function App() {
  // --- State ---
  const [data, setData] = useState<AssemblyData>(() => {
    const saved = localStorage.getItem('assembly_data_v2');
    return saved ? JSON.parse(saved) : { timestamp: new Date().toISOString() };
  });
  
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [greeting, setGreeting] = useState("");
  
  const [customTopic, setCustomTopic] = useState("");
  const [specialType, setSpecialType] = useState<SpecialItemType>("Speech");
  const [contentLength, setContentLength] = useState<ContentLength>("Short");
  const [suggestedTopicsList, setSuggestedTopicsList] = useState<string[]>([]);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('assembly_settings_v2');
    return saved ? JSON.parse(saved) : {
      difficulty: 'Middle',
      language: 'English',
      themeColor: '#6366f1',
      isDarkMode: true
    };
  });

  // --- Effects ---
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting("Good Morning");
      else if (hour < 17) setGreeting("Good Afternoon");
      else setGreeting("Good Evening");
    };
    
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute
    
    // Pre-load voices
    window.speechSynthesis.getVoices();
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('assembly_settings_v2', JSON.stringify(settings));
    if (settings.isDarkMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
    // Apply theme color to CSS variable for dynamic styling
    document.documentElement.style.setProperty('--theme-color', settings.themeColor);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('assembly_data_v2', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (isOnline) {
        setIsSuggesting(true);
        try {
          const suggestions = await suggestTopics(selectedDate, settings.language);
          setSuggestedTopicsList(suggestions);
        } catch (err) {
          console.error("Failed to fetch suggestions", err);
        } finally {
          setIsSuggesting(false);
        }
      }
    };
    fetchSuggestions();
  }, [selectedDate, isOnline, settings.language]);

  // --- Handlers ---
  const handleGenerateSection = async (section: 'word' | 'thought' | 'news' | 'special_item' | 'celebration') => {
    if (!isOnline) {
      setError("No internet connection.");
      return;
    }

    setLoadingSections(prev => ({ ...prev, [section]: true }));
    setError(null);
    
    try {
      const result = await generateSection(
        section,
        selectedDate,
        settings.difficulty,
        settings.language,
        {
          specialType,
          customTopic,
          contentLength,
          previousContent: data[section]
        }
      );
      
      setData(prev => ({
        ...prev,
        [section]: result,
        timestamp: new Date().toISOString()
      }));

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
        colors: [settings.themeColor, '#ffffff']
      });
    } catch (err: any) {
      console.error(err);
      setError(`Failed to generate ${section}. Please try again.`);
    } finally {
      setLoadingSections(prev => ({ ...prev, [section]: false }));
    }
  };

  const handleSpeak = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    if (settings.language === 'Hindi') {
      utterance.lang = 'hi-IN';
      // Try to find a Hindi voice
      const hindiVoice = voices.find(v => v.lang.includes('hi'));
      if (hindiVoice) utterance.voice = hindiVoice;
    } else {
      utterance.lang = 'en-US';
      const englishVoice = voices.find(v => v.lang.includes('en'));
      if (englishVoice) utterance.voice = englishVoice;
    }
    
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const downloadAsText = () => {
    if (!data.special_item) return;
    const blob = new Blob([data.special_item.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Special_Segment_${selectedDate}.txt`;
    a.click();
  };

  return (
    <div className="min-h-screen flex font-sans transition-colors duration-500" style={{ '--selection-bg': `${settings.themeColor}4d` } as any}>
      <style>{`
        ::selection {
          background-color: var(--selection-bg);
        }
      `}</style>
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed lg:static z-50 w-72 h-screen glass-card rounded-none border-y-0 border-l-0 flex flex-col"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors"
                  style={{ backgroundColor: settings.themeColor }}
                >
                  <Mic className="text-white w-6 h-6" />
                </div>
                <span className="font-bold text-xl tracking-tight">Assembly<span style={{ color: settings.themeColor }}>Pro</span></span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 mb-2">Main Menu</div>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-slate-400 font-medium hover:bg-white/10 transition-colors">
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </button>
              
              <div className="mt-8 text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 mb-2">Settings</div>
              
              <div className="px-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400">Difficulty</label>
                  <select 
                    value={settings.difficulty}
                    onChange={(e) => setSettings({...settings, difficulty: e.target.value as Difficulty})}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none transition-colors text-slate-200 focus:ring-1"
                    style={{ '--focus-color': settings.themeColor } as any}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--focus-color)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                  >
                    <option value="Primary" className="bg-slate-900">Primary</option>
                    <option value="Middle" className="bg-slate-900">Middle</option>
                    <option value="Senior" className="bg-slate-900">Senior</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400">Language</label>
                  <div className="flex p-1 bg-white/5 rounded-lg border border-white/10">
                    {(['English', 'Hindi'] as Language[]).map(lang => (
                      <button
                        key={lang}
                        onClick={() => setSettings({...settings, language: lang})}
                        className={`flex-1 py-1.5 text-xs rounded-md transition-all ${settings.language === lang ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
                        style={{ backgroundColor: settings.language === lang ? settings.themeColor : 'transparent' }}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400">Theme Color</label>
                  <div className="flex flex-wrap gap-2">
                    {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(color => (
                      <button
                        key={color}
                        onClick={() => setSettings({...settings, themeColor: color})}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${settings.themeColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            <div className="p-6 border-t border-white/10">
              <button 
                onClick={() => setSettings({...settings, isDarkMode: !settings.isDarkMode})}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-sm font-medium text-slate-300">{settings.isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                {settings.isDarkMode ? <Moon className="w-4 h-4" style={{ color: settings.themeColor }} /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto relative custom-scrollbar">
        {/* Header */}
        <header className="sticky top-0 z-40 glass-card rounded-none border-x-0 border-t-0 p-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 z-10 min-w-0">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg shrink-0">
                <Menu className="w-5 h-5 sm:w-6 h-6" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-[11px] sm:text-lg font-bold tracking-tight truncate">
                {greeting}<span className="hidden sm:inline">, Educator!</span>
              </h1>
              <p className="text-[8px] sm:text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center z-0">
            <span className="text-[6px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.3em] opacity-30 whitespace-nowrap">
              made by Vijay Ninama
            </span>
          </div>

          <div className="flex items-center gap-3 z-10">
            <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <Calendar className="w-4 h-4" style={{ color: settings.themeColor }} />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm outline-none text-slate-200"
              />
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Word of the Day */}
            <GlassCard 
              title="Word of the Day" 
              icon={<BookOpen className="w-5 h-5" />} 
              isLoading={loadingSections['word']}
              onRegenerate={() => handleGenerateSection('word')}
              onSpeak={() => data.word && handleSpeak(`${data.word.word}. Meaning: ${data.word.meaning}. Synonym: ${data.word.synonym}. Opposite: ${data.word.antonym}. Example: ${data.word.example}`)}
            >
              {data.word ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold" style={{ color: settings.themeColor }}>{data.word.word}</span>
                    {data.word.pronunciation && <span className="text-xs font-mono text-slate-500">{data.word.pronunciation}</span>}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-relaxed"><span className="text-slate-500 font-bold">Meaning:</span> {data.word.meaning}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Synonym</p>
                        <p className="text-xs">{data.word.synonym}</p>
                      </div>
                      <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Opposite</p>
                        <p className="text-xs">{data.word.antonym}</p>
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 italic text-xs text-slate-400">
                      "{data.word.example}"
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 opacity-50">
                  <Sparkles className="w-8 h-8 mb-2 text-slate-600" />
                  <p className="text-xs">Click refresh to generate</p>
                </div>
              )}
            </GlassCard>

            {/* Thought of the Day */}
            <GlassCard 
              title="Thought of the Day" 
              icon={<Quote className="w-5 h-5" />} 
              isLoading={loadingSections['thought']}
              onRegenerate={() => handleGenerateSection('thought')}
              onSpeak={() => data.thought && handleSpeak(`${data.thought.quote}. Said by ${data.thought.author}`)}
            >
              {data.thought ? (
                <div className="space-y-4 flex flex-col h-full">
                  <div className="relative flex-1">
                    <Quote className="absolute -top-2 -left-2 w-8 h-8 opacity-10" style={{ color: settings.themeColor }} />
                    <p className="text-lg font-medium leading-relaxed italic relative z-10 pt-4">
                      {data.thought.quote}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{ backgroundColor: settings.themeColor }}
                    >
                      {data.thought.author[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{data.thought.author}</h4>
                      {data.thought.bio && <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{data.thought.bio}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 opacity-50">
                  <Sparkles className="w-8 h-8 mb-2 text-slate-600" />
                  <p className="text-xs">Click refresh to generate</p>
                </div>
              )}
            </GlassCard>

            {/* On This Day */}
            <GlassCard 
              title="On This Day" 
              icon={<Calendar className="w-5 h-5" />} 
              isLoading={loadingSections['celebration']}
              onRegenerate={() => handleGenerateSection('celebration')}
              onSpeak={() => data.celebration && handleSpeak(`${data.celebration.title}. ${data.celebration.description}`)}
            >
              {data.celebration ? (
                <div className="space-y-3">
                  <h4 className="text-lg font-bold" style={{ color: settings.themeColor }}>{data.celebration.title}</h4>
                  <p className="text-sm leading-relaxed text-slate-300">{data.celebration.description}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 opacity-50">
                  <Sparkles className="w-8 h-8 mb-2 text-slate-600" />
                  <p className="text-xs">Click refresh to generate</p>
                </div>
              )}
            </GlassCard>

            {/* News Section */}
            <div className="md:col-span-2 lg:col-span-3">
              <GlassCard 
                title="Daily News Bulletin" 
                icon={<Globe className="w-5 h-5" />} 
                isLoading={loadingSections['news']}
                onRegenerate={() => handleGenerateSection('news')}
                onSpeak={() => data.news && handleSpeak(data.news.map(n => n.title).join(". "))}
              >
                {data.news ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['International', 'National', 'Sports'].map(cat => (
                      <div key={cat} className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: settings.themeColor }}>{cat}</span>
                        </div>
                        {data.news?.filter(n => n.category === cat).map((item, i) => (
                          <div key={i} className="group cursor-default space-y-1">
                            <h4 className="font-semibold text-sm transition-colors leading-snug" style={{ color: 'inherit' }}>{item.title}</h4>
                            <p className="text-xs text-slate-500 line-clamp-2">{item.summary}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <Globe className="w-12 h-12 mb-4 text-slate-600" />
                    <p className="text-sm">Generate the latest news updates for the assembly</p>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Special Segment Configuration */}
            <div className="md:col-span-2 lg:col-span-1">
              <GlassCard title="Configure Segment" icon={<Settings className="w-5 h-5" />}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" />
                        Topic
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-bold">
                        Language: {settings.language}
                      </span>
                    </div>
                    <input 
                      type="text"
                      placeholder="Enter custom topic..."
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-200 focus:ring-1"
                      style={{ '--focus-color': settings.themeColor } as any}
                      onFocus={(e) => e.currentTarget.style.borderColor = 'var(--focus-color)'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                      <select 
                        value={specialType}
                        onChange={(e) => setSpecialType(e.target.value as SpecialItemType)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-slate-200"
                      >
                        <option value="Speech" className="bg-slate-900">Speech</option>
                        <option value="Fact" className="bg-slate-900">Amazing Fact</option>
                        <option value="Quiz" className="bg-slate-900">Quiz</option>
                        <option value="Important Day" className="bg-slate-900">Important Day</option>
                        <option value="Moral Story" className="bg-slate-900">Moral Story</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Length</label>
                      <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                        {(['Short', 'Long'] as ContentLength[]).map(l => (
                          <button
                            key={l}
                            onClick={() => setContentLength(l)}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${contentLength === l ? 'text-white' : 'text-slate-500'}`}
                            style={{ backgroundColor: contentLength === l ? settings.themeColor : 'transparent' }}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                    <div className="pt-4 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          Suggested Topics
                        </div>
                        {isSuggesting && <RefreshCw className="w-3 h-3 animate-spin" style={{ color: settings.themeColor }} />}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {isSuggesting ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-6 w-20 bg-white/5 rounded-lg animate-pulse" />
                          ))
                        ) : (
                          suggestedTopicsList.map((t, i) => (
                            <button 
                              key={i}
                              onClick={() => setCustomTopic(t)}
                              className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-400 transition-colors"
                            >
                              {t}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => handleGenerateSection('special_item')}
                        disabled={loadingSections['special_item'] || !isOnline}
                        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: settings.themeColor, color: 'white' }}
                      >
                        {loadingSections['special_item'] ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate Special Segment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
              </GlassCard>
            </div>

            {/* Special Segment Output */}
            <div className="md:col-span-2 lg:col-span-2">
              <GlassCard 
                title="Special Assembly Segment" 
                icon={<Mic className="w-5 h-5" />} 
                isLoading={loadingSections['special_item']}
                onRegenerate={() => handleGenerateSection('special_item')}
                onSpeak={() => data.special_item && handleSpeak(data.special_item.content)}
              >
                {data.special_item ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span 
                        className="px-2 py-1 text-[10px] rounded font-black uppercase tracking-widest text-white"
                        style={{ backgroundColor: settings.themeColor }}
                      >
                        {data.special_item.type}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={downloadAsText} className="p-2 hover:bg-white/10 rounded-lg text-slate-400"><Download className="w-4 h-4" /></button>
                        <button onClick={() => handleSpeak(data.special_item?.content || "")} className="p-2 hover:bg-white/10 rounded-lg text-slate-400"><Volume2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {data.special_item.title && <h4 className="text-xl font-bold">{data.special_item.title}</h4>}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-sm leading-loose text-slate-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar">
                      {data.special_item.content}
                    </div>
                    {data.special_item.answer && (
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                        <p className="text-[10px] font-black text-emerald-500 uppercase mb-1 tracking-widest">Answer</p>
                        <p className="text-sm font-medium">{data.special_item.answer}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-20 opacity-50">
                    <Mic className="w-12 h-12 mb-4 text-slate-600" />
                    <p className="text-sm">Configure and generate your special assembly speech or activity</p>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-8 text-center text-slate-500 text-[10px] uppercase font-bold tracking-widest border-t border-white/10">
          <p className="mb-2 md:hidden opacity-40">made by Vijay Ninama</p>
          <p>© 2024 AI Smart Assembly Pro • Crafted with Gemini AI</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              {isOnline ? 'System Online' : 'Offline Mode'}
            </span>
            <span>•</span>
            <span>Sync: {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Never'}</span>
          </div>
        </footer>
      </main>

      <style>{`
        :root {
          --theme-color: #6366f1;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        select option {
          background-color: #0f172a;
          color: #f1f5f9;
        }
      `}</style>
    </div>
  );
}
