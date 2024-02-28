import { Action } from '@narval/policy-engine-shared'
import { EvaluationLog } from '@prisma/client/armory'
import { SetOptional } from 'type-fest'
import { ZodIssueCode, ZodSchema, z } from 'zod'
import { AuthorizationRequest, Evaluation } from '../../core/type/domain.type'
import { ACTION_REQUEST } from '../../orchestration.constant'
import { DecodeAuthorizationRequestException } from '../../persistence/exception/decode-authorization-request.exception'
import { signatureSchema } from '../../persistence/schema/signature.schema'
import { AuthorizationRequestModel } from '../../persistence/type/model.type'

type Model = SetOptional<AuthorizationRequestModel, 'evaluationLog'>

const actionSchema = z.nativeEnum(Action)

const approvalSchema = signatureSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date()
})

const buildEvaluation = ({ id, decision, signature, createdAt }: EvaluationLog): Evaluation => ({
  id,
  decision,
  signature,
  createdAt
})

const buildSharedAttributes = (model: Model): Omit<AuthorizationRequest, 'action' | 'request'> => ({
  id: model.id,
  orgId: model.orgId,
  status: model.status,
  idempotencyKey: model.idempotencyKey,
  authentication: signatureSchema.parse({
    alg: model.authnAlg,
    sig: model.authnSig,
    pubKey: model.authnPubKey
  }),
  approvals: z.array(approvalSchema).parse(model.approvals),
  evaluations: (model.evaluationLog || []).map(buildEvaluation),
  createdAt: model.createdAt,
  updatedAt: model.updatedAt
})

/**
 * Decodes a given schema with proper error handling.
 *
 * @throws {DecodeAuthorizationRequestException}
 * @returns {AuthorizationRequest}
 */
const decode = ({ model, schema }: { model: Model; schema: ZodSchema }): AuthorizationRequest => {
  try {
    const decode = schema.safeParse(model.request)

    if (decode.success) {
      return {
        ...buildSharedAttributes(model),
        request: decode.data
      }
    }

    throw new DecodeAuthorizationRequestException(decode.error.issues)
  } catch (error) {
    // The try/catch statement is implemented here specifically to prevent the
    // irony of "safeParse" throwing a TypeError due to bigint coercion on
    // null and undefined values.
    throw new DecodeAuthorizationRequestException([
      {
        code: ZodIssueCode.custom,
        message: `Unknown decode exception ${error.message}`,
        path: ['request']
      }
    ])
  }
}

/**
 * Decodes an authorization request based on its action, throws on errors.
 *
 * @throws {DecodeAuthorizationRequestException}
 * @returns {AuthorizationRequest}
 */
export const decodeAuthorizationRequest = (model: Model): AuthorizationRequest => {
  const action = actionSchema.safeParse(model.action)

  if (action.success) {
    const config = ACTION_REQUEST.get(action.data)

    if (config) {
      return decode({
        model,
        schema: config.schema.read
      })
    }
  }

  throw new DecodeAuthorizationRequestException([
    {
      code: ZodIssueCode.invalid_literal,
      message: 'Authorization request decoder not found for action type',
      path: ['action'],
      expected: Object.keys(ACTION_REQUEST),
      received: model.action
    }
  ])
}