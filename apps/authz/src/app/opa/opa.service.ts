import { PersistenceRepository } from '@app/authz/shared/module/persistence/persistence.repository'
import { OpaResult, RegoInput } from '@app/authz/shared/types/rego'
import { Injectable, Logger } from '@nestjs/common'
import { loadPolicy } from '@open-policy-agent/opa-wasm'
import { readFileSync } from 'fs'
import path from 'path'

type PromiseType<T extends Promise<unknown>> = T extends Promise<infer U> ? U : never
type OpaEngine = PromiseType<ReturnType<typeof loadPolicy>>

const OPA_WASM_PATH = path.join(process.cwd(), './rego-build/policy.wasm')

@Injectable()
export class OpaService {
  private logger = new Logger(OpaService.name)
  private opaEngine: OpaEngine | undefined

  constructor(private persistenceRepository: PersistenceRepository) {}

  async onApplicationBootstrap() {
    this.logger.log('OPA Service boot')
    const policyWasmPath = OPA_WASM_PATH
    const policyWasm = readFileSync(policyWasmPath)
    const opaEngine = await loadPolicy(policyWasm)
    const data = await this.persistenceRepository.getEntityData()
    opaEngine.setData(data)
    this.opaEngine = opaEngine
  }

  async evaluate(input: RegoInput): Promise<OpaResult[]> {
    if (!this.opaEngine) throw new Error('OPA Engine not initialized')
    const result = await this.opaEngine.evaluate(input)
    return result
  }
}