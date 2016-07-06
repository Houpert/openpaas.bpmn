'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    browserify: {
      'frontend/js/bpmn-js/bpmn.js': ['frontend/js/bpmn-js/bpmn.src.js'],
      'frontend/js/bpmn-js/bpmnPanel.js': ['frontend/js/bpmn-js/bpmnPanel.src.js'],
      'frontend/js/bpmn-js/bpmnPanelProvider.js': ['frontend/js/bpmn-js/bpmnPanelProvider.src.js'],
      'frontend/js/bpmn-js/camunda.js': ['frontend/js/bpmn-js/camunda.src.js'],
      'frontend/js/bpmn-js/brfs.js': ['frontend/js/bpmn-js/brfs.src.js']
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        ignores: [],
        transform: [ 'brfs' ]
      },
      all: {
        src: [
          'Gruntfile.js',
          'tasks/**/*.js',
          'test/**/**/*.js',
          'backend/**/*.js',
          'frontend/js/**/*.js'
        ]
      }
    },
    jscs: {
      options: {
        config: '.jscsrc'
      },
      all: {
        src: ['<%= jshint.all.src %>']
      }
    },
    lint_pattern: {
      options: {
        rules: [
          { pattern: /(describe|it)\.only/, message: 'Must not use .only in tests' }
        ]
      },
      all: {
        src: ['<%= jshint.all.src %>']
      },
      css: {
        options: {
          rules: [
            { pattern: /important;(\s*$|(?=\s+[^\/]))/, message: 'CSS important rules only allowed with explanatory comment' }
          ]
        },
        src: [
          'frontend/css/**/*.less'
        ]
      }
    },

    mochacli: {
      options: {
        require: ['chai', 'mockery'],
        reporter: 'spec',
        timeout: process.env.TEST_TIMEOUT || 20000
      },
      backend: {
        options: {
          files: ['test/unit-backend/all.js', grunt.option('test') || 'test/unit-backend/**/*.js']
        }
      }
    },
    karma: {
      unit: {
        configFile: './test/config/karma.conf.js',
        browsers: ['PhantomJS']
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-lint-pattern');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-mocha-cli');
  grunt.loadNpmTasks('grunt-karma');

  grunt.registerTask('linters', 'Check code for lint', ['jshint:all', 'jscs:all', 'lint_pattern']);
  grunt.registerTask('test-unit-backend', 'Test backend code', ['mochacli:backend']);
  grunt.registerTask('test-unit-frontend', 'Test frontend code', ['karma:unit']);
  grunt.registerTask('test', ['linters', 'test-unit-frontend', 'test-unit-backend']);
  grunt.registerTask('default', ['test']);
  grunt.registerTask('build', ['browserify']);
};