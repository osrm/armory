import { ConfigModule, ConfigService } from '@narval/config-module'
import { EncryptionModuleOptionProvider } from '@narval/encryption-module'
import { Action, Criterion, Decision, FIXTURE, Then } from '@narval/policy-engine-shared'
import { PrivateKey, secp256k1PrivateKeyToJwk } from '@narval/signature'
import { HttpStatus, INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomBytes } from 'crypto'
import request from 'supertest'
import { v4 as uuid } from 'uuid'
import { generatePrivateKey } from 'viem/accounts'
import { EngineService } from '../../../engine/core/service/engine.service'
import { Config, load } from '../../../policy-engine.config'
import { REQUEST_HEADER_CLIENT_ID, REQUEST_HEADER_CLIENT_SECRET } from '../../../policy-engine.constant'
import { KeyValueRepository } from '../../../shared/module/key-value/core/repository/key-value.repository'
import { InMemoryKeyValueRepository } from '../../../shared/module/key-value/persistence/repository/in-memory-key-value.repository'
import { TestPrismaService } from '../../../shared/module/persistence/service/test-prisma.service'
import { getEntityStore, getPolicyStore } from '../../../shared/testing/data-store.testing'
import { getTestRawAesKeyring } from '../../../shared/testing/encryption.testing'
import { generateInboundEvaluationRequest } from '../../../shared/testing/evaluation.testing'
import { Tenant } from '../../../shared/type/domain.type'
import { EngineSignerConfigService } from '../../core/service/engine-signer-config.service'
import { TenantService } from '../../core/service/tenant.service'
import { EngineModule } from '../../engine.module'

describe('Evaluation', () => {
  let app: INestApplication
  let privateKey: PrivateKey
  let module: TestingModule
  let tenant: Tenant
  let tenantService: TenantService
  let testPrismaService: TestPrismaService

  const adminApiKey = 'test-admin-api-key'

  const clientId = uuid()

  const dataStoreUrl = 'http://127.0.0.1:9999/test-data-store'

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [load],
          isGlobal: true
        }),
        EngineModule
      ]
    })
      .overrideProvider(KeyValueRepository)
      .useValue(new InMemoryKeyValueRepository())
      .overrideProvider(EncryptionModuleOptionProvider)
      .useValue({
        keyring: getTestRawAesKeyring()
      })
      .compile()

    app = module.createNestApplication()

    const engineService = module.get<EngineService>(EngineService)
    const engineSignerConfigService = module.get<EngineSignerConfigService>(EngineSignerConfigService)
    const configService = module.get<ConfigService<Config>>(ConfigService)
    tenantService = module.get<TenantService>(TenantService)
    testPrismaService = module.get<TestPrismaService>(TestPrismaService)

    await testPrismaService.truncateAll()

    privateKey = secp256k1PrivateKeyToJwk(generatePrivateKey())

    const dataStoreConfiguration = {
      dataUrl: dataStoreUrl,
      signatureUrl: dataStoreUrl,
      keys: [privateKey]
    }

    await engineService.save({
      id: configService.get('engine.id'),
      masterKey: 'unsafe-test-master-key',
      adminApiKey
    })

    await engineSignerConfigService.save({
      type: 'PRIVATE_KEY',
      key: privateKey
    })

    tenant = await tenantService.onboard(
      {
        clientId,
        clientSecret: randomBytes(42).toString('hex'),
        dataStore: {
          entity: dataStoreConfiguration,
          policy: dataStoreConfiguration
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { syncAfter: false }
    )

    await tenantService.savePolicyStore(tenant.clientId, await getPolicyStore([], privateKey))
    await tenantService.saveEntityStore(tenant.clientId, await getEntityStore(FIXTURE.ENTITIES, privateKey))

    await app.init()
  })

  afterAll(async () => {
    await testPrismaService.truncateAll()
    await module.close()
    await app.close()
  })

  describe('POST /evaluations', () => {
    it('evaluates a forbid', async () => {
      const payload = await generateInboundEvaluationRequest()

      const { status, body } = await request(app.getHttpServer())
        .post('/evaluations')
        .set(REQUEST_HEADER_CLIENT_ID, tenant.clientId)
        .set(REQUEST_HEADER_CLIENT_SECRET, tenant.clientSecret)
        .send(payload)

      expect(body).toEqual({
        decision: Decision.FORBID,
        request: payload.request
      })
      expect(status).toEqual(HttpStatus.OK)
    })

    it('evaluates a permit', async () => {
      await tenantService.savePolicyStore(
        tenant.clientId,
        await getPolicyStore(
          [
            {
              then: Then.PERMIT,
              name: 'test permit policy',
              when: [
                {
                  criterion: Criterion.CHECK_ACTION,
                  args: [Action.SIGN_TRANSACTION]
                }
              ]
            }
          ],
          privateKey
        )
      )

      const payload = await generateInboundEvaluationRequest()

      const { status, body } = await request(app.getHttpServer())
        .post('/evaluations')
        .set(REQUEST_HEADER_CLIENT_ID, tenant.clientId)
        .set(REQUEST_HEADER_CLIENT_SECRET, tenant.clientSecret)
        .send(payload)

      expect(body).toMatchObject({
        decision: Decision.PERMIT,
        request: payload.request,
        accessToken: {
          value: expect.any(String)
        },
        approvals: {
          missing: [],
          required: [],
          satisfied: []
        }
      })
      expect(status).toEqual(HttpStatus.OK)
    })

    it('responds with forbid when client secret is missing', async () => {
      const payload = await generateInboundEvaluationRequest()

      const { status, body } = await request(app.getHttpServer())
        .post('/evaluations')
        .set(REQUEST_HEADER_CLIENT_ID, tenant.clientId)
        .send(payload)

      expect(body).toEqual({
        message: `Missing or invalid ${REQUEST_HEADER_CLIENT_SECRET} header`,
        statusCode: HttpStatus.UNAUTHORIZED
      })
      expect(status).toEqual(HttpStatus.UNAUTHORIZED)
    })
  })
})
