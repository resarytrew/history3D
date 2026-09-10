import { readFileSync, writeFileSync } from 'node:fs'

interface Assertion { fullName: string; status: string; failureMessages: string[] }
interface Report { numPendingTests: number; testResults: { name: string; status: string; assertionResults: Assertion[] }[] }
const [baselinePath, currentPath, outputPath = 'artifacts/assembly-v2-failure-comparison.json'] = process.argv.slice(2)
if (!baselinePath || !currentPath) throw new Error('Usage: compare-test-baseline.ts baseline.json current.json [comparison.json]')
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Report
const baseline = read(baselinePath), current = read(currentPath)
const failures = (report: Report) => report.testResults.flatMap(suite => suite.assertionResults.filter(test => test.status === 'failed').map(test => ({
  suite: suite.name.replaceAll('\\', '/').split('/tests/').at(-1), name: test.fullName,
  reason: test.failureMessages.map(message => message.split('\n')[0]).join('; '),
}))).sort((a, b) => a.name.localeCompare(b.name))
const before = failures(baseline), after = failures(current)
const added = after.filter(test => !before.some(old => JSON.stringify(old) === JSON.stringify(test)))
const removed = before.filter(test => !after.some(next => JSON.stringify(next) === JSON.stringify(test)))
const incompleteSuites = current.testResults.filter(suite => suite.status === 'failed' && !suite.assertionResults.some(test => test.status === 'failed')).map(suite => suite.name)
const unchanged = !added.length && !removed.length && !incompleteSuites.length && current.numPendingTests === baseline.numPendingTests
writeFileSync(outputPath, JSON.stringify({ unchanged, added, removed, incompleteSuites, baseline: before, current: after }, null, 2) + '\n')
console.log(JSON.stringify({ unchanged, added: added.length, removed: removed.length, incompleteSuites: incompleteSuites.length }))
if (!unchanged) process.exitCode = 1
