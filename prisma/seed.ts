import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const country = await prisma.country.upsert({ where:{code:'IN'}, update:{name:'India'}, create:{code:'IN',name:'India'} });
  const state = await prisma.state.upsert({ where:{countryId_code:{countryId:country.id,code:'27'}}, update:{name:'Maharashtra'}, create:{countryId:country.id,code:'27',name:'Maharashtra'} });
  const district = await prisma.district.upsert({ where:{stateId_code:{stateId:state.id,code:'497'}}, update:{name:'Nandurbar'}, create:{stateId:state.id,code:'497',name:'Nandurbar'} });
  const sub = await prisma.subDistrict.upsert({ where:{districtId_code:{districtId:district.id,code:'03950'}}, update:{name:'Akkalkuwa'}, create:{districtId:district.id,code:'03950',name:'Akkalkuwa'} });
  for (const [code,name] of [['525002','Manibeli'],['525003','Dhankhedi'],['525004','Chimalkhadi'],['525005','Sinduri']]) await prisma.village.upsert({where:{code},update:{name,subDistrictId:sub.id},create:{code,name,subDistrictId:sub.id}});
  console.log('Seed complete');
}
main().catch(console.error).finally(()=>prisma.$disconnect());
