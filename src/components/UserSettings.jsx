import { useState } from "react";
import { auth } from "../services/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

export default function UserSettings({ user, onLogout, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const displayName = user?.displayName || user?.email || user?.name || "Guest user";
  const displayEmail = user?.email || "No account connected";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email || !password) {
      setStatusMessage("Enter both email and password.");
      return;
    }

    setIsWorking(true);
    setStatusMessage("");

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setStatusMessage("Signed in successfully.");
      onClose?.();
    } catch (error) {
      setStatusMessage(error.message || "Unable to sign in.");
    } finally {
      setIsWorking(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering((current) => !current);
    setStatusMessage("");
  };

  return (
    <section className="user-settings">
      <div className="user-settings__header">
        <div>
          <h2 className="user-settings__title">Hello, {displayName}</h2>
          <p className="user-settings__subtitle">
            Manage your account and app access here. Guests can still use the app,
            but account information is not available.
          </p>
        </div>
      </div>

      {user?.email ? (
        <div className="user-settings__panel">
          <div className="user-settings__avatar-card">
            <div className="user-settings__avatar">{initials || "GU"}</div>
          </div>

          <div className="user-settings__details">
            <div className="user-settings__detail-row">
              <span className="user-settings__label">Name</span>
              <span className="user-settings__value">{displayName}</span>
            </div>
            <div className="user-settings__detail-row">
              <span className="user-settings__label">Email</span>
              <span className="user-settings__value">{displayEmail}</span>
            </div>
            <div className="user-settings__detail-row">
              <span className="user-settings__label">Phone</span>
              <span className="user-settings__value">{user?.phone || "Not provided"}</span>
            </div>

            <button className="user-settings__logout" type="button" onClick={onLogout}>
              Log out
            </button>
          </div>
        </div>
      ) : (
        <form className="user-settings__form" onSubmit={handleSubmit}>
          <label className="user-settings__field">
            <span className="user-settings__label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="user-settings__input"
              placeholder="you@example.com"
            />
          </label>

          <label className="user-settings__field">
            <span className="user-settings__label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="user-settings__input"
              placeholder="Enter password"
            />
          </label>

          <div className="user-settings__actions">
            <button className="user-settings__logout" type="submit" disabled={isWorking}>
              {isWorking ? "Working..." : isRegistering ? "Create account" : "Sign in"}
            </button>
            <button
              className="user-settings__secondary"
              type="button"
              onClick={toggleMode}
            >
              {isRegistering ? "Have an account? Sign in" : "New here? Create account"}
            </button>
          </div>

          <button
            className="user-settings__secondary"
            type="button"
            onClick={onClose}
          >
            Continue as guest
          </button>

          {statusMessage && (
            <p className="user-settings__status">{statusMessage}</p>
          )}
        </form>
      )}
    </section>
  );
}
