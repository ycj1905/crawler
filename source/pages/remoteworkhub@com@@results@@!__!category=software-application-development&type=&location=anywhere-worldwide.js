var nightmare = require('nightmare')

var meta = require('_meta')
var get = require('_get')

var URL = get.url(__filename)
var NAME = get.name(URL)

module.exports = execute

function execute (opts, done) {
  if (typeof done !== 'function') return
  opts = opts || { show: false }
  nightmare(opts)
  .goto(`http://${URL}`)
  .evaluate(query)
  .end()
  .run(nextPage)

  var allUrls = []

  function nextPage (error, data) { //because of .run, we need 2 arguments: err & result
    if (error) return done(error)
    allUrls = allUrls.concat(data.urls)
    console.log(`collected urls: ${allUrls.length}`)
    var next = data.next
    console.log(next)
    if (next) return nightmare(opts)
      .goto(next)
      .wait('.list_job_title a')
      .evaluate(query)
      .end()
      .run(nextPage)
    collect(error, allUrls)
  }

  function collect (error, urls) {
    if (error) return done(error)
    var DATA = []
    var total = urls.length
    if (urls.length) next(urls.pop(), callback)
    function callback (error, data) {
      if (error) return done(error)
      if (data) DATA.push(data)
      console.log(`${urls.length}/${total} - ${URL}`)
      if (urls.length) next(urls.pop(), callback)
      else {
        console.log("I'M DONE")
        done(null, { NAME, DATA })
      }
    }
  }

}

function next (url, cbFn) {
  nightmare()
  .goto(url)
  .evaluate(query)
  .end()
  .run(analyze)

  function query (){
    return {
      date: ((((document.querySelector('.devided_section')||{}).innerText||'').split('POSTED:')[1]||'').split('LOCATION')[0])||null,
      skills: [...document.querySelectorAll('.job-categories-list li')].map(x => {
        var skills = []
        skills.push(x.innerText)
        return skills
      }),
      requirements: null,
      title: ((document.querySelector('.main_title')||{}).innerText||'')||null,
      type: ((document.querySelector('.job-type')||{}).innerText||'')||null,
      payment: null,
      duration: null,
      budget: null,
      description: (document.querySelector('.job_summary')||{}).innerText||'',
      details: null,
      company: null,
      location: null,
      benefits: null
    }
  }
  function analyze (error, item) {
    if (error) return cbFn(error)
    meta({ item, raw: item.description }, cbFn)
  }
}

function query () {
  var urls = []
  var nodeList = (document.querySelectorAll('.list_job_title a'))||[]
  ;(nodeList||[]).forEach(function (x) {
    urls.push(x.href)
  })
  var array = document.querySelectorAll('.pagination a')||[]
  var next
  if (array[array.length - 2].getAttribute('rel') === 'next') {
    next = array[array.length - 2].href
  } else if (array[array.length - 1].getAttribute('rel') === 'next') {
    next = array[array.length - 1].href
  } else {
    next = {}.href
  }
  return { urls, next } // same as `{ urls:urls, next:next }`
}
