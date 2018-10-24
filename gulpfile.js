'use strict';
const path = require('path');
const del = require('del'); // 删除
const gulp = require('gulp');
const notify = require('gulp-notify'); //显示报错信息和报错后不终止当前gulp任务
const plumber = require('gulp-plumber'); //捕获处理任务中的错误

// less相关
const less = require('gulp-less'); // less编译
const LessFunctions = require('less-plugin-functions'); //less函数
const lessFunc = new LessFunctions();
const lessImport = require('@jlgl/gulp-less-import');
const autoprefixer = require('gulp-autoprefixer');
const cssStatic = require('@jlgl/gulp-css-static');

// babel
const babel = require('gulp-babel');

// hash相关
const RevAll = require('gulp-rev-all');

// 压缩
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');

// 自有插件
const GulpMap = require('@jlgl/gulp-map'); // map索引
const sourcemaps = require('gulp-sourcemaps'); // sourcemaps
const component = require('@jlgl/gulp-component'); // 组件资源自动加载重组
const seajs = require('@jlgl/gulp-seajs'); // 编译为seajs文件

const pkg = require('./package.json');

const sourcePaths = {
    'clean': ['./app/public/static/'],
    'less': ['./app/build/src/**/*.less', '!./app/build/src/**/_*.less'],
    'js': './app/build/src/**/*.js',
    'view': './app/build/src/**/*.html',
    'other': './app/build/src/**/*.{png,gif,jpg,ttf,eot,svg,woff,swf,ico}',
    'config': './app/build/src/config/*.json',
    'cache': './app/build/cache/**',
    'lib': './app/build/lib/**'
};
const distPaths = {
    'cache': './app/build/cache/',
    'view': './app/public/views/',
    'config': './app/public/config/',
    'all': './app/public/static/' + pkg.name,
    'lib': './app/build/cache/lib/'
};

const domain = '' + '/' + pkg.name;

// 创建map实例
const map = new GulpMap({
    uri: domain,
    namespace: pkg.name
});

// 清除缓存文件
del.sync(sourcePaths.clean);

// 所有相关文件放入缓存文件夹
gulp.task('cache', function() {
    return gulp.src(sourcePaths.other)
        .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))
        .pipe(gulp.dest(distPaths.cache));
});

// 编译less文件
gulp.task('compileCssWithSource', function() {
    return gulp.src(sourcePaths.less)
        .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))
        .pipe(lessImport({
            path: path.join(__dirname, './app/build/src/common/css/_mix.less')
        }))
        .pipe(map.savePath({
            replace: 'less',
            to: 'css'
        }))
        .pipe(sourcemaps.init())
        .pipe(less({
            plugins: [lessFunc]
        }))
        .pipe(sourcemaps.write())
        .pipe(autoprefixer({
            browsers: ['> 1%', 'last 3 Explorer versions', 'Firefox >= 20'],
        }))
        .pipe(gulp.dest(distPaths.cache));
});

gulp.task('compileCssWithoutSource', function() {
    return gulp.src(sourcePaths.less)
        .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))
        .pipe(lessImport({
            path: path.join(__dirname, './app/build/src/common/css/_mix.less')
        }))
        .pipe(map.savePath({
            replace: 'less',
            to: 'css'
        }))
        .pipe(less({
            plugins: [lessFunc]
        }))
        .pipe(cleanCSS({
            rebase: false
        }))
        .pipe(autoprefixer({
            browsers: ['> 1%', 'last 3 Explorer versions', 'Firefox >= 20']
        }))
        .pipe(gulp.dest(distPaths.cache));
});

// 编译js文件
gulp.task('compileScriptWithSource', function() {
    return gulp.src(sourcePaths.js)
        .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))
        .pipe(seajs({
            namespace: pkg.name
        }))
        .pipe(RevAll.revision({
            dontUpdateReference: ['.js']
        }))
        .pipe(map.savePath({
            hash: true
        }))
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: [['env', {modules: false}]]
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(distPaths.all));
});

gulp.task('compileScriptWithoutSource', function() {
    return gulp.src(sourcePaths.js)
        .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))
        .pipe(seajs({
            namespace: pkg.name
        }))
        .pipe(RevAll.revision({
            dontUpdateReference: ['.js']
        }))
        .pipe(map.savePath({
            hash: true
        }))
        .pipe(babel({
            presets: [['env', {modules: false, loose: true}]]
        }))
        .pipe(uglify())
        .pipe(gulp.dest(distPaths.all));
});

// 编译模板文件
gulp.task('compileView', function() {
    return gulp.src(sourcePaths.view)
        .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))
        .pipe(component({
            cssSuffix: '.less',
            namespace: pkg.name
        }))
        .pipe(gulp.dest(distPaths.view));
});

// 迁移配置文件
gulp.task('config', function() {
    // config索引文件
    return gulp.src(sourcePaths.config)
        .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))
        .pipe(gulp.dest(distPaths.config));
});

// 迁移lib文件
gulp.task('lib', function() {
    // config索引文件
    return gulp.src(sourcePaths.lib)
        .pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))
        .pipe(gulp.dest(distPaths.lib));
});

// 迁移项目自身eslint配置文件
// gulp.task('copyEslint', () => {
//     return gulp.src('./app/build/.eslintrc.js')
//         .pipe(gulp.dest(distPaths.all));
// });

// 文件预处理
gulp.task('preCompileWithSource', ['compileView', 'cache', 'compileCssWithSource', 'compileScriptWithSource', 'config', 'lib']);
gulp.task('preCompileWithoutSource', ['compileView', 'cache', 'compileCssWithoutSource', 'compileScriptWithoutSource', 'config', 'lib']);

// 构建缓存文件夹数据
function buildCache() {
    // 迁移缓存文件
    gulp.src(sourcePaths.cache)
        .pipe(RevAll.revision())
        .pipe(map.savePath({
            hash: true
        }))
        .pipe(cssStatic({
            domain: domain
        }))
        .pipe(gulp.dest(distPaths.all))
        .on('finish', function() {
            map.buildMap(distPaths.config, {
                name: pkg.name + '-map.json'
            });
        });
}
// 清除缓存文件
del.sync(distPaths.cache);
del.sync(sourcePaths.clean);
// 构建任务
gulp.task('dev', ['preCompileWithSource'], buildCache); //开发环境任务
gulp.task('build', ['preCompileWithoutSource'], buildCache); //测试环境任务
gulp.task('watch', ['dev'], function() {
    const watcher = gulp.watch(['app/build/lib/**', 'app/build/src/**'], ['dev']);

    watcher.on('change', function(event) {
        global.console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
    });
});