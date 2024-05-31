import { ConfigModule, ConfigService } from '@narval/config-module'
import { NullLoggerService, secret } from '@narval/nestjs-shared'
import { DataStoreConfiguration, HttpSource, PublicClient, Source, SourceType } from '@narval/policy-engine-shared'
import { getPublicKey, privateKeyToJwk } from '@narval/signature'
import { HttpStatus, INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import nock from 'nock'
import request from 'supertest'
import { generatePrivateKey } from 'viem/accounts'
import { AppService } from '../../../app/core/service/app.service'
import { Config, load } from '../../../armory.config'
import { REQUEST_HEADER_API_KEY } from '../../../armory.constant'
import { TestPrismaService } from '../../../shared/module/persistence/service/test-prisma.service'
import { ClientModule } from '../../client.module'
import { ClientService } from '../../core/service/client.service'
import { CreateClientRequestDto } from '../../http/rest/dto/create-client.dto'

// TODO: (@wcalderipe, 16/05/24) Evaluate testcontainers
// https://node.testcontainers.org/quickstart/
// The goal is to replace the mock server in the E2E test, which can be
// misinterpreted by a human, with a real server in a container for a more
// accurate and reliable tests.
const mockPolicyEngineServer = (url: string, clientId: string) => {
  const dataStoreSource: Source = {
    type: SourceType.HTTP,
    url: 'http://localost:999'
  }

  const dataStoreConfig: DataStoreConfiguration = {
    data: dataStoreSource,
    signature: dataStoreSource,
    keys: [getPublicKey(privateKeyToJwk(generatePrivateKey()))]
  }

  const createClientResponse: PublicClient = {
    clientId,
    clientSecret: secret.generate(),
    createdAt: new Date(),
    updatedAt: new Date(),
    signer: {
      publicKey: getPublicKey(privateKeyToJwk(generatePrivateKey()))
    },
    dataStore: {
      entity: dataStoreConfig,
      policy: dataStoreConfig
    }
  }

  nock(url).post('/clients').reply(HttpStatus.CREATED, createClientResponse)
}

describe('Client', () => {
  let app: INestApplication
  let module: TestingModule
  let clientService: ClientService
  let configService: ConfigService<Config>
  let testPrismaService: TestPrismaService
  let appService: AppService
  let policyEngineNodeUrl: string

  const clientId = 'test-client-id'

  const adminApiKey = 'test-admin-api-key'

  const entityStorePublicKey = getPublicKey(privateKeyToJwk(generatePrivateKey()))

  const policyStorePublicKey = getPublicKey(privateKeyToJwk(generatePrivateKey()))

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [load],
          isGlobal: true
        }),
        ClientModule
      ]
    })
      .setLogger(new NullLoggerService())
      .compile()

    app = module.createNestApplication()

    clientService = module.get(ClientService)
    configService = module.get(ConfigService)
    testPrismaService = module.get(TestPrismaService)
    appService = module.get(AppService)

    policyEngineNodeUrl = configService.get('policyEngine.nodes')[0].url

    await app.init()
  })

  afterAll(async () => {
    await testPrismaService.truncateAll()
    await module.close()
    await app.close()
  })

  beforeEach(async () => {
    await testPrismaService.truncateAll()

    await appService.provision(secret.hash(adminApiKey))
  })

  describe('POST /clients', () => {
    const dataStoreSource: HttpSource = {
      type: SourceType.HTTP,
      url: 'http://127.0.0.1:9999/test-data-store'
    }

    const createClientPayload: CreateClientRequestDto = {
      name: 'Acme',
      id: clientId,
      dataStore: {
        entity: {
          data: dataStoreSource,
          signature: dataStoreSource,
          keys: [entityStorePublicKey]
        },
        policy: {
          data: dataStoreSource,
          signature: dataStoreSource,
          keys: [policyStorePublicKey]
        }
      }
    }

    it('creates a new client with a default policy engines', async () => {
      mockPolicyEngineServer(policyEngineNodeUrl, clientId)

      const { status, body } = await request(app.getHttpServer())
        .post('/clients')
        .set(REQUEST_HEADER_API_KEY, adminApiKey)
        .send(createClientPayload)

      const actualClient = await clientService.findById(body.id)

      expect(body).toEqual({
        ...actualClient,
        createdAt: actualClient?.createdAt.toISOString(),
        updatedAt: actualClient?.updatedAt.toISOString()
      })

      expect(actualClient?.dataStore.entityPublicKey).toEqual(createClientPayload.dataStore.entity.keys[0])
      expect(actualClient?.dataStore.policyPublicKey).toEqual(createClientPayload.dataStore.policy.keys[0])

      expect(status).toEqual(HttpStatus.CREATED)
    })

    it('creates a new client with given policy engines', async () => {
      mockPolicyEngineServer(policyEngineNodeUrl, clientId)
      mockPolicyEngineServer(policyEngineNodeUrl, clientId)

      const createClientWithGivenPolicyEngine: CreateClientRequestDto = {
        ...createClientPayload,
        policyEngineNodes: [policyEngineNodeUrl, policyEngineNodeUrl]
      }

      const { body } = await request(app.getHttpServer())
        .post('/clients')
        .set(REQUEST_HEADER_API_KEY, adminApiKey)
        .send(createClientWithGivenPolicyEngine)

      const actualClient = await clientService.findById(body.id)

      expect(actualClient?.policyEngine.nodes[0].url).toEqual(policyEngineNodeUrl)
    })

    it('responds with unprocessable entity when payload is invalid', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/clients')
        .set(REQUEST_HEADER_API_KEY, adminApiKey)
        .send({})

      expect(status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY)
    })

    it('responds with forbidden when admin api key is invalid', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/clients')
        .set(REQUEST_HEADER_API_KEY, 'invalid-admin-api-key')
        .send({})

      expect(status).toEqual(HttpStatus.FORBIDDEN)
    })
  })
})