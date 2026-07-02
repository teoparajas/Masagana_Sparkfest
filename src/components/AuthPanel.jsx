import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import "./AuthPanel.css";

export default function AuthPanel({ mode, onModeChange, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setStatus("loading");

    try {
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        if (displayName.trim()) {
          await updateProfile(userCredential.user, {
            displayName: displayName.trim(),
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      setStatus("success");
      onClose();
    } catch (err) {
      setStatus("error");
      setError(
        err.code === "auth/user-not-found"
          ? "No account found. Please sign up first."
          : err.code === "auth/wrong-password"
          ? "Wrong password. Try again."
          : err.code === "auth/email-already-in-use"
          ? "That email is already in use. Try signing in."
          : err.message || "Unable to sign in. Please try again."
      );
    }
  };

  return (
    <div className="auth-panel">
      <div className="auth-panel__header">
        <div>
          <div className="auth-panel__headline">{isSignup ? "Create account" : "Welcome back"}</div>
          <div className="auth-panel__subhead">
            {isSignup
              ? "Create a free account to save your profile and reports."
              : "Sign in to manage your account. Guests can still use the app."}
          </div>
        </div>
        <button className="auth-panel__close" type="button" onClick={onClose}>
          ✕
        </button>
      </div>

      <form className="auth-panel__form" onSubmit={handleSubmit}>
        {isSignup && (
          <label className="auth-panel__label">
            Name (optional)
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="auth-panel__input"
              placeholder="e.g. Ana dela Cruz"
            />
          </label>
        )}

        <label className="auth-panel__label">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-panel__input"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label className="auth-panel__label">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-panel__input"
            placeholder="••••••••"
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </label>

        {error && <div className="auth-panel__error">{error}</div>}

        <button
          type="submit"
          className="auth-panel__primary"
          disabled={status === "loading"}
        >
          {status === "loading"
            ? isSignup
              ? "Creating account..."
              : "Signing in..."
            : isSignup
            ? "Create account"
            : "Sign in"}
        </button>

        <button
          type="button"
          className="auth-panel__secondary"
          onClick={onClose}
        >
          Continue as guest
        </button>
      </form>

      <div className="auth-panel__footer">
        {isSignup ? (
          <>
            Already have an account?{' '}
            <button
              type="button"
              className="auth-panel__toggle"
              onClick={() => onModeChange("signin")}
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            Don't have an account?{' '}
            <button
              type="button"
              className="auth-panel__toggle"
              onClick={() => onModeChange("signup")}
            >
              Create one
            </button>
          </>
        )}
      </div>
    </div>
  );
}
