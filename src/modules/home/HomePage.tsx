import { useAuthStore } from "../../store/auth.store";
import { useNavigate } from "react-router-dom";
import { RouteNames } from "../../router/routes";
import styles from "./styles/home.module.css";
import { useProfile } from "../../hooks/useProfile";

export const HomePage = () => {
  const user = useAuthStore((s) => s.user);
  const { profile } = useProfile();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(RouteNames.LOGIN);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>🌱 Garden</h1>
        <nav className={styles.nav}>
          <button
            className={styles.navLink}
            onClick={() => navigate(RouteNames.PROFILE)}
          >
            Profile
          </button>
          <button className={styles.logoutButton} onClick={handleLogout}>
            Sign out
          </button>
        </nav>
      </header>

      <main className={styles.main}>
        <h2 className={styles.greeting}>
          Hello, {profile?.name || user?.email}!
        </h2>
        <p className={styles.description}>Your gardens will appear here.</p>
      </main>
    </div>
  );
}
