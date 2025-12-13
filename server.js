const http = require('http')
const fs = require('fs')

http.createServer((req, res) => {
  fs.readFile('index.html', (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not found')
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(data)
    }
  })
}).listen(3000)

console.log('SERVER RUNNING on http://localhost:3000')