import { Policy } from '@narval/policy-engine-shared'
import { exec as execCommand } from 'child_process'
import { cp, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { promisify } from 'util'
import { POLICY_ENTRYPOINT } from '../../open-policy-agent.constant'
import { transpile } from './rego-transpiler.util'

type BuildWebAssemblyOption = {
  path: string
  regoCorePath: string
  regoRuleTemplatePath: string
  policies: Policy[]
  cleanAfter?: boolean
}

const exec = promisify(execCommand)

export const getRegoCorePath = (resourcePath: string): string => {
  return `${resourcePath}/open-policy-agent/rego`
}

export const createDirectories = async (path: string) => {
  await mkdir(path, { recursive: true })

  const regoSourceDirectory = `${path}/rego`
  const generatedRegoDirectory = `${regoSourceDirectory}/generated`
  const distDirectory = `${path}/dist`

  await Promise.all([mkdir(generatedRegoDirectory, { recursive: true }), mkdir(distDirectory)])

  return {
    regoSourceDirectory,
    generatedRegoDirectory,
    distDirectory
  }
}

export const writeRegoPolicies = async (option: {
  policies: Policy[]
  filename: string
  path: string
  regoRuleTemplatePath: string
}) => {
  const policies = await transpile(option.policies, option.regoRuleTemplatePath)
  const file = `${option.path}/${option.filename}`

  await writeFile(file, policies, 'utf-8')

  return { file }
}

export const copyRegoCore = async (option: { source: string; destination: string }) => {
  await cp(option.source, option.destination, {
    recursive: true,
    filter: (source) => !source.includes('__test__')
  })
}

export const buildOpaBundle = async (option: { regoSourceDirectory: string; distDirectory: string }) => {
  const bundleFile = `${option.distDirectory}/bundle.tar.gz`

  const cmd = [
    'opa',
    'build',
    '--target wasm',
    `--entrypoint ${POLICY_ENTRYPOINT}`,
    `--bundle ${option.regoSourceDirectory}`,
    `--output ${bundleFile}`
  ]

  await exec(cmd.join(' '))

  return { bundleFile }
}

export const unzip = async (option: { source: string; destination: string }) => {
  await exec(`tar -xzf ${option.source} -C ${option.destination}`)
}

export const build = async (option: BuildWebAssemblyOption): Promise<Buffer> => {
  const cleanAfter = option.cleanAfter ?? true

  try {
    const { regoSourceDirectory, generatedRegoDirectory, distDirectory } = await createDirectories(option.path)

    await copyRegoCore({
      source: option.regoCorePath,
      destination: regoSourceDirectory
    })

    await writeRegoPolicies({
      policies: option.policies,
      path: generatedRegoDirectory,
      filename: 'policies.rego',
      regoRuleTemplatePath: option.regoRuleTemplatePath
    })

    const { bundleFile } = await buildOpaBundle({ regoSourceDirectory, distDirectory })

    await unzip({
      source: bundleFile,
      destination: distDirectory
    })

    return readFile(`${distDirectory}/policy.wasm`)
  } finally {
    if (cleanAfter) {
      await rm(option.path, { recursive: true, force: true })
    }
  }
}