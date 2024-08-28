/* eslint-disable no-console */
import { AuthClient, AuthConfig, Decision, buildSignerEip191, privateKeyToJwk } from '@narval-xyz/armory-sdk'
import { hexSchema } from '@narval-xyz/armory-sdk/policy-engine-shared'
import 'dotenv/config'
import minimist from 'minimist'

const main = async () => {
  const args = minimist(process.argv.slice(2))
  const authId = args._[0]

  console.log(`\x1b[32m🚀 Approving Transfer as Admin\x1b[0m - \x1b[36m${authId}\x1b[0m \n`)

  const adminUserPrivateKey = hexSchema.parse(process.env.ADMIN_USER_PRIVATE_KEY)
  const host = process.env.AUTH_HOST
  const clientId = process.env.CLIENT_ID
  if (!host || !clientId) {
    throw new Error('Missing configuration')
  }

  const authJwk = privateKeyToJwk(adminUserPrivateKey)
  const signer = buildSignerEip191(adminUserPrivateKey)
  const authConfig: AuthConfig = {
    host,
    clientId,
    signer: {
      jwk: authJwk,
      alg: 'EIP191',
      sign: signer
    }
  }
  const auth = new AuthClient(authConfig)

  const authRequest = await auth.getAuthorizationById(authId)
  console.log('🔎 Found pending request')

  await auth.approve(authId)
  const approvedAuthorizationRequest = await auth.getAuthorizationById(authId)
  const result = approvedAuthorizationRequest.evaluations.find(({ decision }) => decision === Decision.PERMIT)

  switch (result?.decision) {
    case Decision.PERMIT: {
      console.log('✅ Transaction approved \n')
      console.log('🔐 Approval token: \n', result.signature)
      break
    }
    case Decision.CONFIRM: {
      console.log('🔐 Request still needs approvals', { authId: approvedAuthorizationRequest.id }, '\n')
      console.table(result.approvalRequirements?.missing)
      break
    }
    case Decision.FORBID:
    default: {
      console.error('❌ Unauthorized')
      console.log('🔍 Response', result, '\n')
    }
  }
}

main().catch(console.error)