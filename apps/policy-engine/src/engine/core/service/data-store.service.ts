import {
  DataStoreConfiguration,
  Entities,
  EntityStore,
  EntityUtil,
  Policy,
  PolicyStore,
  entityDataSchema,
  entitySignatureSchema,
  policyDataSchema,
  policySignatureSchema
} from '@narval/policy-engine-shared'
import { Jwk, decode, hash, verifyJwt } from '@narval/signature'
import { HttpStatus, Injectable } from '@nestjs/common'
import { JwtError } from 'packages/signature/src/lib/error'
import { ZodObject, z } from 'zod'
import { DataStoreException } from '../exception/data-store.exception'
import { DataStoreRepositoryFactory } from '../factory/data-store-repository.factory'

@Injectable()
export class DataStoreService {
  constructor(private dataStoreRepositoryFactory: DataStoreRepositoryFactory) {}

  async fetch(store: { entity: DataStoreConfiguration; policy: DataStoreConfiguration }): Promise<{
    entity: EntityStore
    policy: PolicyStore
  }> {
    const [entityStore, policyStore] = await Promise.all([
      this.fetchEntity(store.entity),
      this.fetchPolicy(store.policy)
    ])

    return {
      entity: entityStore,
      policy: policyStore
    }
  }

  async fetchEntity(store: DataStoreConfiguration): Promise<EntityStore> {
    const [entityData, entitySignature] = await Promise.all([
      this.fetchByUrl(store.dataUrl, entityDataSchema),
      this.fetchByUrl(store.signatureUrl, entitySignatureSchema)
    ])

    const validation = EntityUtil.validate(entityData.entity.data)

    if (validation.success) {
      const signatureVerification = await this.verifySignature({
        data: entityData.entity.data,
        signature: entitySignature.entity.signature,
        keys: store.keys
      })

      if (signatureVerification.success) {
        return {
          data: entityData.entity.data,
          signature: entitySignature.entity.signature
        }
      }

      throw signatureVerification.error
    }

    throw new DataStoreException({
      message: 'Invalid entity domain invariant',
      suggestedHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      context: {
        url: store.dataUrl,
        errors: validation.success ? {} : validation.issues
      }
    })
  }

  async fetchPolicy(store: DataStoreConfiguration): Promise<PolicyStore> {
    const [policyData, policySignature] = await Promise.all([
      this.fetchByUrl(store.dataUrl, policyDataSchema),
      this.fetchByUrl(store.signatureUrl, policySignatureSchema)
    ])

    const signatureVerification = await this.verifySignature({
      data: policyData.policy.data,
      signature: policySignature.policy.signature,
      keys: store.keys
    })

    if (signatureVerification.success) {
      return {
        data: policyData.policy.data,
        signature: policySignature.policy.signature
      }
    }

    throw signatureVerification.error
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetchByUrl<DataSchema extends ZodObject<any>>(
    url: string,
    schema: DataSchema
  ): Promise<z.infer<typeof schema>> {
    const data = await this.dataStoreRepositoryFactory.getRepository(url).fetch(url)
    const result = schema.safeParse(data)

    if (result.success) {
      return result.data
    }

    throw new DataStoreException({
      message: 'Invalid store schema',
      suggestedHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      context: {
        ...(schema.description ? { schema: schema.description } : {}),
        url,
        errors: result.error.errors.map(({ path, message, code }) => ({
          path,
          code,
          message
        }))
      }
    })
  }

  async verifySignature(params: {
    data: Entities | Policy[]
    signature: string
    keys: Jwk[]
  }): Promise<{ success: true } | { success: false; error: DataStoreException }> {
    try {
      const jwt = decode(params.signature)
      const jwk = params.keys.find(({ kid }) => kid === jwt.header.kid)

      if (!jwk) {
        return {
          success: false,
          error: new DataStoreException({
            message: 'JWK not found',
            suggestedHttpStatusCode: HttpStatus.NOT_FOUND,
            context: {
              kid: jwt.header.kid
            }
          })
        }
      }

      const verification = await verifyJwt(params.signature, jwk)

      if (verification.payload.requestHash !== hash(params.data)) {
        return {
          success: false,
          error: new DataStoreException({
            message: 'Data signature mismatch',
            suggestedHttpStatusCode: HttpStatus.UNAUTHORIZED
          })
        }
      }
    } catch (error) {
      if (error instanceof JwtError) {
        return {
          success: false,
          error: new DataStoreException({
            message: 'Invalid signature',
            suggestedHttpStatusCode: HttpStatus.UNAUTHORIZED,
            origin: error
          })
        }
      }

      return {
        success: false,
        error: new DataStoreException({
          message: 'Unknown error',
          suggestedHttpStatusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          origin: error
        })
      }
    }

    return {
      success: true
    }
  }
}