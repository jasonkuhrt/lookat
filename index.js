#!/usr/bin/env node

var assert = require('assert')
var path = require('path')
var Promise = require('bluebird')
var fs = Promise.promisifyAll(require('fs'))
var argv = require('minimist')(process.argv.slice(2))
var Jade = require('jade')
var Hogan = require('hogan.js')
var debug = require('debug')('solo')



var componentsPath = path.join(__dirname, '..', 'lib')
var layoutsRoot = path.join(__dirname, '..', 'dev')
var outRoot = path.join(process.cwd(), '.solo')
var outView = path.join(outRoot, 'index.html')



function Solo(requestedComponents) {
  debug('Start building solo')
  assert(Array.isArray(requestedComponents), 'requestedComponents must be an array')

  var layoutFile = path.join(layoutsRoot, 'solo.jade')

  var componentsSpecs = requestedComponents.map(getComponentLogistics)
  debug('componentsSpecs: %j', componentsSpecs)

  var viewJade = toJade({ path: layoutFile, components: componentsSpecs })
  debug('jade: built')

  var viewHtml = toHtml(viewJade)
  debug('html built')
  // Gather the paths required to render this component
  // var componentRoot = path.join(componentsPath, componentName)

  writeOut({ root: outRoot, view: outView }, viewHtml)
  debug('wrote build to %s', outRoot)
}







// Helpers

function writeOut(outPaths, viewSource) {
  writeBareSoloDir(outPaths.root)
  .then(fs.writeFileAsync.bind(fs, outPaths.view, viewSource))
}

/* For a given component name, construct
a logical hash of metadata about that
component. */

function getComponentLogistics(componentName) {
  var root = path.join(componentsPath, componentName)
  return {
    name: componentName,
    // The slug is a CSS class name friendly string.
    // Usually componentName will already be slug-friendly
    // because it is targeting a folder name.
    slug: componentName.split(' ').join('-'),
    root: root,
    includePath: path.relative(layoutsRoot, path.join(root, 'docs.jade'))
  }
}

function writeBareSoloDir(path) {
  return fs.mkdirAsync(path)
  .catch(function(err) {
    if (err.cause.code === 'EEXIST') return Promise.resolve() // do nothing
    throw err
  })
}

/*
function renderSolo(config) {
  try {
    return renderLayout(createLayout(config), { filename: config.layoutPath })
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error('The component you tried to solo ("' + config.componentName + '") does not exist. Did you mistype it?')
    throw err
  }
}
*/

function toJade(config) {
  return {
    path: config.path,
    source: Hogan
            .compile(fs.readFileSync(config.path, 'utf8'))
            .render({
              components: config.components,
              title: config.components.map(function(x){ return x.name }).join(' | ')
            })
  }
}

function toHtml(view) {
  return Jade
  .compile(view.source, {
    filename: view.path,
    pretty: true
  })()
}






/* Execute Solo. This is the heart of the matter. The
rest of this file will be broken out into a library. */
console.log(argv._)
var requestedComponents = argv._
if (!requestedComponents) throw new Error('You must tell me what component(s) you wish to solo!')

Solo(requestedComponents)
