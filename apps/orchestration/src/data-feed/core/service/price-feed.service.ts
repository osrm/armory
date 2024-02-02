import { DataFeed } from '@app/orchestration/data-feed/core/type/data-feed.type'
import { Config } from '@app/orchestration/orchestration.config'
import { FIAT_ID_USD } from '@app/orchestration/orchestration.constant'
import { AuthorizationRequest } from '@app/orchestration/policy-engine/core/type/domain.type'
import { PriceService } from '@app/orchestration/price/core/service/price.service'
import { getChain } from '@app/orchestration/shared/core/lib/chains.lib'
import { Prices } from '@app/orchestration/shared/core/type/price.type'
import { Action, Alg, AssetId, Feed, Signature, hashRequest } from '@narval/authz-shared'
import { Decoder, InputType, Intents } from '@narval/transaction-request-intent'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { uniq } from 'lodash/fp'
import { privateKeyToAccount } from 'viem/accounts'

@Injectable()
export class PriceFeedService implements DataFeed<Prices> {
  static SOURCE_ID = 'armory/price-feed'

  constructor(private priceService: PriceService, private configService: ConfigService<Config, true>) {}

  getId(): string {
    return PriceFeedService.SOURCE_ID
  }

  async sign(data: Prices): Promise<Signature> {
    const account = privateKeyToAccount(this.getPrivateKey())
    const sig = await account.signMessage({
      message: hashRequest(data)
    })

    return {
      alg: Alg.ES256K,
      pubKey: account.publicKey,
      sig
    }
  }

  getPubKey(): string {
    return privateKeyToAccount(this.getPrivateKey()).publicKey
  }

  private getPrivateKey(): `0x${string}` {
    // TODO (@wcalderipe, 02/02/24): Storing the private key in environment
    // variables is a suitable approach for initial project setup. However, for
    // production environments, it's crucial to secure them in a vault.
    return this.configService.get('dataFeed.priceFeedPrivateKey', { infer: true })
  }

  async getFeed(input: AuthorizationRequest): Promise<Feed<Prices>> {
    // TODO (@wcalderipe, 01/02/2024): De-risk the price values by taking a
    // median of multiple sources.
    const prices = await this.priceService.getPrices({
      from: this.getAssetIds(input),
      to: [FIAT_ID_USD]
    })
    const sig = await this.sign(prices)

    return {
      source: this.getId(),
      sig,
      data: prices
    }
  }

  private getAssetIds(authzRequest: AuthorizationRequest): AssetId[] {
    if (authzRequest.request.action === Action.SIGN_TRANSACTION) {
      const result = new Decoder().safeDecode({
        type: InputType.TRANSACTION_REQUEST,
        txRequest: authzRequest.request.transactionRequest
      })

      const chain = getChain(authzRequest.request.transactionRequest.chainId)

      if (result.success) {
        const { intent } = result

        if (intent.type === Intents.TRANSFER_NATIVE) {
          return uniq([chain.coin.id, intent.token])
        }
      }

      return [chain.coin.id]
    }

    return []
  }
}