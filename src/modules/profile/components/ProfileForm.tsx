import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../../../api/users";
import styles from "../styles/profile.module.css";

interface Props {
  initialName: string;
  email: string;
}

export const ProfileForm = ({ initialName, email }: Props) => {
  const queryClient = useQueryClient();

  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(true);

  const mutation = useMutation({
    mutationFn: () => usersApi.updateProfile({ name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      setSaved(true);
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setSaved(false);
  };

  const handleSave = () => {
    mutation.mutate();
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Profile</h1>
      <p className={styles.email}>{email}</p>

      <div className={styles.field}>
        <label className={styles.label}>Name</label>
        <input
          className={styles.input}
          value={name}
          onChange={handleNameChange}
          placeholder="Your name"
        />
      </div>

      <button
        className={styles.button}
        onClick={handleSave}
        disabled={mutation.isPending || saved}
      >
        {mutation.isPending
          ? "Saving..."
          : saved
          ? "Saved"
          : "Save changes"}
      </button>
    </div>
  );
};