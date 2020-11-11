// VARIABLES & PATHS

let preprocessor = 'scss',
    fileswatch = 'html,htm,txt,json,md,woff2',
    imageswatch = 'jpg,jpeg,png,webp,svg',
    baseDir = 'app',
    buildDir = 'build',
    online = true

let paths = {

    plugins: {
        src: [
            // 'node_modules/jquery/dist/jquery.min.js',
        ]
    },

    userscripts: {
        src: [
            baseDir + '/js/common.js'
        ]
    },

    styles: {
        src: baseDir + '/' + preprocessor + '/**/*.*',
        dest: buildDir + '/css',
    },

    images: {
        src: baseDir + '/img/**/*',
        dest: buildDir + '/img/',
    },

    fonts: {
        src: baseDir + '/fonts/**/*',
        dest: buildDir + '/fonts/',
    },

    deploy: {
        hostname: 'username@yousite.com',
        destination: 'yousite/public_html/',
        include: [/* '*.htaccess' */],
        exclude: ['**/Thumbs.db', '**/*.DS_Store'],
    },

    cssOutputName: 'main.min.css',
    jsOutputName: 'common.min.js',

}

// LOGIC

const {src, dest, parallel, series, watch} = require('gulp')
const scss = require('gulp-sass')
const cleancss = require('gulp-clean-css')
const concat = require('gulp-concat')
const browserSync = require('browser-sync').create()
const babel = require('gulp-babel')
const uglify = require('gulp-uglify')
const autoprefixer = require('gulp-autoprefixer')
const imagemin = require('gulp-imagemin')
const newer = require('gulp-newer')
const rsync = require('gulp-rsync')
const del = require('del')

function browsersync() {
    browserSync.init({
        server: {baseDir: buildDir + '/'},
        notify: false,
        online: online
    })
}

function plugins() {
    if (paths.plugins.src.length > 0) {
        return src(paths.plugins.src)
            .pipe(concat('plugins.tmp.js'))
            .pipe(dest(buildDir + '/js/_tmp'))
    } else {
        async function createFile() {
            if (!require('fs').existsSync(buildDir + '/js/_tmp/'))
                require('fs').mkdirSync(buildDir + '/js/_tmp/', {recursive: true})
            require('fs').writeFileSync(buildDir + '/js/_tmp/plugins.tmp.js', '')
        }

        return createFile()
    }
}

function userscripts() {
    return src(paths.userscripts.src)
        .pipe(babel({presets: ['@babel/env']}))
        .pipe(concat('userscripts.tmp.js'))
        .pipe(dest(buildDir + '/js/_tmp'))
}

function scripts() {
    return src([
        buildDir + '/js/_tmp/plugins.tmp.js',
        buildDir + '/js/_tmp/userscripts.tmp.js'
    ])
        .pipe(concat(paths.jsOutputName))
        .pipe(uglify())
        .pipe(dest(buildDir + '/js'))
}

function styles() {
    return src(paths.styles.src)
        .pipe(eval(preprocessor)())
        //.pipe(concat(paths.cssOutputName))
        .pipe(autoprefixer({overrideBrowserslist: ['last 10 versions'], grid: true}))
        .pipe(cleancss({level: {1: {specialComments: 0}},/* format: 'beautify' */}))
        .pipe(dest(paths.styles.dest))
        .pipe(browserSync.stream())
}

function html() {
    return src(baseDir + '/*.html').pipe(dest(buildDir))
}

function fonts() {
    return src(paths.fonts.src).pipe(dest(paths.fonts.dest))
}


function images() {
    return src(paths.images.src)
        .pipe(newer(paths.images.dest))
        .pipe(imagemin())
        .pipe(dest(paths.images.dest))
}

function clean() {
    return del(buildDir, {force: true})
}

function deploy() {
    return src(baseDir + '/')
        .pipe(rsync({
            root: baseDir + '/',
            hostname: paths.deploy.hostname,
            destination: paths.deploy.destination,
            include: paths.deploy.include,
            exclude: paths.deploy.exclude,
            recursive: true,
            archive: true,
            silent: false,
            compress: true
        }))
}

function startwatch() {
    watch(baseDir + '/' + preprocessor + '/**/*', {usePolling: true}, styles)
    watch(baseDir + '/*.html', {usePolling: true}, html)
    watch(baseDir + '/img/**/*.{' + imageswatch + '}', {usePolling: true}, images)
    watch(baseDir + '/**/*.{' + fileswatch + '}', {usePolling: true}).on('change', browserSync.reload)
    watch([baseDir + '/js/**/*.js', '!' + baseDir + '/js/**/*.min.js', '!' + baseDir + '/js/**/*.tmp.js'], {usePolling: true}, series(plugins, userscripts, scripts)).on('change', browserSync.reload)
}

exports.browsersync = browsersync
exports.scripts = series(plugins, userscripts, scripts)
exports.build = series(clean, plugins, userscripts, scripts, images, styles, html, fonts)
exports.styles = styles
exports.images = images
exports.clean = clean
exports.deploy = deploy
exports.html = html
exports.fonts = fonts
exports.default = series(plugins, userscripts, scripts, images, styles, html, fonts, parallel(browsersync, startwatch))
