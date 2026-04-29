import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q, page = '1' } = req.query

  const params = new URLSearchParams({
    search_terms: String(q),
    json: '1',
    page: String(page),
    page_size: '20',
    fields: 'code,product_name,brands,serving_size,serving_quantity,nutriments,image_front_small_url',
    lc: 'en',
    cc: 'gb',
  })

  const response = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?${params}`,
    {
      headers: {
        'User-Agent': 'FitTrack/1.0 (https://fittrack-eight-liart.vercel.app)',
      },
    }
  )

  if (!response.ok) {
    return res.status(response.status).json({ error: 'Search failed' })
  }

  const data = await response.json()
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(200).json(data)
}
