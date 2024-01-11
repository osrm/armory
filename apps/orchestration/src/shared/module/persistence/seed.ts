import { Logger } from '@nestjs/common'
import { Organization, PrismaClient } from '@prisma/client/orchestration'

const logger = new Logger('OrchestrationSeed')
const prisma = new PrismaClient()
const now = new Date()

const orgs: Organization[] = [
  {
    id: '7d704a62-d15e-4382-a826-1eb41563043b',
    name: 'Dev',
    createdAt: now,
    updatedAt: now
  }
]

async function main() {
  await prisma.organization.createMany({
    data: orgs
  })

  logger.log('Orchestration database germinated 🌱')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })