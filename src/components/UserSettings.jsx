export default function UserSettings({ user, isGuest, onLogout, onLogin }) {
  return (
    <section className="user-settings user-settings--guest-mode">
      <div className="user-settings__header">
        <div>
          <h2 className="user-settings__title">
            {isGuest ? "Guest access" : "Your account"}
          </h2>
          <p className="user-settings__subtitle">
            {isGuest
              ? "Use the app without signing in. No personal profile data is available." 
              : "Signed in users get account access and saved preferences."}
          </p>
        </div>
      </div>

      <div className="user-settings__panel user-settings__panel--compact">
        <div className="user-settings__avatar-card">
          <div className="user-settings__avatar">{isGuest ? "G" : "A"}</div>
        </div>

        <div className="user-settings__details">
          <div className="user-settings__detail-row">
            <span className="user-settings__label">NAME</span>
            <span className="user-settings__value">{user.name}</span>
          </div>
          <div className="user-settings__detail-row">
            <span className="user-settings__label">EMAIL</span>
            <span className="user-settings__value">{user.email}</span>
          </div>
          <div className="user-settings__detail-row">
            <span className="user-settings__label">PHONE</span>
            <span className="user-settings__value">{user.phone}</span>
          </div>

          {isGuest ? (
            <button
              className="user-settings__login"
              type="button"
              onClick={onLogin}
            >
              Login or create account
            </button>
          ) : (
            <button
              className="user-settings__logout"
              type="button"
              onClick={onLogout}
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
