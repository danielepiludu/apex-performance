"""Costruisce l'app pubblicabile nella cartella docs/ (alla radice del repository).
   docs/index.html + config.js + firebase.js + service worker + icone."""
import os, shutil, hashlib
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, 'src')
out = os.path.join(os.path.dirname(here), 'docs')
JS = ['util.js', 'progress.js', 'quick.js', 'program.js', 'images.js', 'cloud.js', 'app.js', 'programs.js', 'workout.js', 'print.js', 'history.js', 'demo.js']
rd = lambda p: open(p, encoding='utf-8').read()
t = rd(os.path.join(src, 'shell.html'))
t = t.replace('/*__CSS__*/', rd(os.path.join(src, 'style.css')))
t = t.replace('/*__JS__*/', '\n'.join(rd(os.path.join(src, f)) for f in JS))
os.makedirs(os.path.join(out, 'icons'), exist_ok=True)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(t)
for f in ['config.js', 'manifest.webmanifest']:
    shutil.copy(os.path.join(here, f), os.path.join(out, f))
shutil.copy(os.path.join(here, 'vendor', 'firebase.js'), os.path.join(out, 'firebase.js'))
for f in os.listdir(os.path.join(here, 'icons')):
    shutil.copy(os.path.join(here, 'icons', f), os.path.join(out, 'icons', f))
h = hashlib.sha1()
for f in ['index.html', 'config.js', 'firebase.js', 'manifest.webmanifest']:
    h.update(open(os.path.join(out, f), 'rb').read())
open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8').write(rd(os.path.join(here, 'sw.js')).replace('__VERSION__', h.hexdigest()[:10]))
open(os.path.join(out, '.nojekyll'), 'w').close()
print('docs/ pronta:', len(t), 'byte, versione', h.hexdigest()[:10])
