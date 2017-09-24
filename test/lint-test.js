const lint = require('mocha-eslint')

var paths = [
  '**/*.js',
  '!node_modules/**'
]

var options = {
  // Specify style of output
  formatter: 'stylish',

  // Consider linting warnings as errors and return failure
  strict: true,

  timeout: 5000
}

lint(paths, options)
