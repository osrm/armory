import { Decision, EvaluationResponse, FIXTURE } from '@narval/policy-engine-shared'
import { ApplicationException } from '../../../../../shared/exception/application.exception'
import { buildPermitTokenPayload } from '../../evaluation.service'

describe('buildPermitTokenPayload', () => {
  const permitResponse: EvaluationResponse = {
    decision: Decision.PERMIT,
    principal: FIXTURE.CREDENTIAL.Alice,
    request: {
      action: 'signTransaction',
      nonce: 'random-nonce-111',
      transactionRequest: {
        from: '0x22228d0504d4f3363a5b7fda1f5fff1c7bca8ad4',
        to: '0x90d03a8971a2faa19a9d7ffdcbca28fe826a289b',
        chainId: 137,
        value: '0xde0b6b3a7640000',
        data: '0x00000000',
        nonce: 192,
        type: '2'
      },
      resourceId: 'eip155:eoa:0x22228d0504d4f3363a5b7fda1f5fff1c7bca8ad4'
    }
  }
  it('should throw an error if decision is not PERMIT', async () => {
    const evaluation: EvaluationResponse = { ...permitResponse, decision: Decision.FORBID }
    await expect(buildPermitTokenPayload('clientId', evaluation)).rejects.toThrow(ApplicationException)
  })

  it('should throw an error if principal is missing', async () => {
    const evaluation: EvaluationResponse = { ...permitResponse, principal: undefined }
    await expect(buildPermitTokenPayload('clientId', evaluation)).rejects.toThrow(ApplicationException)
  })

  it('should throw an error if request is missing', async () => {
    const evaluation: EvaluationResponse = { ...permitResponse, request: undefined }
    await expect(buildPermitTokenPayload('clientId', evaluation)).rejects.toThrow(ApplicationException)
  })

  it('should return a jwt payload if all conditions are met', async () => {
    const payload = await buildPermitTokenPayload('clientId', permitResponse)
    expect(payload).toEqual({
      cnf: {
        alg: 'ES256K',
        crv: 'secp256k1',
        kid: '0x4fca4ebdd44d54a470a273cb6c131303892cb754f0d374a860fab7936bb95d94',
        kty: 'EC',
        x: 'zb-LwlHDtp5sV8E33k3H2TCm-LNTGIcFjODNWI4gHRY',
        y: '6Pbt6dwxAeS7yHp7YV2GbXs_Px0tWrTfeTv9erjC7zs'
      },
      exp: expect.any(Number),
      iat: expect.any(Number),
      iss: 'https://armory.narval.xyz',
      requestHash: '0x608abe908cffeab1fc33edde6b44586f9dacbc9c6fe6f0a13fa307237290ce5a',
      sub: 'test-alice-user-uid'
    })
  })
})
