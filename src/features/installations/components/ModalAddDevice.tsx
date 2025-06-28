import { useEffect } from "react";
import styles from "/src/features/installations/styles/Modal.module.css";
import { Installation, Device } from "../hooks/useInstallations";
import DeviceForm from "./DeviceForm";

interface ModalAddDeviceProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onAddDevice: (installationId: string, device: Device) => Promise<{ message: string }>;
  installation: Installation | null;
  assets: any[];
  loadingAssets: boolean;
  errorLoadingAssets: string | null;
  onRetryLoadAssets: () => void;
  loadAssets: () => void;
}

const ModalAddDevice = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onAddDevice,
  installation,
  assets,
  loadingAssets,
  errorLoadingAssets,
  onRetryLoadAssets,
  loadAssets,
}: ModalAddDeviceProps) => {
  useEffect(() => {
    if (isOpen) loadAssets();
  }, [isOpen]);

  if (!isOpen || !installation) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Agregar Dispositivo</h2>
          <p>Instalación: {installation.company} - {installation.address}</p>
          </div>

          {loadingAssets ? (
            <p>Cargando activos disponibles...</p>
          ) : errorLoadingAssets ? (
            <>
              <p>{errorLoadingAssets.includes("No hay activos") ? errorLoadingAssets : "Error al cargar activos"}</p>
              <button onClick={onRetryLoadAssets}>Reintentar</button>
            </>
          ) : assets.length === 0 ? (
            <p>No hay activos disponibles. Primero crear activos en la sección correspondiente.</p>
          ) : (
            <DeviceForm
              installation={installation}
              onSubmitSuccess={onSubmitSuccess}
              onAddDevice={onAddDevice}
              onCancel={onRequestClose}
              assets={assets}
            />
          )}
        

      </div>
    </div>
  );
};

export default ModalAddDevice;
