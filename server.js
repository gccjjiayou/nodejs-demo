const express = require('express')
const static = require('express-static')
const cookieParser = require('cookie-parser')
const cookieSession = require('cookie-session')
const bodyParser = require('body-parser')
const multer = require('multer')
const consolidate = require('consolidate')
const mysql = require('mysql')
const common = require('./libs/common')

// 连接池
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'blog'
})

var server = express()
server.listen(8080)

// 1. 解析cookie
server.use(cookieParser('12345678abc'))

// 2. 使用session
var arr = []
for(var i = 0; i < 100000; i++) {
  arr.push('keys_' + Math.random())
}
server.use(cookieSession({
  name: 'zns_session_id',
  keys: arr,
  maxAge: 20 * 3600 * 1000
}))

// 3. post数据
server.use(bodyParser.urlencoded({extended: false}))
server.use(multer({dest: './www/upload'}).any())

// 4. 配置模板引擎
server.set('view engine', 'html') // 输出什么东西
server.set('views', './template')  // 模板文件放在哪儿
server.engine('html', consolidate.ejs)  //那种模板引擎

// 5. 接收用户请求
server.get('/', (req, res, next) => {
  // 查询banner的东西
  db.query('SELECT * FROM banner_table', (err, data) => {
    if(err) {
      console.log(err)
      res.status(500).send('database error').end()
      
    } else {
      res.banners = data
      next()
    }
  })
})
server.get('/', (req, res, next) => {
  db.query('SELECT ID, title, summary FROM article_table', (err, data) => {
    if(err) {
      console.log(err)
      res.status(500).send('database error').end()
    } else {
      res.articles = data
      next()
    }
  })
})
server.get('/', (req, res) => {
  res.render('index.ejs', {
    banners: res.banners,
    articles: res.articles
  })
})
server.get('/article', (req, res) => {
  if(req.query.id) {
    db.query(`SELECT * FROM article_table WHERE ID=${req.query.id}`, (err, data) => {
      if(err) {
        res.status(500).send('数据有问题').end()
      } else {
        if(data.length === 0) {
          res.status(404).send('您请求的页面找不到').end()
        } else {
          var articleData = data[0]
          articleData.sDate = common.time2date(articleData.post_time)
          articleData.content = articleData.content.replace(/^/gm, '<p>').replace(/$/gm, '</p>')
          res.render('conText.ejs', {
            article_data: articleData
          })
        }
      }
    })
  } else {
    res.status(404).send('您请求的文章找不到').end()
  }
})

// 6. static数据
server.use(static('./www'))