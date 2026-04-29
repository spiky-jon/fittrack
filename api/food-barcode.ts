import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { barcode } = req.query

  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=code,product_name,brands,serving_size,serving_quantity,nutriments,image_front_small_url`,
    {
      headers: {
        'User-Agent': 'FitTrack/1.0 (https://fittrack-eight-liart.vercel.app)',
      },
    }
  )

  if (!response.ok) {
    return res.status(404).json({ error: 'Product not found' })
  }

  const data = await response.json()
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(200).json(data)
}
