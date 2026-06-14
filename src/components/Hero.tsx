import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Mail, Github, Linkedin, Cpu, Code2, Award, Users, Printer } from "lucide-react";
import { AnalyticsStats } from "../types";
import { useLanguage } from "../context/LanguageContext";
// @ts-ignore
import techAvatarImg from "../assets/images/tech_developer_avatar_1781108834995.png";

interface HeroProps {
  analytics: AnalyticsStats;
  onTrackAction: (metricName: string) => void;
  onNavigateToContact: () => void;
}

export default function Hero({ analytics, onTrackAction, onNavigateToContact }: HeroProps) {
  const { t, language } = useLanguage();

  // Animated titles list
  const roles = [
    t("role.0", "AI & Data Science Engineer"),
    t("role.1", "Machine Learning Enthusiast"),
    t("role.2", "Generative AI Developer"),
    t("role.3", "Full Stack Developer"),
  ];

  const [currentRoleIdx, setCurrentRoleIdx] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(100);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Sync profile photo from local storage or api instantly
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem("ganesh-profile-image");
        if (stored) {
          setProfileImage(stored);
        } else {
          setProfileImage(null);
        }
      } catch (e) {
        console.error("Local storage error in Hero", e);
      }
    };
    handleStorageChange();
    window.addEventListener("storage", handleStorageChange);
    // Poll to keep multiple tabs or frames in sync
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Stats Counters
  const statsList = [
    { label: t("hero.stats.aiChats", "AI & Data Solutions"), value: "3", icon: Cpu, color: "text-cyan-400" },
    { label: t("hero.stats.solved", "Core Skills Listed"), value: "18", icon: Code2, color: "text-indigo-400" },
    { label: t("hero.stats.systemViews", "System Views"), value: analytics.projectViews || 245, icon: Users, color: "text-pink-400" },
    { label: t("hero.stats.won", "Hackathons & Events"), value: "6", icon: Award, color: "text-amber-400" },
  ];

  // Typing effect loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fullText = roles[currentRoleIdx];

    if (!isDeleting) {
      timer = setTimeout(() => {
        setTypedText(fullText.substring(0, typedText.length + 1));
        setTypingSpeed(75);
      }, typingSpeed);

      if (typedText === fullText) {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 1800); // Wait on full role
      }
    } else {
      timer = setTimeout(() => {
        setTypedText(fullText.substring(0, typedText.length - 1));
        setTypingSpeed(35);
      }, typingSpeed);

      if (typedText === "") {
        setIsDeleting(false);
        setCurrentRoleIdx((prev) => (prev + 1) % roles.length);
      }
    }

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, currentRoleIdx, language]);

  // Track manual Resume Download
  const handleDownloadResume = () => {
    onTrackAction("resumeDownloads");
    // Generate simulated resume download (since real PDF is missing, we create a rich textual PDF/Markdown download)
    const resumeText = `
GANESH ENYARAM - AI & DATA SCIENCE UNDERGRADUATE
Email: eganesh4882@gmail.com | LinkedIn: linkedin.com/in/ganesh-enyaram | Location: Siddipet, Telangana / Rajkot, Gujarat, India

EDUCATION:
- Bachelor of Technology - CSE (Artificial Intelligence & Data Science) [2024 - 2028]
  Marwadi University, Rajkot, Gujarat (Currently pursuing 2nd Year)

TECHNICAL SKILLS:
- Programming: Python, C, C++, Java
- AI & ML: Machine Learning, NumPy, Pandas, Scikit-learn, TensorFlow, Keras, Data Analysis, SQL, Git & GitHub
- Soft Skills: Communication, Team Leadership (Red Dragon lead), Problem Solving, Critical Thinking, Time Management, Adaptability

PROJECTS:
1. AI-Powered Chatbot (2024): Conversational Python & NLP query assistant.
2. Data Analysis Dashboard (2025): Pandas & Matplotlib visual dashboards.
3. Predictive ML Model (2025): Supervised Scikit-learn classification & regression pipelines.

HACKATHONS & ACHIEVEMENTS:
- ET AI Hackathon - Certified Participant (2025)
- Team Lead - Red Dragon Team (2025): Shortlisted for the PixelVerse Offline Finale Hackathon as Team Lead.
- Convolve 4.0 - Pan-IIT AI/ML Hackathon Participation Certificate (2025)
- ZOMATHON - India's Biggest Data Hackathon Participant (2025)
- RBU Global Digital Exchange Forum Delegate [Inclusive AI for ASEAN] (2026)
- NationBuilding Case Study Competition Competitor (2026)
    `;
    const blob = new Blob([resumeText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Ganesh_Enyaram_AI_Resume.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section id="hero-section" className="relative min-h-screen flex flex-col justify-between items-center overflow-hidden pt-28 pb-10 px-4">
      {/* Visual cybernetic backdrop */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 flex-1 justify-center my-auto w-full">
        {/* Hero Copywriter area */}
        <div className="flex-1 text-center md:text-left space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-wider uppercase backdrop-blur-md"
          >
            <Cpu className="w-3.5 h-3.5 animate-pulse" />
            {t("hero.coreIntelligence", "Core Intelligence Ready")}
          </motion.div>

          <div className="space-y-3">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-4xl sm:text-6xl font-bold tracking-tight text-white font-sans hero-title"
            >
              <span className="name-first">Ganesh</span> <span className="name-last">Enyaram</span>
            </motion.h1>

            {/* Print-only professional resume header contact info */}
            <div className="hidden print:flex flex-wrap justify-between items-center text-[10pt] text-black mt-2 border-b-2 border-black pb-3 font-mono">
              <span>Email: eganesh4882@gmail.com</span>
              <span>Location: Rajkot, Gujarat / Siddipet, IN</span>
              <span>GitHub: github.com/ganeshenyaram</span>
              <span>LinkedIn: linkedin.com/in/ganesh-enyaram</span>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="h-8 flex items-center justify-center md:justify-start"
            >
              <p className="text-lg sm:text-xl font-mono text-slate-350">
                &gt; <span className="text-cyan-400 font-bold">{typedText}</span>
                <span className="w-1.5 h-4 bg-cyan-400 inline-block ml-1 animate-blink-cursor" />
              </p>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto md:mx-0 leading-relaxed font-sans"
          >
            {t("hero.description", "B.Tech specialist in Artificial Intelligence & Data Science. Merging statistical precision with state-of-the-art neural architectures to construct hyper-scalable agentic solutions and robust full-stack applications.")}
          </motion.p>

          {/* Social and Call to Actions Row */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center md:justify-start gap-4"
          >
            <button
              id="hero-contact-btn"
              onClick={onNavigateToContact}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-medium hover:from-cyan-400 hover:to-indigo-500 transition-all shadow-[0_4px_20px_rgba(6,182,212,0.3)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.55)] cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <Mail className="w-4 h-4" />
              {t("hero.contactBtn", "Contact Ganesh")}
            </button>

            <button
              id="hero-download-btn"
              onClick={handleDownloadResume}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 font-medium hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              {t("hero.resumeBtn", "Analyze/Get Resume")}
            </button>

            <button
              id="hero-print-btn"
              onClick={() => {
                onTrackAction("resumeDownloads");
                window.print();
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 font-medium hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
              title="Prints standard beautiful resume layout"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              {t("hero.printBtn", "Print Resume")}
            </button>

            <div className="flex items-center gap-3">
              <a
                id="hero-github-link"
                href="https://github.com/ganeshenyaram"
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl hover:border-cyan-400/50 hover:bg-slate-800 text-slate-300 transition-all"
                title="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                id="hero-linkedin-link"
                href="https://linkedin.com/in/ganesh-enyaram"
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl hover:border-indigo-400/50 hover:bg-slate-800 text-slate-300 transition-all"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>

        {/* Futuristic Floating Graphic Ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 relative flex items-center justify-center h-[300px] sm:h-[350px] w-full"
        >
          {/* Cyber Core Sphere Grid */}
          <div className="absolute w-[240px] h-[240px] rounded-full border border-dashed border-cyan-500/20 animate-spin-slow" />
          <div className="absolute w-[180px] h-[180px] rounded-full border border-cyan-400/40 animate-spin-reverse" />
          <div className="absolute w-[100px] h-[100px] rounded-full border border-rose-500/30 animate-pulse" />

          {/* Core Core Central Node */}
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-40 h-40 rounded-full bg-gradient-to-br from-cyan-400/20 to-indigo-600/20 p-1 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.6)] border border-cyan-400/50 backdrop-blur-md z-20 overflow-hidden"
          >
            <img
              src={techAvatarImg}
              alt="Ganesh Enyaram Tech Avatar"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full"
            />
          </motion.div>

          {/* Floating graphic orbital icons */}
          <div className="absolute w-full h-full max-w-[280px]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              <div className="absolute top-0 left-12 w-9 h-9 rounded-lg bg-slate-900/90 border border-cyan-400/50 flex items-center justify-center text-cyan-400 transform -rotate-360">
                <Code2 className="w-4.5 h-4.5" />
              </div>
              <div className="absolute bottom-4 right-8 w-9 h-9 rounded-lg bg-slate-900/90 border border-pink-400/50 flex items-center justify-center text-pink-400 transform -rotate-360">
                <BrainIcon />
              </div>
              <div className="absolute top-1/2 right-0 w-9 h-9 rounded-lg bg-slate-900/90 border border-indigo-400/50 flex items-center justify-center text-indigo-400 transform -rotate-360">
                <NetworkIcon />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Stats Counter Panel Overlay */}
      <div className="relative w-full max-w-6xl px-4 z-20 pointer-events-auto mt-8 md:mt-2 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl"
        >
          {statsList.map((st, i) => {
            const Icon = st.icon;
            return (
              <div key={i} className="flex items-center gap-3.5 pl-2">
                <div className={`p-2 rounded-xl bg-slate-800/50 ${st.color} bg-opacity-10 border border-slate-700/50`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg sm:text-2xl font-bold font-mono text-white tracking-tight">{st.value}</div>
                  <div className="text-xs text-slate-400 font-sans">{st.label}</div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// Custom neat visual helpers to avoid import issues
function BrainIcon() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="3" />
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="19" r="3" />
      <path d="M5 16l4-8M19 16l-4-8M7 19h10" />
    </svg>
  );
}
