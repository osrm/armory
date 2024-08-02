'use client'

import { Permission } from '@narval/armory-sdk'
import { AccountType, Action, Entities, EntityUtil, hexSchema } from '@narval/policy-engine-shared'
import { parseInt } from 'lodash'
import { Dispatch, FC, SetStateAction, useState } from 'react'
import { v4 as uuid } from 'uuid'
import NarButton from '../../_design-system/NarButton'
import NarDialog from '../../_design-system/NarDialog'
import NarInput from '../../_design-system/NarInput'
import useAuthServerApi from '../../_hooks/useAuthServerApi'
import useVaultApi from '../../_hooks/useVaultApi'

interface DeriveAccountsDialogProps {
  setEntities: Dispatch<SetStateAction<Entities>>
}

const DeriveAccountsDialog: FC<DeriveAccountsDialogProps> = (props) => {
  const { deriveAccounts } = useVaultApi()
  const { requestAccessToken } = useAuthServerApi()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [keyId, setKeyId] = useState('')
  const [count, setCount] = useState('')

  const handleClose = () => {
    setIsDialogOpen(false)
    setKeyId('')
    setCount('')
  }

  const handleSave = async () => {
    try {
      setIsProcessing(true)

      const accessToken = await requestAccessToken({
        action: Action.GRANT_PERMISSION,
        resourceId: 'vault',
        nonce: uuid(),
        permissions: [Permission.WALLET_CREATE]
      })

      if (accessToken) {
        const response = await deriveAccounts({
          accessToken,
          keyId,
          count: count ? parseInt(count) : 1
        })

        if (response) {
          props.setEntities((prev) =>
            EntityUtil.addAccounts(
              prev,
              response.accounts.map((account) => ({
                id: account.id,
                address: hexSchema.parse(account.address),
                accountType: AccountType.EOA
              }))
            )
          )

          setIsDialogOpen(false)
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <NarDialog
      triggerButton={<NarButton label="Derive" />}
      title="Derive Accounts"
      primaryButtonLabel={'Derive'}
      isOpen={isDialogOpen}
      onOpenChange={(val) => (val ? setIsDialogOpen(val) : handleClose())}
      onDismiss={handleClose}
      onSave={handleSave}
      isSaving={isProcessing}
      isSaveDisabled={isProcessing}
    >
      <div className="w-[750px] px-12 py-4">
        <div className="flex flex-col gap-[8px]">
          <NarInput label="Wallet Key ID" value={keyId} onChange={setKeyId} />
          <NarInput label="Count (optional)" value={count} onChange={setCount} />
        </div>
      </div>
    </NarDialog>
  )
}

export default DeriveAccountsDialog
