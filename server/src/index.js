import express from 'express'

const app = express()
const port = Number(process.env.PORT || 3001)

app.disable('x-powered-by')
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'learnstuff-server' })
})

app.listen(port, () => {
  console.log(`LearnStuff API listening on http://localhost:${port}`)
})
