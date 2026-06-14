import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  setPersistence,
  browserSessionPersistence
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider, githubProvider, OperationType, handleFirestoreError } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert } from "lucide-react";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<User>;
  signInWithGithub: () => Promise<User>;
  logout: () => Promise<void>;
  logContactViewer: (user: User, loginType: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Configures Firebase to automatically sign out users when they leave or close the tab or window.
    setPersistence(auth, browserSessionPersistence)
      .catch((err) => console.warn("Failed to configure session-level persistence:", err));

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        let hasAdminClaim = false;
        try {
          const idTokenResult = await currentUser.getIdTokenResult();
          hasAdminClaim = !!idTokenResult.claims.admin;
        } catch (e) {
          console.warn("Could not check custom admin claim on authentication:", e);
        }
        setIsAdmin(currentUser.email === "eganesh7997@gmail.com" || hasAdminClaim);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sendAutomaticContactMessage = async (currentUser: User) => {
    if (!currentUser) return;
    const userEmail = currentUser.email || `${currentUser.phoneNumber || currentUser.uid}@phone.secured`;
    const path = `contacts/${currentUser.uid}`;
    try {
      const visitorName = currentUser.displayName || userEmail.split("@")[0] || "Verified Visitor";
      const messageData = {
        id: currentUser.uid,
        name: visitorName,
        email: userEmail,
        message: `Hello Ganesh,\n\nThanks for visiting my portfolio and connecting with my network. I have successfully authenticated and verified my account.\n\nLet us connect and build high-integrity network links together.\n\nWarm regards,\n${visitorName}`,
        date: new Date().toISOString()
      };
      await setDoc(doc(db, "contacts", currentUser.uid), messageData);
    } catch (err) {
      console.warn("Silent ignore on auto message creation error:", err);
    }
  };

  const logContactViewer = async (currentUser: User, loginType: string) => {
    if (!currentUser) return;
    const userEmail = currentUser.email || `${currentUser.phoneNumber || currentUser.uid}@phone.secured`;
    const path = `contactViewers/${currentUser.uid}`;
    try {
      const viewerData = {
        id: currentUser.uid,
        name: currentUser.displayName || userEmail.split("@")[0],
        email: userEmail,
        loginType: loginType,
        date: new Date().toISOString()
      };
      await setDoc(doc(db, "contactViewers", currentUser.uid), viewerData);
      
      // Auto-dispatch the contact network message securely
      await sendAutomaticContactMessage(currentUser);
    } catch (err) {
      // Catch and forward Firestore errors for high-integrity compliance
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await logContactViewer(result.user, "Google SSO (Firebase)");
      
      // Simulate OAuth triggered Cloud Function email
      try {
        await fetch("/api/simulate-oauth-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: result.user.displayName || result.user.email?.split("@")[0] || "Google User",
            email: result.user.email,
            provider: "Google SSO"
          })
        });
      } catch (simError) {
        console.warn("Could not dispatch simulate-oauth-email trigger:", simError);
      }

      return result.user;
    } catch (err: any) {
      console.error("Google authentication failed:", err);
      throw err;
    }
  };

  const signInWithGithub = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      await logContactViewer(result.user, "GitHub SSO (Firebase)");

      // Simulate OAuth triggered Cloud Function email
      try {
        await fetch("/api/simulate-oauth-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: result.user.displayName || result.user.email?.split("@")[0] || "GitHub User",
            email: result.user.email,
            provider: "GitHub SSO"
          })
        });
      } catch (simError) {
        console.warn("Could not dispatch simulate-oauth-email trigger:", simError);
      }

      return result.user;
    } catch (err: any) {
      console.error("GitHub authentication failed:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      signInWithGoogle, 
      signInWithGithub,
      logout,
      logContactViewer
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-mono text-xs">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping mb-2" />
        Authenticating Secure Handshake...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-slate-950/80 border border-slate-900 text-center space-y-4 shadow-xl">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-950/50 border border-rose-800/30 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div className="space-y-1.5 text-center">
          <h4 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-widest">
            Access Restrained
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            The workspace analytical statistics and real-time logs ledger matches owner-only credentials. Authenticate with an administrator account to load system diagnostics.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
