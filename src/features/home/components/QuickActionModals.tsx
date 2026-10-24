import { useEffect } from "react"
import ModalCreateWorkOrder from "../../workOrders/components/ModalCreate"
import useWorkOrders from "../../workOrders/hooks/useWorkOrders"
import ModalCreateAsset from "../../assets/components/ModalCreate"
import useAssets from "../../assets/hooks/useAssets"
import ModalCreateInstallation from "../../installations/components/ModalCreate"
import useInstallations from "../../installations/hooks/useInstallations"

export type QuickActionModalType = "workOrder" | "asset" | "installation" | null

interface QuickActionModalsProps {
  activeModal: QuickActionModalType
  onClose: () => void
  onSuccess: () => void
}

export const QuickActionModals = ({ activeModal, onClose, onSuccess }: QuickActionModalsProps) => {
  if (!activeModal) return null

  if (activeModal === "workOrder") {
    return <WorkOrderModalHost onClose={onClose} onSuccess={onSuccess} />
  }

  if (activeModal === "asset") {
    return <AssetModalHost onClose={onClose} onSuccess={onSuccess} />
  }

  if (activeModal === "installation") {
    return <InstallationModalHost onClose={onClose} onSuccess={onSuccess} />
  }

  return null
}

const WorkOrderModalHost = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const {
    addWorkOrder,
    installations,
    technicians,
    loadingInstallations,
    errorLoadingInstallations,
    loadTechnicians,
    loadInstallations,
  } = useWorkOrders()

  useEffect(() => {
    loadTechnicians()
    loadInstallations()
  }, [loadTechnicians, loadInstallations])

  return (
    <ModalCreateWorkOrder
      isOpen
      onRequestClose={onClose}
      onSubmitSuccess={() => {
        onSuccess()
        onClose()
      }}
      onSubmitError={() => undefined}
      onAdd={addWorkOrder}
      installations={installations}
      technicians={technicians}
      loadingInstallations={loadingInstallations}
      errorLoadingInstallations={errorLoadingInstallations}
    />
  )
}

const AssetModalHost = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const { addAsset } = useAssets()

  return (
    <ModalCreateAsset
      isOpen
      onRequestClose={onClose}
      onSubmitSuccess={() => {
        onSuccess()
        onClose()
      }}
      onSubmitError={() => undefined}
      onAdd={addAsset}
    />
  )
}

const InstallationModalHost = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const { addInstallation } = useInstallations()

  return (
    <ModalCreateInstallation
      isOpen
      onRequestClose={onClose}
      onSubmitSuccess={() => {
        onSuccess()
        onClose()
      }}
      onSubmitError={() => undefined}
      onAdd={addInstallation}
    />
  )
}
