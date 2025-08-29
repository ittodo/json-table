import http from "http"
import fs from "fs"
import path from "path"
import url from "url"

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
// Serve demo build output (vite build demo --outDir dist-demo)
// Vite runs with root = demo, so output lives under demo/dist-demo
const root = path.resolve(__dirname, "..", "demo", "dist-demo")
const port = process.env.PORT ? Number(process.env.PORT) : 5179

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8"
}

const server = http.createServer((req, res) => {
  const reqUrl = decodeURIComponent(req.url || "/")
  const rel = reqUrl.replace(/^\//, "") || "index.html"
  const filePath = path.join(root, rel)
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      const indexPath = path.join(root, "index.html")
      fs.readFile(indexPath, (e2, data2) => {
        if (e2) { res.writeHead(404); res.end("Not Found"); return }
        res.writeHead(200, { "Content-Type": mime[".html"] })
        res.end(data2)
      })
      return
    }
    const ext = path.extname(filePath)
    fs.readFile(filePath, (e, data) => {
      if (e) { res.writeHead(500); res.end(String(e)); return }
      res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" })
      res.end(data)
    })
  })
})

server.listen(port, () => {
  console.log(`Serving demo/dist-demo on http://localhost:${port}`)
  console.log(`Root: ${root}`)
})
