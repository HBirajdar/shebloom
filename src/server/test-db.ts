import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
  const products = await prisma.product.findMany()
  const doctors = await prisma.doctor.findMany()
  const articles = await prisma.article.findMany()

  console.log('Products count:', products.length)
  console.log('Doctors count:', doctors.length)
  console.log('Articles count:', articles.length)
  console.log('Sample product:', JSON.stringify(products[0], null, 2))
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
