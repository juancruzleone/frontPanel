import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import ProfilePage from "../features/profile/components/ProfilePage";

const Profile = () => {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = t("profile.titlePage", { defaultValue: "Perfil | Leonix" });
  }, [t]);
  return <ProfilePage />;
};

export default Profile; 