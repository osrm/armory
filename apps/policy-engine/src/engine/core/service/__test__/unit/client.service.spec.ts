import { EncryptionModule } from '@narval/encryption-module'
import { DataStoreConfiguration, FIXTURE } from '@narval/policy-engine-shared'
import { Alg, privateKeyToJwk } from '@narval/signature'
import { Test } from '@nestjs/testing'
import { MockProxy, mock } from 'jest-mock-extended'
import { generatePrivateKey } from 'viem/accounts'
import { KeyValueRepository } from '../../../../../shared/module/key-value/core/repository/key-value.repository'
import { EncryptKeyValueService } from '../../../../../shared/module/key-value/core/service/encrypt-key-value.service'
import { InMemoryKeyValueRepository } from '../../../../../shared/module/key-value/persistence/repository/in-memory-key-value.repository'
import { getTestRawAesKeyring } from '../../../../../shared/testing/encryption.testing'
import { Client } from '../../../../../shared/type/domain.type'
import { ClientRepository } from '../../../../persistence/repository/client.repository'
import { ClientService } from '../../client.service'
import { DataStoreService } from '../../data-store.service'

describe(ClientService.name, () => {
  let clientService: ClientService
  let clientRepository: ClientRepository
  let dataStoreServiceMock: MockProxy<DataStoreService>

  const clientId = 'test-client-id'

  const dataStoreConfiguration: DataStoreConfiguration = {
    dataUrl: 'a-url-that-doesnt-need-to-exist-for-the-purpose-of-this-test',
    signatureUrl: 'a-url-that-doesnt-need-to-exist-for-the-purpose-of-this-test',
    keys: []
  }

  const client: Client = {
    clientId,
    clientSecret: 'test-client-secret',
    dataStore: {
      entity: dataStoreConfiguration,
      policy: dataStoreConfiguration
    },
    signer: {
      type: 'PRIVATE_KEY',
      key: privateKeyToJwk(generatePrivateKey(), Alg.ES256K)
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const stores = {
    entity: {
      data: FIXTURE.ENTITIES,
      signature: 'test-signature'
    },
    policy: {
      data: FIXTURE.POLICIES,
      signature: 'test-signature'
    }
  }

  beforeEach(async () => {
    dataStoreServiceMock = mock<DataStoreService>()
    dataStoreServiceMock.fetch.mockResolvedValue(stores)

    const module = await Test.createTestingModule({
      imports: [
        EncryptionModule.register({
          keyring: getTestRawAesKeyring()
        })
      ],
      providers: [
        ClientService,
        ClientRepository,
        EncryptKeyValueService,
        {
          provide: DataStoreService,
          useValue: dataStoreServiceMock
        },
        {
          provide: KeyValueRepository,
          useClass: InMemoryKeyValueRepository
        }
      ]
    }).compile()

    clientService = module.get<ClientService>(ClientService)
    clientRepository = module.get<ClientRepository>(ClientRepository)
  })

  describe('syncDataStore', () => {
    beforeEach(async () => {
      await clientRepository.save(client)
    })

    it('saves entity and policy stores', async () => {
      expect(await clientRepository.findEntityStore(clientId)).toEqual(null)
      expect(await clientRepository.findPolicyStore(clientId)).toEqual(null)

      await clientService.syncDataStore(clientId)

      expect(await clientRepository.findEntityStore(clientId)).toEqual(stores.entity)
      expect(await clientRepository.findPolicyStore(clientId)).toEqual(stores.policy)
    })

    it('fetches the data stores once', async () => {
      await clientService.syncDataStore(clientId)

      expect(dataStoreServiceMock.fetch).toHaveBeenCalledTimes(1)
      expect(dataStoreServiceMock.fetch).toHaveBeenCalledWith(client.dataStore)
    })
  })
})