import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lock, 
  Unlock, 
  ArrowLeft, 
  Fingerprint, 
  Github, 
  ShieldCheck, 
  Cpu, 
  CheckCircle2, 
  X,
  AlertTriangle,
  Loader2,
  Clock,
  Phone,
  Smartphone
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { auth } from "../lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, signInAnonymously, updateProfile } from "firebase/auth";

const loginIllu = "/src/assets/images/secure_login_illustration_1781421404117.jpg";

interface AuthPageProps {
  theme: "dark" | "light";
  onBack: () => void;
}

const POPULAR_COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 India (+91)" },
  { code: "+1", label: "🇺🇸 United States (+1)" },
  { code: "+44", label: "🇬🇧 United Kingdom (+44)" },
  { code: "+61", label: "🇦🇺 Australia (+61)" },
  { code: "+65", label: "🇸🇬 Singapore (+65)" },
  { code: "+49", label: "🇩🇪 Germany (+49)" },
  { code: "+33", label: "🇫🇷 France (+33)" },
  { code: "+971", label: "🇦🇪 UAE (+971)" },
  { code: "+966", label: "🇸🇦 Saudi Arabia (+966)" },
];

export default function AuthPage({ theme, onBack }: AuthPageProps) {
  const { t } = useLanguage();
  const { 
    signInWithGoogle, 
    signInWithGithub, 
    logContactViewer,
    user: firebaseUser 
  } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [activeLoadingProvider, setActiveLoadingProvider] = useState<"google" | "github" | "phone" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);

  // Phone Auth State Model
  const [phoneState, setPhoneState] = useState<"idle" | "phoneNumberInput" | "verificationCodeInput">("idle");
  const [selectedCountryCode, setSelectedCountryCode] = useState("+91"); // Defaults to +91 (India)
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<any>(null);

  // Floating SMS simulator mobile-style notification popup state
  const [simulatedSms, setSimulatedSms] = useState<{ number: string; code: string; visible: boolean }>({
    number: "",
    code: "",
    visible: false
  });

  React.useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onBack();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const resetTimer = () => {
      setTimeLeft(60);
    };

    // Listen to user touches, keystrokes, mouse moves for true session timeout
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("touchstart", resetTimer);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
    };
  }, [isLoading, onBack]);

  const getAuthErrorMessage = (err: any): string => {
    const code = err?.code;
    switch (code) {
      case "auth/popup-closed-by-user":
        return "Authentication cancelled. The popup was closed before completing the handshake.";
      case "auth/cancelled-popup-request":
        return "Multiple popup requests detected. Please wait for the initial window to complete.";
      case "auth/network-request-failed":
        return "Network connection issue detected. Please check your secure connection parameters.";
      default:
        return err?.message || "Authentication handshake failed. Please try again.";
    }
  };

  const handleProviderLogin = async (provider: "google" | "github") => {
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);
    setActiveLoadingProvider(provider);

    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        await signInWithGithub();
      }
      setSuccessMsg(`${provider === "google" ? "Google" : "GitHub"} identity validated. Access unsealed.`);
      
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
      setActiveLoadingProvider(null);
    }
  };

  const handleRequestSmsCode = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);
    setActiveLoadingProvider("phone");

    const sanitizedPhone = phoneNumber.replace(/[^0-9]/g, "");
    if (!sanitizedPhone || sanitizedPhone.length < 7 || sanitizedPhone.length > 15) {
      setErrorMsg("Please enter a valid phone number containing between 7 and 15 digits.");
      setIsLoading(false);
      setActiveLoadingProvider(null);
      return;
    }

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: selectedCountryCode,
          number: sanitizedPhone
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "The secure OTP dispatch sequence failed.");
      }

      setPhoneState("verificationCodeInput");
      setSuccessMsg(`Secure SMS verification code dispatched to ${selectedCountryCode} ${sanitizedPhone}!`);
      
      // Spawn simulated SMS lockscreen message popup visual
      setSimulatedSms({
        number: data.fullPhone,
        code: data.code,
        visible: true
      });

    } catch (err: any) {
      console.error("Direct SMS Request failed:", err);
      setErrorMsg(err.message || "Failed to dispatch request. Try again.");
    } finally {
      setIsLoading(false);
      setActiveLoadingProvider(null);
    }
  };

  const handleVerifySmsCode = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);
    setActiveLoadingProvider("phone");

    if (verificationCode.length !== 6) {
      setErrorMsg("Verification code must be exactly 6 digits.");
      setIsLoading(false);
      setActiveLoadingProvider(null);
      return;
    }

    const sanitizedPhone = phoneNumber.replace(/[^0-9]/g, "");
    const fullPhone = selectedCountryCode + sanitizedPhone;

    try {
      // 1. Submit OTP evaluation back to our direct server API
      const verifyResponse = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullPhone,
          code: verificationCode
        })
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || "Verification failed.");
      }

      // 2. Perform Anonymous Firebase Handshake on success
      const authResult = await signInAnonymously(auth);
      
      if (authResult.user) {
        await updateProfile(authResult.user, {
          displayName: `Phone User (${fullPhone})`
        });
      }

      // 3. Register the visitor logging
      if (logContactViewer) {
        await logContactViewer(authResult.user, "Phone SMS OTP (Server Custom)");
      }

      // 4. Store Simulated OAuth Log events
      try {
        await fetch("/api/simulate-oauth-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Phone User (${fullPhone})`,
            email: `${fullPhone.replace("+", "")}@phone.secured`,
            provider: "Phone Number Authentication (Server Direct)"
          })
        });
      } catch (simError) {
        console.warn("Could not dispatch simulate-oauth-email trigger:", simError);
      }

      // Dismiss the simulated lockscreen slider message popup
      setSimulatedSms(p => ({ ...p, visible: false }));

      setSuccessMsg("Phone OTP successfully validated. Security permissions granted.");
      
      setTimeout(() => {
        onBack();
      }, 1500);

    } catch (err: any) {
      console.error("Direct Phone Verification error:", err);
      setErrorMsg(err.message || "Verification code is invalid or has expired.");
    } finally {
      setIsLoading(false);
      setActiveLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative overflow-hidden bg-slate-950 font-sans">
      
      {/* Background visual layers */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Glowing cyan and purple core gradient coordinates */}
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 filter blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 filter blur-[120px]" />
        
        {/* Animated matrix grid dots */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.1)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div id="auth-main-panel" className="relative z-10 w-full max-w-5xl bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8)] grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* LEFT COMPACT PANEL: Visually Compelling tech column */}
        <div className="lg:col-span-5 bg-slate-950 border-r border-slate-900 p-8 flex flex-col justify-between relative overflow-hidden">
          
          {/* Cover grid backdrop */}
          <div className="absolute inset-0 z-0 opacity-40">
            <img 
              src={loginIllu} 
              alt="High-Tech Biometric Gateway" 
              className="w-full h-full object-cover object-center filter saturate-[0.8] brightness-[0.4] contrast-[1.15]" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/10 via-transparent to-slate-950" />
          </div>

          <div className="relative z-10 space-y-6 text-left">
            {/* Return Arrow trigger */}
            <button 
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 hover:text-white font-mono uppercase tracking-wider hover:bg-slate-900 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Hub
            </button>

            <div className="space-y-2 mt-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-cyan-950/40 border border-cyan-500/20 rounded-md font-mono text-[9px] text-cyan-400 uppercase tracking-widest leading-none">
                <ShieldCheck className="w-3 h-3 text-cyan-400" /> Identity Secure Grid
              </div>
              <h1 className="text-3xl font-black font-sans text-white tracking-tight leading-none uppercase">
                Secure <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-505">Signpost</span>
              </h1>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Connect and authenticate your secure identity credentials to access Ganesh's communication suite and active data operations.
              </p>
            </div>
          </div>

          {/* Dynamic state logs */}
          <div className="relative z-10 mt-12 space-y-4 text-left border-t border-slate-900/50 pt-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[9px] font-mono tracking-wider text-slate-500">
                <span>IDENTITY ALIAS ENGINE</span>
                <span className="text-emerald-400 animate-pulse">● READY</span>
              </div>
              
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 space-y-2.5">
                <div className="flex items-start gap-2">
                  <Fingerprint className="w-4 h-4 text-cyan-400 mt-0.5 animate-pulse" />
                  <div className="text-[10px] font-mono leading-relaxed text-slate-300">
                    <span className="text-slate-500">GRID ID:</span> 0xFA79-D8D2 <br />
                    <span className="text-slate-500">STATUS:</span> {firebaseUser ? "GATEWAYS_ARMED" : "AWAITING_SHAKEDOWN"} <br />
                    <span className="text-slate-500">CIPHER:</span> SHA-512 COMPLIANT
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[9px] text-slate-500 font-mono leading-relaxed">
              * Verification uses fully compliant Firebase configurations. Your tokens remain secure and confidential.
            </p>
          </div>
        </div>

        {/* RIGHT FORM PANEL: Pure OAuth Gates */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-slate-950 relative">
          
          <div className="max-w-md w-full mx-auto">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="skeleton-handshake-io"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-8 text-left"
                >
                  {/* SKELETON HEADER */}
                  <div className="space-y-3">
                    <h2 className="text-xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-cyan-400 animate-spin" /> Verifying Credentials...
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed font-sans">
                      Initializing direct single sign-on token streams and handshake protocols with secure identity registers.
                    </p>
                  </div>

                  {/* CRYPTOGRAPHIC PATH SCANNER */}
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] font-black uppercase tracking-wider animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" /> Connection Tunnel Guard
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-full bg-slate-900 rounded animate-pulse" />
                      <div className="h-2.5 w-11/12 bg-slate-900 rounded animate-pulse" />
                      <div className="h-2.5 w-4/5 bg-slate-900/60 rounded animate-pulse" />
                    </div>
                  </div>

                  {/* LIVE ENCRYPTED STATE TELEMETRY */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Pipeline Logs</span>
                      <span className="text-[9px] font-mono text-cyan-400 tracking-widest animate-pulse uppercase font-bold">Relay Active</span>
                    </div>
                    
                    <div className="space-y-2.5 font-mono text-[10px] text-slate-500">
                      <div className="flex justify-between">
                        <span>HANDSHAKE_CORE:</span>
                        <span className="text-cyan-400 font-extrabold animate-pulse">OIDC_ESTABLISHING...</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SSO_IDENTITY_RELAY:</span>
                        <span className="text-emerald-400 font-extrabold animate-pulse">{activeLoadingProvider === "google" ? "GOOGLE_SECURE_AUTH" : "GITHUB_NET_HANDSHAKE"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AUTHENTICITY_PROOF:</span>
                        <span className="text-slate-400">VERIFYING_SSL_ORIGIN</span>
                      </div>
                    </div>
                  </div>

                  {/* SHIMMERING BUTTONS SKELETONS */}
                  <div className="space-y-4">
                    <div className="h-3 w-1/3 bg-slate-900 rounded animate-pulse" />
                    
                    <div className="space-y-3">
                      <div className="w-full h-14 rounded-xl bg-slate-950 border border-slate-900 p-4 flex items-center justify-between relative overflow-hidden">
                        <div className="flex items-center gap-3 w-full">
                          <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-900 flex items-center justify-center">
                            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                          </div>
                          <div className="h-3.5 w-1/2 bg-slate-900 rounded animate-pulse" />
                        </div>
                        <div className="w-4 h-4 rounded bg-slate-900 animate-pulse" />
                      </div>

                      <div className="w-full h-14 rounded-xl bg-slate-950 border border-slate-900 p-4 flex items-center justify-between relative overflow-hidden">
                        <div className="flex items-center gap-3 w-full">
                          <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-900 flex items-center justify-center">
                            <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin" />
                          </div>
                          <div className="h-3.5 w-2/5 bg-slate-900 rounded animate-pulse" />
                        </div>
                        <div className="w-4 h-4 rounded bg-slate-900 animate-pulse" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-900/80 pt-6 text-center space-y-2">
                    <div className="h-2 w-5/6 bg-slate-900/40 rounded-full mx-auto animate-pulse" />
                    <div className="h-2 w-2/3 bg-slate-900/40 rounded-full mx-auto animate-pulse" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="auth-interactive-sso"
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="space-y-6"
                >
                  {/* SESSION LEASE HIGH-TECH PROGRESS TIMER */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-900/60 flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-mono font-bold text-slate-350 tracking-wide uppercase">
                          Secure Session Lease Active
                        </div>
                        <div className="text-[9px] text-slate-500 leading-none">
                          Auto-returns to hub after 1 minute of total inactivity
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">Expires in:</span>
                      <span className={`px-2.5 py-0.5 rounded font-mono font-black text-xs text-center min-w-[38px] transition-all duration-300 ${timeLeft <= 15 ? "bg-rose-950/90 text-rose-450 border border-rose-500/40 animate-pulse" : "bg-cyan-950/80 text-cyan-400 border border-cyan-500/30"}`}>
                        {timeLeft}s
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-left">
                    <h2 className="text-xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
                      <Lock className="w-5 h-5 text-cyan-400" /> Administrative Access Mandate
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      To guarantee zero-trust credential encapsulation, this system permits authentication exclusively through cryptographically secure OpenID Connect (OIDC) OAuth providers.
                    </p>
                  </div>

                  {/* SECURITY PROTOCOL INFORMATION BANNER */}
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-left space-y-2.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] font-black uppercase tracking-wider">
                      <ShieldCheck className="w-4.5 h-4.5 text-cyan-400" /> Cryptographic Integrity Standard
                    </div>
                    <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                      By disabling standard email/password inputs, we prevent credential stuffing, brute-force injection vectors, and downstream password vulnerabilities. Handshakes completed through Google and GitHub utilize direct token relays to register visitors and unseal telemetry pipelines.
                    </p>
                  </div>

                  {/* ERROR / SUCCESS FEEDBACK MODULE */}
                  <AnimatePresence mode="wait">
                    {errorMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/30 text-rose-450 text-xs text-left leading-relaxed flex items-start gap-2.5"
                      >
                        <X className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0 cursor-pointer" onClick={() => setErrorMsg("")} />
                        <span>{errorMsg}</span>
                      </motion.div>
                    )}

                    {successMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/30 text-emerald-400 text-xs text-left leading-relaxed flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{successMsg}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ACTIVE SSO ENTRY PORTALS */}
                  <div className="space-y-4">
                    {phoneState === "idle" ? (
                      <>
                        <div className="text-left">
                          <span className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase">
                            Verify Grid Authority
                          </span>
                        </div>

                        <div className="flex flex-col gap-3">
                          {/* GOOGLE BRANDED BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleProviderLogin("google")}
                            disabled={isLoading}
                            className="w-full py-4 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/30 disabled:opacity-45 text-slate-200 hover:text-white font-mono text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer flex items-center justify-between shadow-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 text-amber-500 flex items-center justify-center font-bold font-sans">
                                {activeLoadingProvider === "google" ? (
                                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                                ) : (
                                  "G"
                                )}
                              </span>
                              <span className="text-left font-sans font-bold normal-case text-slate-300">
                                {activeLoadingProvider === "google" ? "Sign-in initialized..." : "Sign in with Google"}
                              </span>
                            </div>
                            {activeLoadingProvider === "google" ? (
                              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                            ) : (
                              <Unlock className="w-4 h-4 text-cyan-400" />
                            )}
                          </button>

                          {/* GITHUB BRANDED BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleProviderLogin("github")}
                            disabled={isLoading}
                            className="w-full py-4 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/30 disabled:opacity-45 text-slate-200 hover:text-white font-mono text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer flex items-center justify-between shadow-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                                {activeLoadingProvider === "github" ? (
                                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                                ) : (
                                  <Github className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <span className="text-left font-sans font-bold normal-case text-slate-300">
                                {activeLoadingProvider === "github" ? "Accessing GitHub Identity..." : "Sign in with GitHub"}
                              </span>
                            </div>
                            {activeLoadingProvider === "github" ? (
                              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                            ) : (
                              <Unlock className="w-4 h-4 text-cyan-400" />
                            )}
                          </button>

                          {/* PHONE BRANDED BUTTON */}
                          <button
                            type="button"
                            onClick={() => {
                              setPhoneState("phoneNumberInput");
                              setErrorMsg("");
                            }}
                            disabled={isLoading}
                            className="w-full py-4 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/30 disabled:opacity-45 text-slate-200 hover:text-white font-mono text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer flex items-center justify-between shadow-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                                {activeLoadingProvider === "phone" ? (
                                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                ) : (
                                  <Phone className="w-4 h-4 text-emerald-400" />
                                )}
                              </div>
                              <span className="text-left font-sans font-bold normal-case text-slate-300">
                                Sign in with Phone Number
                              </span>
                            </div>
                            <Unlock className="w-4 h-4 text-emerald-400" />
                          </button>
                        </div>
                      </>
                    ) : phoneState === "phoneNumberInput" ? (
                      <div className="space-y-4 text-left">
                        <div className="space-y-1.5">
                          <label id="phone-label" className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase">
                            Secure Mobile Vector Input
                          </label>
                          
                          <div className="flex gap-2">
                            {/* COUNTRY CODE SELECTOR */}
                            <div className="w-2/5 min-w-[120px] relative">
                              <select
                                id="country-code-select"
                                value={selectedCountryCode}
                                onChange={(e) => setSelectedCountryCode(e.target.value)}
                                disabled={isLoading}
                                className="w-full h-full bg-slate-900 border border-slate-800 rounded-xl px-3 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                              >
                                {POPULAR_COUNTRY_CODES.map((item) => (
                                  <option key={item.code} value={item.code} className="bg-slate-950 text-slate-350">
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                                <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                </svg>
                              </div>
                            </div>

                            {/* CORE MOBILE PHONE NUMBER INPUT */}
                            <div className="flex-1 relative">
                              <input
                                id="phone-number-field"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                                placeholder="98765 43210"
                                disabled={isLoading}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 text-sm font-mono tracking-wider"
                              />
                            </div>
                          </div>
                          
                          <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                            Enter your correct mobile number. The system will automatically prepend the select country code (<span className="text-cyan-400 font-bold font-mono">{selectedCountryCode}</span>).
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleRequestSmsCode}
                          disabled={isLoading || !phoneNumber}
                          className="w-full py-4 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/30 disabled:opacity-45 text-slate-200 hover:text-white font-mono text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer flex items-center justify-between shadow-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                              ) : (
                                <Smartphone className="w-4 h-4 text-cyan-400" />
                              )}
                            </div>
                            <span className="text-left font-sans font-bold normal-case text-slate-300">
                              {isLoading ? "Generating session token..." : "Dispatch Secure SMS Proof Key"}
                            </span>
                          </div>
                          <Unlock className="w-4 h-4 text-cyan-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPhoneState("idle");
                            setErrorMsg("");
                          }}
                          className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-350 font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
                        >
                          Cancel & Return to Alternate Gateways
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 text-left">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase">
                            6-Digit Verification Code
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder="123456"
                            disabled={isLoading}
                            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3.5 px-4 text-center text-white placeholder-slate-700 focus:outline-none focus:border-cyan-500/50 text-lg font-mono tracking-[0.5em]"
                          />
                          <p className="text-[10px] text-slate-500 leading-relaxed font-sans text-center">
                            Enter the single-use SMS confirmation key dispatched to {selectedCountryCode} {phoneNumber}.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleVerifySmsCode}
                          disabled={isLoading || verificationCode.length !== 6}
                          className="w-full py-4 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/30 disabled:opacity-45 text-slate-200 hover:text-white font-mono text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer flex items-center justify-between shadow-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              )}
                            </div>
                            <span className="text-left font-sans font-bold normal-case text-slate-300">
                              {isLoading ? "Validating handshake proof..." : "Verify & Authorize Session"}
                            </span>
                          </div>
                          <Unlock className="w-4 h-4 text-emerald-400" />
                        </button>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPhoneState("phoneNumberInput");
                              setErrorMsg("");
                              setVerificationCode("");
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-slate-950 border border-slate-900 hover:bg-slate-900 text-slate-400 hover:text-white font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
                          >
                            Re-enter Phone
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPhoneState("idle");
                              setErrorMsg("");
                              setVerificationCode("");
                              setPhoneNumber("");
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-slate-950 border border-slate-900 hover:bg-slate-900 text-slate-400 hover:text-white font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
                          >
                            Reset Form
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Invisible Recaptcha Mount Point */}
                  <div id="recaptcha-container" className="invisible"></div>

                  <div className="border-t border-slate-900/80 pt-6 text-center">
                    <p className="text-[10px] text-slate-650 font-mono leading-relaxed font-sans">
                      Single Sign-On (SSO) queries use end-to-end Firebase SSL encryption gates. No local database profiles retain secret client authorization passwords.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* SIMULATED SMS CELLULAR POPUP NOTIFICATION CARD */}
      <AnimatePresence>
        {simulatedSms.visible && (
          <motion.div
            initial={{ opacity: 0, y: -85, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -45, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-4 shadow-[0_22px_45px_rgba(6,182,212,0.18)] space-y-2.5 relative overflow-hidden text-left">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 to-emerald-500" />
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-950/85 flex items-center justify-center text-[10px]">
                    💬
                  </span>
                  <span className="font-mono text-[9px] font-bold text-slate-400 tracking-wider">
                    LOCAL OFFLINE SMS CARRIER ROUTING
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-amber-400 font-extrabold bg-amber-950/50 px-1.5 py-0.5 rounded animate-pulse">
                    OFFLINE DIRECT SMS
                  </span>
                  <button 
                    onClick={() => setSimulatedSms(p => ({ ...p, visible: false }))}
                    className="text-slate-500 hover:text-slate-350 p-0.5 rounded transition-all focus:outline-none"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Offline SMS Gateway Simulator</span>
                  <span className="text-[10px] font-normal text-slate-500 font-mono">({simulatedSms.number})</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans font-medium">
                  Your offline verification passcode is <strong className="font-mono text-amber-400 text-xs px-1.5 py-0.5 bg-slate-950 rounded border border-amber-950 select-all tracking-widest">{simulatedSms.code}</strong>. Please enter this code within 5 minutes to verify.
                </p>
              </div>

              <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-800/40">
                <span>Select & copy code from offline SMS bubble</span>
                <span className="text-amber-500 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" /> Offline Sandboxed Mode
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
