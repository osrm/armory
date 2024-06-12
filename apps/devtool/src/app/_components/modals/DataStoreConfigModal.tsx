'use client'

import { faGear } from '@fortawesome/pro-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import NarButton from '../../_design-system/NarButton'
import NarCheckbox from '../../_design-system/NarCheckbox'
import NarDialog from '../../_design-system/NarDialog'
import NarInput from '../../_design-system/NarInput'
import useStore from '../../_hooks/useStore'
import {
  LOCAL_DATA_STORE_URL,
  MANAGED_ENTITY_DATA_STORE_PATH,
  MANAGED_POLICY_DATA_STORE_PATH
} from '../../_lib/constants'

interface DataStoreConfigForm {
  useAuthServer: boolean
  url: string
  clientId: string
  clientSecret: string
}

const initForm: DataStoreConfigForm = {
  useAuthServer: true,
  url: '',
  clientId: '',
  clientSecret: ''
}

const DataStoreConfigModal = () => {
  const {
    useAuthServer,
    authUrl,
    authClientId,
    authClientSecret,
    engineUrl,
    engineClientId,
    engineClientSecret,
    setUseAuthServer,
    setAuthUrl,
    setAuthClientId,
    setAuthClientSecret,
    setEngineUrl,
    setEngineClientId,
    setEngineClientSecret,
    setEntityDataStoreUrl,
    setPolicyDataStoreUrl
  } = useStore()

  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState(initForm)

  const isFormValid = form.url && form.clientId

  const closeDialog = () => {
    setIsOpen(false)
    setForm(initForm)
  }

  const resetForm = (useAuthServer: boolean) => {
    if (useAuthServer) {
      updateForm({
        useAuthServer,
        url: authUrl,
        clientId: authClientId,
        clientSecret: authClientSecret
      })
    } else {
      updateForm({
        useAuthServer,
        url: engineUrl,
        clientId: engineClientId,
        clientSecret: engineClientSecret
      })
    }
  }

  const updateForm = (data: Partial<DataStoreConfigForm>) => setForm((prev) => ({ ...prev, ...data }))

  const saveConfig = () => {
    if (!isFormValid) return

    setUseAuthServer(form.useAuthServer)

    if (form.useAuthServer) {
      setAuthUrl(form.url)
      setAuthClientId(form.clientId)
      setAuthClientSecret(form.clientSecret)
      setEntityDataStoreUrl(`${form.url}/${MANAGED_ENTITY_DATA_STORE_PATH}${form.clientId}`)
      setPolicyDataStoreUrl(`${form.url}/${MANAGED_POLICY_DATA_STORE_PATH}${form.clientId}`)
    } else {
      setEngineUrl(form.url)
      setEngineClientId(form.clientId)
      setEngineClientSecret(form.clientSecret)
      setEntityDataStoreUrl(LOCAL_DATA_STORE_URL)
      setPolicyDataStoreUrl(LOCAL_DATA_STORE_URL)
    }

    closeDialog()
  }

  useEffect(() => {
    if (!isOpen) return

    resetForm(useAuthServer)
  }, [isOpen])

  return (
    <NarDialog
      triggerButton={
        <NarButton variant="secondary" label="Configuration" leftIcon={<FontAwesomeIcon icon={faGear} />} />
      }
      title="Configuration"
      primaryButtonLabel="Save"
      isOpen={isOpen}
      isSaveDisabled={!isFormValid}
      onOpenChange={(val) => (val ? setIsOpen(val) : closeDialog())}
      onSave={saveConfig}
      onDismiss={closeDialog}
    >
      <div className="w-[800px] px-12 py-4">
        <div className="flex flex-col gap-[16px]">
          <NarCheckbox label="Use Auth Server" checked={form.useAuthServer} onCheckedChange={resetForm} />
          <NarInput
            label={`${form.useAuthServer ? 'Auth' : 'Engine'} URL`}
            value={form.url}
            onChange={(url) => updateForm({ url })}
          />
          <NarInput
            label={`${form.useAuthServer ? 'Auth' : 'Engine'} Client ID`}
            value={form.clientId}
            onChange={(clientId) => updateForm({ clientId })}
          />
          <NarInput
            label={`${form.useAuthServer ? 'Auth' : 'Engine'} Client Secret`}
            value={form.clientSecret}
            onChange={(clientSecret) => updateForm({ clientSecret })}
          />
        </div>
      </div>
    </NarDialog>
  )
}

export default DataStoreConfigModal