const Report = require('../lib/report')
const utils = require('../lib/utils')
const uniq = require('lodash').uniq

// Datasets
const repos = require('repos-using-electron').filter(repo => !repo.fork && !repo.formerFork)
const electronNpmPackages = require('electron-npm-packages')
const topDeps = utils.getTopDependencies(repos).slice(0, Report.MAX_RESULTS)
const topDevDeps = utils.getTopDevDependencies(repos).slice(0, Report.MAX_RESULTS)
const allPackageRepos = require('all-the-package-repos')
const allPackageRepoUrls = Object.keys(allPackageRepos).map(name => allPackageRepos[name])

// Collect package metadata from the npm registry
const registry = require('all-the-packages')
const Package = require('nice-package')
const allPackageNames = uniq(topDeps.map(d => d.name).concat(topDevDeps.map(d => d.name)))
const registryData = {}

registry
  .on('package', function (pkg) {
    process.stdout.write('.')
    if (pkg && pkg.name && allPackageNames.includes(pkg.name)) {
      console.log(pkg.name)
      registryData[pkg.name] = new Package(pkg)
    }
  })
  .on('end', finish)

function finish () {
  // Add registry metadata to package lists
  topDeps.forEach(pkg => Object.assign(pkg, registryData[pkg.name]))
  topDevDeps.forEach(pkg => Object.assign(pkg, registryData[pkg.name]))

  new Report({
    slug: 'dependencies',
    title: 'App Dependencies',
    description: 'Packages most often listed as `dependencies` in Electron apps.',
    collectionType: 'Package',
    collection: topDeps
  }).save()

  new Report({
    slug: 'dev_dependencies',
    title: 'App Development Dependencies',
    description: 'Packages most often listed as `devDependencies` in Electron apps.',
    collectionType: 'Package',
    collection: topDevDeps
  }).save()

  new Report({
    slug: 'github_contributors',
    title: 'GitHub Contributors',
    description: 'GitHub users who have contributed to numerous Electron-related GitHub repositories.',
    collectionType: 'GithubUser',
    collection: utils.getTopContributors(repos)
  }).save()

  new Report({
    slug: 'package_dependencies',
    title: 'Package Dependencies',
    description: 'Electron-related npm packages that are frequently depended on by other npm packages.',
    collectionType: 'Package',
    collection: electronNpmPackages.sort((a, b) => b.totalDeps - a.totalDeps)
  }).save()

  new Report({
    slug: 'most_downloaded_packages',
    title: 'Most Downloaded Packages',
    description: 'Electron-related npm packages that are downloaded a lot.',
    collectionType: 'Package',
    collection: electronNpmPackages.sort((a, b) => b.downloadsInLastMonth - a.downloadsInLastMonth)
  }).save()

  new Report({
    slug: 'package_authors',
    title: 'Package Authors',
    description: 'The most prolific authors of Electron-related npm packages.',
    collectionType: 'npmUser',
    collection: utils.getTopPackageAuthors(electronNpmPackages)
  }).save()

  new Report({
    slug: 'starred_apps',
    title: 'Starred Apps',
    description: 'Electron apps (that are not npm packages) with numerous stargazers.',
    collectionType: 'Repository',
    collection: repos
      .filter(repo => !allPackageRepoUrls.includes(repo.htmlUrl))
      .sort((a, b) => b.stargazersCount - a.stargazersCount)
  }).save()

  // TODO: 'Popular Low-level Development Dependencies'
  // TODO: 'Popular New Packages'
  // TODO: 'Popular New Apps'
  // TODO: 'Apps with Many Contributors'
}
