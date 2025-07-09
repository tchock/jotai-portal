import { DIST_DIR, PACKAGE_DIR, VERSION } from './constants.js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function updatePackage() {
  const packageJson = JSON.parse(
    readFileSync(resolve(PACKAGE_DIR, 'package.json'))
  )
  packageJson.version = VERSION.replace('v', '')
  // eslint-disable-next-line no-undef
  console.log('writing package with version ' + VERSION)
  return writeFileSync(
    resolve(DIST_DIR, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  )
}

function copyReadme() {
  const readmeContent = readFileSync(resolve(PACKAGE_DIR, 'README.md'), 'utf-8')
  writeFileSync(resolve(DIST_DIR, 'README.md'), readmeContent)
}

updatePackage()
copyReadme()
