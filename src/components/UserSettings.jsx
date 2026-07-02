export default function UserSettings({ user, onLogout }) {
  return (
    <section className="user-settings">
      <div className="user-settings__topbar">
        <button className="user-settings__tab user-settings__tab--active">USER</button>
        <button className="user-settings__tab">PROFILE</button>
        <button className="user-settings__tab">SECURITY</button>
        <button className="user-settings__tab">NOTIFICATIONS</button>
        <button className="user-settings__tab">HELP</button>
      </div>

      <div className="user-settings__panel">
        <div className="user-settings__avatar-card">
          <div className="user-settings__avatar">IMG</div>
        </div>

        <div className="user-settings__details">
          <div className="user-settings__detail-row">
            <span className="user-settings__label">NAME</span>
            <span className="user-settings__value">{user.name}</span>
          </div>
          <div className="user-settings__detail-row">
            <span className="user-settings__label">GMAIL INFO</span>
            <span className="user-settings__value">{user.email}</span>
          </div>
          <div className="user-settings__detail-row">
            <span className="user-settings__label">CONTACT NUMBER</span>
            <span className="user-settings__value">{user.phone}</span>
          </div>
          <button className="user-settings__logout" type="button" onClick={onLogout}>
            LOG OUT
          </button>
        </div>
      </div>
    </section>
  );
}
