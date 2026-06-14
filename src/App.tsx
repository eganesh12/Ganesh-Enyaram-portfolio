import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Cpu, Github, Linkedin, Eye, CheckCircle2, Terminal, Sun, Moon, ChevronUp, Activity, Languages, Globe, Lock, ShieldCheck } from "lucide-react";
import BackgroundParticles from "./components/BackgroundParticles";
import Hero from "./components/Hero";
import About from "./components/About";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Certifications from "./components/Certifications";
import ExperienceAchievements from "./components/ExperienceAchievements";
import Contact from "./components/Contact";
import DeepSubpageView from "./components/DeepSubpageView";
import AuthPage from "./components/AuthPage";
import { AnalyticsStats } from "./types";
import { LanguageProvider, useLanguage, Language } from "./context/LanguageContext";
import { useAuth } from "./context/AuthContext";

const LANGUAGES_LIST: { code: Language; name: string; flag: string }[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "hi", name: "हिंदी (Hindi)", flag: "🇮🇳" },
  { code: "te", name: "తెలుగు (Telugu)", flag: "🇮🇳" },
  { code: "ta", name: "தமிழ் (Tamil)", flag: "🇮🇳" },
  { code: "bn", name: "বাংলা (Bengali)", flag: "🇮🇳" },
  { code: "mr", name: "मराठी (Marathi)", flag: "🇮🇳" },
  { code: "kn", name: "ಕನ್ನಡ (Kannada)", flag: "🇮🇳" },
  { code: "ml", name: "മലയാളം (Malayalam)", flag: "🇮🇳" },
  { code: "gu", name: "ગુજરાતી (Gujarati)", flag: "🇮🇳" },
  { code: "pa", name: "ਪੰਜਾਬੀ (Punjabi)", flag: "🇮🇳" },
];

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("portfolio-theme");
    return saved === "light" ? "light" : "dark";
  });

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
    localStorage.setItem("portfolio-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Scroll Position tracking state
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show back to top if scrolled past the hero section (e.g. > 400px)
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial compute
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Database Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsStats>({
    visitors: 142,
    resumeDownloads: 34,
    contactRequests: 12,
    projectViews: 245,
    chatbotUsage: 98,
  });

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setAnalytics(data);
        } else {
          console.warn("Analytics fetch returned non-JSON content type:", contentType);
        }
      }
    } catch (err) {
      console.warn("Failed to query database analytics (offline or starting):", err);
    }
  };

  // Tracking endpoint router
  const trackAction = async (metricName: string) => {
    try {
      const res = await fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: metricName }),
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.analytics) {
            setAnalytics(data.analytics);
          }
        } else {
          console.warn("Analytics tracking returned non-JSON response:", contentType);
        }
      }
    } catch (err) {
      console.warn("Action track failing (offline or starting):", err);
    }
  };

  useEffect(() => {
    // Initial fetches
    fetchAnalytics();
    
    // Auto increment visitor stats but limit to once per session
    if (!sessionStorage.getItem("visitor_tracked")) {
      trackAction("visitors");
      sessionStorage.setItem("visitor_tracked", "true");
    }

    // Auto increment project/system views once per session to represent live views
    if (!sessionStorage.getItem("project_viewed")) {
      trackAction("projectViews");
      sessionStorage.setItem("project_viewed", "true");
    }

    // Set up a background poller to fetch real-time state for stats counters (e.g. System Views)
    const intervalId = setInterval(() => {
      fetchAnalytics();
    }, 4000);

    setLoading(false);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Query parameter views logic for exclusive detailed subpages
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<"overview" | "media" | "specifications">("overview");

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      const tabParam = params.get("tab");
      if (viewParam) {
        const clean = viewParam.toLowerCase().replace("-section", "").replace("section", "");
        setCurrentView(clean);
        if (tabParam === "media" || tabParam === "specifications") {
          setCurrentTab(tabParam);
        } else {
          setCurrentTab("overview");
        }
        // Scroll to top when view changes
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const hash = window.location.hash;
        if (hash && hash.includes("-section")) {
          const cleanHash = hash.replace("#", "").replace("-section", "").replace("section", "");
          setCurrentView(cleanHash);
          setCurrentTab("overview");
        } else {
          setCurrentView(null);
        }
      }
    };

    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  // Scroll to hash on page load (e.g. when opened in a new page/tab)
  useEffect(() => {
    if (!loading && !currentView) {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        const timer = setTimeout(() => {
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, currentView]);

  const handleNavigateToSection = (id: string, scrollSamePage: boolean = false) => {
    const cleanId = id.replace("-section", "").replace("section", "");

    if (id === "back-to-hub") {
      window.history.pushState({}, "", "/");
      setCurrentView(null);
      setMobileMenuOpen(false);
      return;
    }

    if (id.startsWith("subpage-")) {
      const tabName = id.replace("subpage-", "").replace("-tab", "") as "overview" | "media" | "specifications";
      setCurrentTab(tabName);
      setMobileMenuOpen(false);
      
      // Update URL with tab query parameter to make it robust
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tabName);
      window.history.pushState({}, "", `/?${params.toString()}`);
      
      // Perform automated smooth scroll so cursor/screen targets the tab content automatically
      setTimeout(() => {
        const el = document.getElementById("subpage-content-tabs-container");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          
          // Flash glowing rings to highlight that cursor/view moved there automatically
          el.classList.add("ring-2", "ring-cyan-400", "ring-offset-2", "ring-offset-slate-950", "shadow-[0_0_20px_rgba(6,182,212,0.5)]");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-cyan-400", "ring-offset-2", "ring-offset-slate-950", "shadow-[0_0_20px_rgba(6,182,212,0.5)]");
          }, 1200);
        }
      }, 100);
      return;
    }

    if (cleanId === "hero" || cleanId === "home") {
      if (currentView) {
        window.history.pushState({}, "", "/");
        setCurrentView(null);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      setActiveSection("hero-section");
      setMobileMenuOpen(false);
      return;
    }

    if (scrollSamePage && !currentView) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      if (currentView) {
        // If already inside subpage tab mode, transition on current page
        window.history.pushState({}, "", `/?view=${cleanId}`);
        setCurrentView(cleanId);
        setCurrentTab("overview");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Open deep subpage
        window.open(`${window.location.origin}/?view=${cleanId}`, "_blank");
      }
    }
    setMobileMenuOpen(false);
  };

  const menuItems = currentView
    ? [
        { label: "← Hub Menu", id: "back-to-hub" },
        { label: "Profile Summary & CV", id: "subpage-overview-tab" },
        { label: "Visual Workspace & Evidence", id: "subpage-media-tab" },
        { label: "Technical Specs Ledger", id: "subpage-specifications-tab" }
      ]
    : [
        { label: t("nav.home", "Home"), id: "hero-section" },
        { label: t("nav.about", "About"), id: "about-section" },
        { label: t("nav.skills", "Skills"), id: "skills-section" },
        { label: t("nav.projects", "Projects"), id: "projects-section" },
        { label: t("nav.certifications", "Certifications"), id: "certifications-section" },
        { label: t("nav.contact", "Contact"), id: "contact-section" },
      ];

  // Scroll spy active section track
  const [activeSection, setActiveSection] = useState("hero-section");

  // Dynamic Browser Tab Title updating based on active section or current deep view
  useEffect(() => {
    if (loading) return;
    const targetView = currentView || activeSection.replace("-section", "");
    const baseItems = [
      { label: t("nav.home", "Home"), id: "hero-section" },
      { label: t("nav.about", "About"), id: "about-section" },
      { label: t("nav.skills", "Skills"), id: "skills-section" },
      { label: t("nav.projects", "Projects"), id: "projects-section" },
      { label: t("nav.certifications", "Certifications"), id: "certifications-section" },
      { label: t("nav.contact", "Contact"), id: "contact-section" },
    ];
    const currentItem = baseItems.find((item) => item.id.replace("-section", "") === targetView);
    if (currentItem && targetView !== "hero" && targetView !== "home") {
      document.title = `${currentItem.label} Detailed | Ganesh Enyaram | AI/ML & Data Engineer`;
    } else {
      document.title = "Ganesh Enyaram | AI/ML & Data Engineer";
    }
  }, [activeSection, currentView, language, loading]);

  // Track currently hovered item in navbar
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  useEffect(() => {
    if (loading || currentView) return;

    const baseItems = [
      { label: t("nav.home", "Home"), id: "hero-section" },
      { label: t("nav.about", "About"), id: "about-section" },
      { label: t("nav.skills", "Skills"), id: "skills-section" },
      { label: t("nav.projects", "Projects"), id: "projects-section" },
      { label: t("nav.certifications", "Certifications"), id: "certifications-section" },
      { label: t("nav.contact", "Contact"), id: "contact-section" },
    ];

    const observerOptions = {
      root: null,
      rootMargin: "-25% 0px -45% 0px",
      threshold: 0.1,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    baseItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => {
      baseItems.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) observer.unobserve(el);
      });
    };
  }, [loading, currentView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <Cpu className="w-12 h-12 text-cyan-400 animate-spin" />
        <p className="font-mono text-xs tracking-widest text-slate-400">CONNECTING INTERACTIVE PORTFOLIO CORRIDORS...</p>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen ${theme === "light" ? "light text-slate-900 bg-slate-950" : "dark text-slate-100 bg-slate-950"} overflow-x-hidden font-sans selection:bg-cyan-500/35 selection:text-white transition-colors duration-300`}>
      {/* Background canvas particles */}
      <BackgroundParticles />

      {/* Floating Header Navbar */}
      <header className="fixed top-0 md:top-4 inset-x-0 mx-auto w-full max-w-6xl md:px-6 z-50 h-16 pointer-events-none">
        <motion.div 
          initial={false}
          animate={{
            backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.75)" : "rgba(8, 11, 26, 0.65)",
            borderColor: theme === "light" ? "rgba(226, 232, 240, 0.8)" : "rgba(30, 41, 59, 0.7)",
            boxShadow: theme === "light" 
              ? "0 10px 30px -10px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.6)" 
              : "0 16px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.04), 0 0 15px rgba(6, 182, 212, 0.04)",
          }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-full flex items-center justify-between px-4 sm:px-6 md:rounded-2xl border backdrop-blur-xl pointer-events-auto"
        >
          <div 
            onClick={() => handleNavigateToSection("hero-section")}
            className="flex items-center gap-2.5 cursor-pointer group pointer-events-auto"
          >
            <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.35)] relative overflow-hidden group-hover:scale-105 transition-all duration-300">
              <span className="relative z-10">GE</span>
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white text-[1px] select-none" />
            </div>
            <div className="flex flex-col">
              <span className={`font-mono text-[10.5px] font-black tracking-widest leading-none ${
                theme === "light" ? "text-slate-900" : "text-white group-hover:text-cyan-400 transition-colors"
              }`}>
                GANESH ENYARAM
              </span>
              <span className="font-mono text-[8px] text-slate-500 dark:text-cyan-400/70 tracking-wider">
                AI/ML & DATA ENGINEER
              </span>
            </div>
          </div>

          {/* Desktop nav anchors with smooth futuristic pill slider & hover tracker */}
          <nav className={`hidden md:flex items-center gap-1 p-1 rounded-xl relative transition-colors duration-300 ${
            theme === "light" ? "bg-slate-100/55 border border-slate-205/30" : "bg-slate-900/20 border border-slate-850/25"
          }`}>
            {menuItems.map((item, id) => {
              const isActive = currentView 
                ? (item.id === `subpage-${currentTab}-tab`)
                : activeSection === item.id;
              const isHovered = hoveredSection === item.id;
              return (
                <button
                  key={id}
                  onClick={() => handleNavigateToSection(item.id)}
                  onMouseEnter={() => setHoveredSection(item.id)}
                  onMouseLeave={() => setHoveredSection(null)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-[10.5px] font-mono uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? theme === "light" ? "text-indigo-600 font-extrabold" : "text-cyan-400 font-extrabold"
                      : "text-slate-400 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  {/* Subtle hovered indicator using layoutId that glides seamlessly across items */}
                  {isHovered && !isActive && (
                    <motion.span
                      layoutId="hoverNavIndicator"
                      className={`absolute inset-0 rounded-lg -z-10 ${
                        theme === "light"
                          ? "bg-slate-200/50"
                          : "bg-slate-800/40"
                      }`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}

                  {/* Active selection sliding indicator with neon/soft glow */}
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className={`absolute inset-0 rounded-lg -z-10 ${
                        theme === "light"
                          ? "bg-white border border-slate-200/60 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                          : "bg-cyan-950/30 border border-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                      }`}
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Action Buttons & System HUD */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <div className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-[10.5px] font-mono leading-none ${
                  theme === "light"
                    ? "bg-slate-100 border-slate-200 text-indigo-650 font-bold"
                    : "bg-cyan-950/35 border-cyan-500/20 text-cyan-400"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="max-w-[70px] truncate uppercase tracking-wider font-extrabold">{user.displayName || user.email?.split("@")[0]}</span>
                </div>
                <button
                  onClick={() => logout()}
                  className={`px-2.5 py-1.5 rounded-xl border text-[10.5px] font-mono font-bold transition-all cursor-pointer hover:border-rose-500/40 hover:text-rose-400 ${
                    theme === "light"
                      ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-650 shadow-sm"
                      : "bg-slate-900/60 hover:bg-slate-850 border-slate-850/80 text-slate-400 hover:text-white"
                  }`}
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavigateToSection("auth")}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-[10.5px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-cyan-500/25 active:scale-98"
              >
                <Lock className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                Sign In
              </button>
            )}

            <button
              onClick={toggleTheme}
              className={`w-9.5 h-9.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center overflow-hidden relative ${
                theme === "light"
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-755 shadow-sm"
                  : "bg-slate-900/60 hover:bg-slate-850 border-slate-850/80 text-slate-400 hover:text-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]"
              }`}
              title={theme === "light" ? "Switch to Dark Cyberpunk" : "Switch to High-Contrast Light Mode"}
              aria-label="Toggle visual theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, scale: 0.7, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="flex items-center justify-center w-full h-full"
                >
                  {theme === "light" ? (
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </motion.div>
              </AnimatePresence>
            </button>

            {/* Language Dropdown Selector with Framer Motion and Glassmorphism */}
            <div className="relative pointer-events-auto">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className={`w-9.5 h-9.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center overflow-hidden relative ${
                  theme === "light"
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-755 shadow-sm"
                    : "bg-slate-900/60 hover:bg-slate-850 border-slate-850/80 text-slate-400 hover:text-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]"
                }`}
                title="Change Language / भाषा बदलें"
                aria-label="Toggle language menu"
              >
                <Languages className="w-4 h-4 text-cyan-400" />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`absolute right-0 mt-2 w-40 max-h-72 overflow-y-auto rounded-xl border p-1 shadow-xl backdrop-blur-xl z-50 ${
                        theme === "light"
                          ? "bg-white/95 border-slate-200 text-slate-800 shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                          : "bg-slate-950/90 border-slate-900/90 text-white shadow-[0_12px_42px_rgba(0,0,0,0.5)]"
                      }`}
                    >
                      {LANGUAGES_LIST.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setLangOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-mono rounded-lg transition-all flex items-center justify-between ${
                            language === lang.code
                              ? theme === "light"
                                ? "bg-indigo-50 text-indigo-600 font-extrabold"
                                : "bg-cyan-950/40 text-cyan-400 font-extrabold"
                              : "text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-900/50"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                          {language === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile responsive toggle */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile language dropdown switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center overflow-hidden relative ${
                  theme === "light" ? "text-slate-655 hover:text-slate-900 bg-slate-100 border border-slate-200" : "text-slate-300 hover:text-white bg-slate-900/60"
                }`}
                title="Change Language / भाषा बदलें"
                aria-label="Toggle language menu"
              >
                <Languages className="w-3.5 h-3.5 text-cyan-400" />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={`absolute right-0 mt-2 w-36 max-h-60 overflow-y-auto rounded-lg border p-1 shadow-lg backdrop-blur-xl z-50 ${
                        theme === "light" ? "bg-white/95 border-slate-200 text-slate-800" : "bg-slate-950/90 border-slate-900/90 text-white"
                      }`}
                    >
                      {LANGUAGES_LIST.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setLangOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 text-[10px] font-mono rounded transition-all flex items-center justify-between ${
                            language === lang.code ? "text-cyan-404 font-bold" : "text-slate-400"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={toggleTheme}
              className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center overflow-hidden relative ${
                theme === "light" ? "text-slate-655 hover:text-slate-900 bg-slate-100 border border-slate-200" : "text-slate-300 hover:text-white bg-slate-900/60"
              }`}
              aria-label="Toggle visual theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, scale: 0.7, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="flex items-center justify-center w-full h-full"
                >
                  {theme === "light" ? (
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </motion.div>
              </AnimatePresence>
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-1.5 rounded-lg transition-all ${
                theme === "light" ? "text-slate-600 hover:text-slate-900" : "text-slate-300 hover:text-white"
              }`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>
      </header>

      {/* Mobile drawer links */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-x-0 mx-auto max-w-lg z-40 p-5 flex flex-col gap-2 font-mono text-center shadow-2xl backdrop-blur-xl border-x border-b ${
              theme === "light"
                ? "top-16 bg-white/95 border-slate-200 text-slate-800"
                : "top-16 bg-slate-950/95 border-slate-900/90 text-white"
            }`}
          >
            {menuItems.map((item, id) => {
                const isActive = currentView 
                  ? (item.id === `subpage-${currentTab}-tab`)
                  : activeSection === item.id;
              return (
                <button
                  key={id}
                  onClick={() => handleNavigateToSection(item.id)}
                  className={`w-full py-3 px-4 rounded-xl text-left text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-between ${
                    isActive
                      ? theme === "light"
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-150/40"
                        : "bg-cyan-950/30 text-cyan-400 border border-cyan-500/20 shadow-sm"
                      : theme === "light"
                        ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className={`w-1.5 h-1.5 rounded-full ${theme === "light" ? "bg-indigo-500" : "bg-cyan-400"}`} />
                  )}
                </button>
              );
            })}

            {/* Mobile Sign In / Out section */}
            <div className="pt-3 border-t border-slate-900 mt-2 flex flex-col gap-2">
              {user ? (
                <div className="px-4 py-2 bg-slate-905/30 rounded-xl text-left flex items-center justify-between border border-slate-900">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest leading-none">Logged In</span>
                    <span className="text-xs font-bold text-slate-200 mt-1 truncate max-w-[150px]">{user.displayName || user.email?.split("@")[0]}</span>
                  </div>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="px-3 py-1.5 rounded-lg border border-rose-500/35 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { handleNavigateToSection("auth"); setMobileMenuOpen(false); }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-505 text-white text-xs uppercase tracking-widest font-bold font-mono cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  Sign In / Register
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Section stacks */}
      <main className="relative z-10 w-full">
        {currentView ? (
          currentView === "auth" ? (
            <AuthPage 
              theme={theme}
              onBack={() => {
                window.history.pushState({}, "", "/");
                setCurrentView(null);
              }}
            />
          ) : (
            <DeepSubpageView 
              view={currentView}
              theme={theme}
              onBack={() => {
                window.history.pushState({}, "", "/");
                setCurrentView(null);
              }}
              onTrackAction={trackAction}
              fetchAnalytics={fetchAnalytics}
              analytics={analytics}
              activeTab={currentTab}
              onTabChange={setCurrentTab}
            />
          )
        ) : (
          <>
            {/* HERO */}
            <Hero 
              analytics={analytics} 
              onTrackAction={trackAction}
              onNavigateToContact={() => handleNavigateToSection("contact-section", true)}
            />

            {/* ABOUT */}
            <About />

            {/* SKILLS */}
            <Skills />

            {/* PROJECTS */}
            <Projects />

            {/* CERTIFICATIONS */}
            <Certifications />

            {/* CHRONOLOGY & SYSTEM EXPERIENCES */}
            <ExperienceAchievements />

            {/* CONTACT BRIDGES */}
            <Contact 
              onTrackAction={trackAction} 
              onTrackerRefresh={fetchAnalytics} 
              onNavigateToAuth={() => handleNavigateToSection("auth")}
            />
          </>
        )}
      </main>

      {/* SYSTEM FOOTER */}
      <footer className="relative bg-slate-950 border-t border-slate-900/60 py-12 px-6 text-center text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <p className="font-mono text-[10px] text-slate-400 flex items-center gap-1.5 justify-center md:justify-start">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              SYSTEM BUILD: STABLE_RELEASE_V2.42-CHIP
            </p>
            <p className="text-[11px]">&copy; {new Date().getFullYear()} Ganesh Enyaram. Engineered using Next-gen Generative Neural models.</p>
          </div>

          {/* Social vectors */}
          <div className="flex items-center gap-4 text-xs font-mono tracking-widest uppercase text-slate-400">
            <a href="https://github.com/ganeshenyaram" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">
              GitHub Secure
            </a>
            <span>/</span>
            <a href="https://linkedin.com/in/ganesh-enyaram" target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors">
              LinkedIn ID
            </a>
          </div>
        </div>

        {/* GDPR compliant notification placeholder footer */}
        <div className="mt-8 pt-4 border-t border-slate-900 text-[10px] text-slate-600 max-w-lg mx-auto">
          This system is fully secure, rate-limited, GDPR-compliant, and leverages mock databases combined with generative fallback loops if specific corporate private keys reside unconfigured.
        </div>
      </footer>

      {/* Floating Animated Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-850/90 border border-slate-850/85 text-cyan-400 hover:text-cyan-500 dark:hover:text-white transition-all cursor-pointer shadow-[0_4px_20px_rgba(6,182,212,0.25)] flex items-center justify-center z-40 group"
            title="Back to Top"
            aria-label="Back to top"
          >
            <ChevronUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
