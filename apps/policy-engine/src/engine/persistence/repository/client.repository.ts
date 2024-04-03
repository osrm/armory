import { EntityStore, PolicyStore, entityStoreSchema, policyStoreSchema } from '@narval/policy-engine-shared'
import { Injectable } from '@nestjs/common'
import { compact } from 'lodash/fp'
import { z } from 'zod'
import { EncryptKeyValueService } from '../../../shared/module/key-value/core/service/encrypt-key-value.service'
import { decode, encode } from '../../../shared/module/key-value/core/util/coercion.util'
import { Client } from '../../../shared/type/domain.type'

const ClientListIndex = z.array(z.string())

@Injectable()
export class ClientRepository {
  constructor(private encryptKeyValueService: EncryptKeyValueService) {}

  async findByClientId(clientId: string): Promise<Client | null> {
    const value = await this.encryptKeyValueService.get(this.getKey(clientId))

    if (value) {
      return decode(Client, value)
    }

    return null
  }

  async save(client: Client): Promise<Client> {
    await this.encryptKeyValueService.set(this.getKey(client.clientId), encode(Client, client))
    await this.index(client)

    return client
  }

  async getClientListIndex(): Promise<string[]> {
    const index = await this.encryptKeyValueService.get(this.getIndexKey())

    if (index) {
      return decode(ClientListIndex, index)
    }

    return []
  }

  async saveEntityStore(clientId: string, store: EntityStore): Promise<boolean> {
    return this.encryptKeyValueService.set(this.getEntityStoreKey(clientId), encode(entityStoreSchema, store))
  }

  async findEntityStore(clientId: string): Promise<EntityStore | null> {
    const value = await this.encryptKeyValueService.get(this.getEntityStoreKey(clientId))

    if (value) {
      return decode(entityStoreSchema, value)
    }

    return null
  }

  async savePolicyStore(clientId: string, store: PolicyStore): Promise<boolean> {
    return this.encryptKeyValueService.set(this.getPolicyStoreKey(clientId), encode(policyStoreSchema, store))
  }

  async findPolicyStore(clientId: string): Promise<PolicyStore | null> {
    const value = await this.encryptKeyValueService.get(this.getPolicyStoreKey(clientId))

    if (value) {
      return decode(policyStoreSchema, value)
    }

    return null
  }

  // TODO: (@wcalderipe, 07/03/24) we need to rethink this strategy. If we use a
  // SQL database, this could generate a massive amount of queries; thus,
  // degrading the performance.
  //
  // An option is to move these general queries `findBy`, findAll`, etc to the
  // KeyValeuRepository implementation letting each implementation pick the best
  // strategy to solve the problem (e.g. where query in SQL)
  async findAll(): Promise<Client[]> {
    const ids = await this.getClientListIndex()
    const clients = await Promise.all(ids.map((id) => this.findByClientId(id)))

    return compact(clients)
  }

  async clear(): Promise<boolean> {
    try {
      const ids = await this.getClientListIndex()
      await Promise.all(ids.map((id) => this.encryptKeyValueService.delete(id)))

      return true
    } catch {
      return false
    }
  }

  getKey(clientId: string): string {
    return `client:${clientId}`
  }

  getIndexKey(): string {
    return 'client:list-index'
  }

  getEntityStoreKey(clientId: string): string {
    return `client:${clientId}:entity-store`
  }

  getPolicyStoreKey(clientId: string): string {
    return `client:${clientId}:policy-store`
  }

  private async index(client: Client): Promise<boolean> {
    const currentIndex = await this.getClientListIndex()

    await this.encryptKeyValueService.set(
      this.getIndexKey(),
      encode(ClientListIndex, [...currentIndex, client.clientId])
    )

    return true
  }
}