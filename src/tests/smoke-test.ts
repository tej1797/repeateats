const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.repeateats.ca'

async function test(name: string, fn: () => Promise<boolean>) {
  try {
    const result = await fn()
    console.log(result ? `✅ ${name}` : `❌ ${name}`)
    return result
  } catch(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.log(`❌ ${name}: ${msg}`)
    return false
  }
}

async function run() {
  console.log('🧪 RepEAT V2 Smoke Tests\n')
  const results: boolean[] = []

  results.push(await test('Homepage loads', async () => {
    const r = await fetch(SITE); return r.status === 200
  }))
  results.push(await test('Customer login page', async () => {
    const r = await fetch(`${SITE}/customer/login`); return r.status === 200
  }))
  results.push(await test('Restaurant page', async () => {
    const r = await fetch(`${SITE}/restaurant`); return r.status === 200
  }))
  results.push(await test('Influencer page', async () => {
    const r = await fetch(`${SITE}/influencer`); return r.status === 200
  }))
  results.push(await test('Deals API', async () => {
    const r = await fetch(`${SITE}/api/deals?tab=active`)
    const d = await r.json(); return d.data?.length > 0
  }))
  results.push(await test('Restaurants API', async () => {
    const r = await fetch(`${SITE}/api/restaurants`)
    const d = await r.json(); return d.data?.length > 0
  }))
  results.push(await test('Collabs API', async () => {
    const r = await fetch(`${SITE}/api/collabs`)
    const d = await r.json(); return d.data?.length > 0
  }))
  results.push(await test('Google Places fallback', async () => {
    const r = await fetch(`${SITE}/api/google-places?q=indian`)
    const d = await r.json(); return d.results?.length > 0
  }))
  results.push(await test('Customer signup page', async () => {
    const r = await fetch(`${SITE}/customer/signup`); return r.status === 200
  }))
  results.push(await test('Influencer signup page', async () => {
    const r = await fetch(`${SITE}/influencer/signup`); return r.status === 200
  }))

  const passed = results.filter(Boolean).length
  const total = results.length
  console.log(`\n📊 ${passed}/${total} passed`)
  if (passed < total) console.log('⚠️  Fix failures before proceeding to Phase 2')
}

run()
