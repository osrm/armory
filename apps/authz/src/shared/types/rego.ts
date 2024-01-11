import { Actions } from './enums'
import { TransactionRequest } from './http'
import { Intent } from './intents'

export type RegoInput = {
  activityType: Actions
  intent?: Intent
  request: TransactionRequest
  principal: {
    uid: string
  }
  resource: {
    uid: string // walletId
  }
  signatures: { signer: string }[] // TODO: rename this to `approvals: ApprovalSignature[]`
} // <--- this is the REGO structure

export type OpaResult = {
  result: {
    reasons: []
    confirms?: []
    permit: boolean
  }
}