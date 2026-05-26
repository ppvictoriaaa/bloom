import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { useProfile } from "../../hooks/useProfile";
import { ProfileForm } from "./components/ProfileForm";
import { RouteNames } from "../../router/routes";
import styles from "./styles/profile.module.css";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { profile, isLoading } = useProfile();

  if (isLoading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => navigate(RouteNames.HOME)}>
        ← Back
      </button>

      <div className={styles.content}>
        <ProfileForm
          initialName={profile?.name ?? ""}
          email={user?.email ?? ""}
        />
      </div>
    </div>
  );
};