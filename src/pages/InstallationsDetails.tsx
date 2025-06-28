import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "../features/installationsDetails/styles/installationDetails.module.css";
import { Trash, Edit, Plus } from "lucide-react";
import ModalAddDevice from "../features/installations/components/ModalAddDevice";
import ModalConfirmDelete from "../features/installations/components/ModalConfirmDelete";
import ModalSuccess from "../features/installations/components/ModalSuccess";
import useInstallations from "../features/installations/hooks/useInstallations";
import { Device } from "../features/installations/hooks/useInstallations";

const InstallationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { installationName } = location.state || { installationName: "" };

  const { 
    currentInstallation, 
    installationDevices, 
    loading, 
    loadInstallationDetails,
    addDeviceToInstallation,
    removeDeviceFromInstallation,
  } = useInstallations();

  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [responseMessage, setResponseMessage] = useState("");

  useEffect(() => {
    if (id) {
      loadInstallationDetails(id);
      document.title = `Dispositivos | LeoneSuite`;
    }
  }, [id, loadInstallationDetails]);

  const handleAddDevice = async (device: Device) => {
    try {
      if (!id) return;
      const result = await addDeviceToInstallation(id, device);
      setResponseMessage(result.message);
      setIsAddDeviceModalOpen(false);
      loadInstallationDetails(id); // Recargar los dispositivos después de agregar uno nuevo
    } catch (error) {
      console.error("Error adding device:", error);
      setResponseMessage("Error al agregar dispositivo");
    }
  };

  const handleDeleteDevice = async () => {
    if (!deviceToDelete?._id || !id) return;
    try {
      await removeDeviceFromInstallation(id, deviceToDelete._id);
      setResponseMessage("Dispositivo eliminado con éxito");
      loadInstallationDetails(id); // Recargar los dispositivos después de eliminar
    } catch (error) {
      console.error("Error deleting device:", error);
      setResponseMessage("Error al eliminar dispositivo");
    } finally {
      setIsDeleteModalOpen(false);
      setDeviceToDelete(null);
    }
  };

  const closeModal = () => setResponseMessage("");

  if (loading && !currentInstallation) {
    return <div className={styles.loader}>Cargando dispositivos...</div>;
  }

  if (!currentInstallation) {
    return <div className={styles.loader}>Instalación no encontrada</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dispositivos de {installationName || currentInstallation.company}</h1>
        <p className={styles.address}>
          {currentInstallation.address}, {currentInstallation.city}, {currentInstallation.province}
        </p>
        <div className={styles.actions}>
          <button 
            className={styles.addButton} 
            onClick={() => setIsAddDeviceModalOpen(true)}
          >
            <Plus size={20} /> Agregar dispositivo
          </button>
        </div>
      </div>

      <div className={styles.devicesList}>
        {installationDevices.length === 0 ? (
          <p className={styles.emptyMessage}>No hay dispositivos en esta instalación</p>
        ) : (
          installationDevices.map(device => (
            <div key={device._id} className={styles.deviceCard}>
              <div className={styles.deviceInfo}>
                <h3>{device.nombre}</h3>
                <p><strong>Tipo:</strong> {device.categoria}</p>
                <p><strong>Ubicación:</strong> {device.ubicacion}</p>
                <p><strong>Estado:</strong> <span className={styles[device.estado?.replace(/\s/g, '') || '']}>{device.estado}</span></p>
                {device.marca && <p><strong>Marca:</strong> {device.marca}</p>}
                {device.modelo && <p><strong>Modelo:</strong> {device.modelo}</p>}
                {device.numeroSerie && <p><strong>N° Serie:</strong> {device.numeroSerie}</p>}
              </div>
              <div className={styles.deviceActions}>
                <button 
                  className={styles.editButton}
                  onClick={() => navigate(`/instalaciones/${id}/dispositivos/${device._id}/editar`)}
                >
                  <Edit size={18} />
                </button>
                <button 
                  className={styles.deleteButton}
                  onClick={() => {
                    setDeviceToDelete(device);
                    setIsDeleteModalOpen(true);
                  }}
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ModalAddDevice
        isOpen={isAddDeviceModalOpen}
        onRequestClose={() => setIsAddDeviceModalOpen(false)}
        onSubmit={handleAddDevice}
        installation={currentInstallation}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteDevice}
        title="¿Eliminar dispositivo?"
        description="Esta acción no se puede deshacer."
      />

      <ModalSuccess
        isOpen={!!responseMessage}
        onRequestClose={closeModal}
        mensaje={responseMessage}
      />
    </div>
  );
};

export default InstallationDetails;